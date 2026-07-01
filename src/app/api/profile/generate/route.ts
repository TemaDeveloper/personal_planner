import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import SectionTemplate from "@/lib/models/section-template";
import FacetVocab from "@/lib/models/facet-vocab";
import User from "@/lib/models/user";
import { SECTIONS } from "@/lib/constants";
import { getProfile } from "@/lib/profile/profile-store";
import { generateSectionsFromFacets, pickSourceFacetKey } from "@/lib/profile/generate-sections";
import { buildTemplateDoc, slugify } from "@/lib/profile/persist-sections";
import { resolveAIConfig } from "@/lib/profile/ai-config";
import { normalizeDimension } from "@/lib/profile/merge";

/**
 * Generate a bespoke planner from the user's stored life profile: create one
 * SectionTemplate per generated section, enable them for the user, and record
 * the facet dimensions into the growing vocabulary (learn-back).
 *
 * POST { provider?, apiKey? }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ai = resolveAIConfig(body ?? {});
  if (!ai) return NextResponse.json({ error: "No AI provider configured" }, { status: 400 });

  const profile = await getProfile(userId);
  if (!profile || profile.facets.length === 0) {
    return NextResponse.json({ error: "No profile to generate from" }, { status: 400 });
  }

  try {
    let sections = await generateSectionsFromFacets(profile.facets, ai.provider, ai.apiKey);
    // One retry if the model returned nothing usable.
    if (sections.length === 0) {
      sections = await generateSectionsFromFacets(profile.facets, ai.provider, ai.apiKey);
    }
    if (sections.length === 0) {
      return NextResponse.json(
        { error: "The AI couldn't design your planner this time. Please try again." },
        { status: 502 }
      );
    }

    await connectDB();
    const created = [];
    for (const section of sections) {
      // Unique slug, avoiding collisions with built-ins and existing templates.
      let base = slugify(section.name);
      if (!base) base = "section";
      if ((SECTIONS as readonly string[]).includes(base)) base = `${base}-custom`;
      let slug = base;
      let counter = 0;
      while (await SectionTemplate.findOne({ slug })) {
        counter++;
        slug = `${base}-${counter}`;
      }

      const facetKey = pickSourceFacetKey(section.sourceDimension, profile.facets);
      const template = await SectionTemplate.create(
        buildTemplateDoc(section, userId, slug, {
          dimension: section.sourceDimension,
          facetKey,
        })
      );
      await User.findByIdAndUpdate(userId, {
        $push: { customSections: { templateId: template._id, enabled: true } },
      });
      created.push({ _id: template._id, name: template.name, slug: template.slug });
    }

    // Learn-back: record each facet dimension into the vocabulary.
    for (const facet of profile.facets) {
      const dimension = normalizeDimension(facet.dimension);
      await FacetVocab.findOneAndUpdate(
        { dimension },
        { $inc: { count: 1 }, $addToSet: { examples: facet.value } },
        { upsert: true }
      );
    }

    return NextResponse.json({ sections: created }, { status: 201 });
  } catch (err) {
    console.error("[profile/generate] failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}

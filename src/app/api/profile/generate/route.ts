import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import SectionTemplate from "@/lib/models/section-template";
import CustomEntry from "@/lib/models/custom-entry";
import FacetVocab from "@/lib/models/facet-vocab";
import User from "@/lib/models/user";
import { SECTIONS } from "@/lib/constants";
import { getProfile } from "@/lib/profile/profile-store";
import { generateSectionsFromFacets, pickSourceFacetKey } from "@/lib/profile/generate-sections";
import { buildTemplateDoc, slugify } from "@/lib/profile/persist-sections";
import { resolveAIConfig } from "@/lib/profile/ai-config";
import { normalizeDimension } from "@/lib/profile/merge";

// AI planner generation can take a while — give the function room so Vercel
// doesn't abort the model call (the default timeout was too short).
export const maxDuration = 60;

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

  await connectDB();

  // Idempotency guard: if onboarding already completed, a retry (e.g. after a
  // late client error) must NOT append a second planner on top of the first.
  const user = await User.findById(userId).select("onboardingDone customSections").lean();
  if (user?.onboardingDone) {
    return NextResponse.json(
      { sections: [], alreadyOnboarded: true, sectionCount: user.customSections?.length ?? 0 },
      { status: 200 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const ai = await resolveAIConfig(body ?? {}, userId);
  if (!ai) return NextResponse.json({ error: "No AI provider configured" }, { status: 400 });

  const profile = await getProfile(userId);
  if (!profile || profile.facets.length === 0) {
    return NextResponse.json({ error: "No profile to generate from" }, { status: 400 });
  }

  try {
    // Clean up orphans from a previous partially-failed run: templates we
    // created that never got linked to the user and hold no entries. This frees
    // their slugs and keeps retries from accumulating invisible duplicates.
    const referenced = new Set(
      (user?.customSections ?? []).map((cs) => String(cs.templateId))
    );
    const candidates = await SectionTemplate.find({ createdBy: userId, isBuiltIn: false })
      .select("_id")
      .lean();
    const orphanIds = [];
    for (const candidate of candidates) {
      if (referenced.has(String(candidate._id))) continue;
      const entryCount = await CustomEntry.countDocuments({ templateId: candidate._id });
      if (entryCount === 0) orphanIds.push(candidate._id);
    }
    if (orphanIds.length > 0) {
      await SectionTemplate.deleteMany({ _id: { $in: orphanIds } });
    }

    const sections = await generateSectionsFromFacets(profile.facets, ai.provider, ai.apiKey);
    if (sections.length === 0) {
      return NextResponse.json(
        { error: "The AI couldn't design your planner this time. Please try again." },
        { status: 502 }
      );
    }

    // Create all templates first, then link + complete onboarding in a single
    // user update so a mid-loop failure can't leave a half-enabled planner.
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
      created.push({ _id: template._id, name: template.name, slug: template.slug });
    }

    // Enable all sections AND mark onboarding complete atomically, server-side,
    // so a failed client PATCH can't bounce the user back into onboarding.
    await User.updateOne(
      { _id: userId },
      {
        $push: {
          customSections: {
            $each: created.map((t) => ({ templateId: t._id, enabled: true })),
          },
        },
        $set: { onboardingDone: true },
      }
    );

    // Learn-back: record each facet dimension into the vocabulary. Non-fatal —
    // the planner is already built; a vocab hiccup must not fail the request.
    try {
      for (const facet of profile.facets) {
        const dimension = normalizeDimension(facet.dimension);
        await FacetVocab.findOneAndUpdate(
          { dimension },
          {
            $inc: { count: 1 },
            // Bounded to the most recent 25 examples (was unbounded $addToSet).
            $push: { examples: { $each: [facet.value], $slice: -25 } },
          },
          { upsert: true }
        );
      }
    } catch (err) {
      console.error("[profile/generate] learn-back failed (non-fatal)", err);
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

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

  const body = await req.json().catch(() => ({}));
  const ai = resolveAIConfig(body ?? {});
  if (!ai) return NextResponse.json({ error: "No AI provider configured" }, { status: 400 });

  await connectDB();

  // Atomic idempotency guard: claim generation atomically so concurrent requests
  // cannot both pass. Only proceeds when modifiedCount === 1 (we won the race).
  // Uses generationPending to distinguish "done" from "claimed but failed", so a
  // retry after a mid-flight crash can still proceed.
  const claim = await User.updateOne(
    { _id: userId, onboardingDone: { $ne: true }, generationPending: { $ne: true } },
    { $set: { generationPending: true } }
  );
  if (claim.modifiedCount === 0) {
    // Either already done or another request is in flight right now.
    const user = await User.findById(userId).select("onboardingDone generationPending").lean();
    if (user?.onboardingDone) {
      return NextResponse.json({ error: "Planner already generated" }, { status: 409 });
    }
    // Another request is in progress — tell the client to retry shortly.
    return NextResponse.json({ error: "Generation already in progress" }, { status: 409 });
  }

  const profile = await getProfile(userId);
  if (!profile || profile.facets.length === 0) {
    // Release the claim so the user can retry after fixing their profile.
    await User.updateOne({ _id: userId }, { $unset: { generationPending: "" } });
    return NextResponse.json({ error: "No profile to generate from" }, { status: 400 });
  }

  try {
    const sections = await generateSectionsFromFacets(profile.facets, ai.provider, ai.apiKey);
    if (sections.length === 0) {
      return NextResponse.json(
        { error: "The AI couldn't design your planner this time. Please try again." },
        { status: 502 }
      );
    }

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

    // Mark onboarding complete and release the in-progress lock atomically.
    await User.updateOne(
      { _id: userId },
      { $set: { onboardingDone: true }, $unset: { generationPending: "" } }
    );

    // Learn-back: record each facet dimension into the vocabulary.
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

    return NextResponse.json({ sections: created }, { status: 201 });
  } catch (err) {
    console.error("[profile/generate] failed", err);
    // Release the lock so the user can retry after a failure.
    await User.updateOne({ _id: userId }, { $unset: { generationPending: "" } }).catch(() => {});
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 }
    );
  }
}

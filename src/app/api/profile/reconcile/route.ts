import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import SectionTemplate from "@/lib/models/section-template";
import CustomEntry from "@/lib/models/custom-entry";
import { getProfile } from "@/lib/profile/profile-store";
import { planReconciliation, type SectionRef } from "@/lib/profile/reconcile";

/**
 * Propose how the planner should change now that the living profile has changed:
 * which sections to add, which to remove (data-bearing removals flagged for
 * confirmation), which to keep. Read-only — applying is a separate, explicit step.
 */
export async function POST() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getProfile(userId);
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 400 });

  await connectDB();
  const user = await User.findById(userId).select("customSections").lean();
  const enabled = (user?.customSections ?? []).filter((c) => c.enabled);
  const templateIds = enabled.map((c) => c.templateId);
  const templates = await SectionTemplate.find({ _id: { $in: templateIds } })
    .select("slug sourceFacetKey")
    .lean();

  const refs: SectionRef[] = [];
  for (const t of templates) {
    const count = await CustomEntry.countDocuments({ userId, templateId: t._id });
    refs.push({
      slug: t.slug,
      sourceFacetKey: t.sourceFacetKey,
      hasData: count > 0,
    });
  }

  const plan = planReconciliation(profile.facets, refs);
  return NextResponse.json({ plan });
}

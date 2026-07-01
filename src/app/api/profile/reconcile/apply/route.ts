import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import SectionTemplate from "@/lib/models/section-template";
import CustomEntry from "@/lib/models/custom-entry";
import { getProfile } from "@/lib/profile/profile-store";
import { planReconciliation, type SectionRef } from "@/lib/profile/reconcile";

/**
 * Apply a reconciliation removal by DISABLING the section (reversible), never
 * deleting entries. Data-bearing removals are only applied when `confirmed`.
 * The plan is recomputed server-side so the client cannot bypass the guard.
 *
 * POST { removeSlugs: string[], confirmed?: boolean }
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const removeSlugs: string[] = Array.isArray(body?.removeSlugs) ? body.removeSlugs : [];
  const confirmed = Boolean(body?.confirmed);

  const profile = await getProfile(userId);
  if (!profile) return NextResponse.json({ error: "No profile" }, { status: 400 });

  await connectDB();
  const user = await User.findById(userId).select("customSections").lean();
  const enabled = (user?.customSections ?? []).filter((c) => c.enabled);
  const templates = await SectionTemplate.find({ _id: { $in: enabled.map((c) => c.templateId) } })
    .select("slug sourceFacetKey")
    .lean();

  const refs: SectionRef[] = [];
  const templateBySlug = new Map<string, (typeof templates)[number]>();
  for (const t of templates) {
    const count = await CustomEntry.countDocuments({ userId, templateId: t._id });
    refs.push({ slug: t.slug, sourceFacetKey: t.sourceFacetKey, hasData: count > 0 });
    templateBySlug.set(t.slug, t);
  }

  const plan = planReconciliation(profile.facets, refs);
  const allowed = new Map(plan.remove.map((r) => [r.slug, r]));

  const disabled: string[] = [];
  const blocked: string[] = [];
  for (const slug of removeSlugs) {
    const entry = allowed.get(slug);
    const template = templateBySlug.get(slug);
    if (!entry || !template) continue; // not a valid removal per the fresh plan
    if (entry.requiresConfirm && !confirmed) {
      blocked.push(slug);
      continue;
    }
    await User.updateOne(
      { _id: userId, "customSections.templateId": template._id },
      { $set: { "customSections.$.enabled": false } }
    );
    disabled.push(slug);
  }

  return NextResponse.json({ disabled, blocked });
}

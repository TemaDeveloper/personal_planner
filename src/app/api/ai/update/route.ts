import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import { aiUpdateRequestSchema } from "@/lib/validations";
import { resolveSectionKind, validateExtraFields } from "@/lib/section-update";
import {
  generateBuiltinFieldUpdate,
  generateDashboardMetricUpdate,
  generateCustomSectionUpdate,
  type RegistryEntry,
} from "@/lib/ai-section-update";
import { registryForSections } from "@/lib/dashboard-metric-registry";
import { SECTION_META, type SectionId } from "@/lib/constants";
import SectionCustomization from "@/lib/models/section-customization";
import DashboardMetric from "@/lib/models/dashboard-metric";
import SectionTemplate from "@/lib/models/section-template";
import User from "@/lib/models/user";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = aiUpdateRequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { sectionKey, prompt } = parsed.data;

  let resolved;
  try {
    resolved = resolveSectionKind(sectionKey);
  } catch {
    return NextResponse.json({ error: `Unknown section: ${sectionKey}` }, { status: 400 });
  }

  await connectDB();

  try {
    if (resolved.kind === "builtin") {
      const existing = await SectionCustomization.findOne({ userId, sectionKey: resolved.sectionKey }).lean();
      const label = SECTION_META[resolved.sectionKey as SectionId]?.label ?? resolved.sectionKey;
      const update = await generateBuiltinFieldUpdate(label, existing?.extraFields ?? [], prompt);
      const fields = validateExtraFields(update.extraFields);
      const saved = await SectionCustomization.findOneAndUpdate(
        { userId, sectionKey: resolved.sectionKey },
        { $set: { extraFields: fields, sourcePrompt: prompt } },
        { upsert: true, new: true }
      ).lean();
      return NextResponse.json({ kind: "builtin", customization: saved });
    }

    if (resolved.kind === "dashboard") {
      const user = await User.findById(userId).select("enabledSections").lean();
      const enabled = (user?.enabledSections as string[] | undefined) ?? [];
      const registry: RegistryEntry[] = registryForSections(enabled).map((m) => ({ key: m.key, label: m.label, sectionKey: m.sectionKey, fieldKey: m.fieldKey, aggregation: m.aggregation, period: m.period }));
      const current = await DashboardMetric.find({ userId }).sort({ order: 1 }).lean();
      const update = await generateDashboardMetricUpdate(registry, current, prompt);

      // Fix 1: enforce registry membership (server-side)
      const allowed = new Set<string>();
      for (const m of registryForSections(enabled)) {
        allowed.add(`${m.sectionKey}|${m.fieldKey}`);
      }
      const customizations = await SectionCustomization.find({ userId }).lean();
      for (const doc of customizations) {
        for (const field of (doc.extraFields ?? [])) {
          allowed.add(`${doc.sectionKey}|${field.key}`);
        }
      }
      const invalid = update.metrics.filter((m) => !allowed.has(`${m.sectionKey}|${m.fieldKey}`));
      if (invalid.length) {
        return NextResponse.json(
          { error: `No matching metric for: ${invalid.map((m) => m.label).join(", ")}. Add that field to the section first.` },
          { status: 422 }
        );
      }

      // Fix 2: insert before delete to avoid data-loss window
      const docs = update.metrics.map((m, i) => ({ ...m, userId, order: i }));
      const saved = docs.length ? await DashboardMetric.insertMany(docs) : [];
      if (current.length) {
        await DashboardMetric.deleteMany({ _id: { $in: current.map((c) => c._id) } });
      }
      return NextResponse.json({ kind: "dashboard", metrics: saved });
    }

    // custom section
    const template = await SectionTemplate.findOne({ slug: resolved.slug, createdBy: userId });
    if (!template) return NextResponse.json({ error: "Section not found" }, { status: 404 });
    const cs = await generateCustomSectionUpdate(
      { name: template.name, icon: template.icon, description: template.description, viewType: template.viewType, fields: template.fields, layoutHtml: template.layoutHtml },
      prompt
    );
    template.set({ name: cs.name, icon: cs.icon, description: cs.description, viewType: cs.viewType, fields: cs.fields, layoutHtml: cs.layoutHtml, sourcePrompt: prompt });
    await template.save();
    return NextResponse.json({ kind: "custom", template });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI update failed";
    console.error("[ai/update] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

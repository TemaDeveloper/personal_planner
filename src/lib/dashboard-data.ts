// src/lib/dashboard-data.ts
//
// Shared read helpers that bridge the dashboard to the unified CustomEntry
// store (the same data the /sections/<slug> pages write). Built-in sections
// are seeded SectionTemplates whose slug equals the SectionId; a user's rows
// live in CustomEntry keyed by that template's _id.
//
// Every helper falls back to null (not throw) when a template hasn't been
// seeded yet, so callers can degrade to the legacy collections for
// pre-migration data.

import CustomEntry from "@/lib/models/custom-entry";
import SectionTemplate from "@/lib/models/section-template";

export type BuiltinEntry = { date: Date; data?: Record<string, unknown> };

/** Coerce an entry.data field to a finite number (0 otherwise). */
export function num(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

/**
 * Rows for a built-in section by template slug, optionally within a date range.
 * Returns null when the seed template doesn't exist so callers can fall back to
 * the legacy collection for that section.
 */
export async function builtinSectionEntries(
  userId: string,
  slug: string,
  range?: [Date, Date]
): Promise<BuiltinEntry[] | null> {
  const template = await SectionTemplate.findOne({ slug }).select("_id").lean();
  if (!template) return null;
  const query: Record<string, unknown> = { userId, templateId: template._id };
  if (range) query.date = { $gte: range[0], $lte: range[1] };
  return CustomEntry.find(query).select("date data").lean() as Promise<BuiltinEntry[]>;
}

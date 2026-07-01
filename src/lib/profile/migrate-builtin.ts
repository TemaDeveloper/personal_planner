import type { SectionId } from "@/lib/constants";
import { SEED_SPECS } from "@/lib/profile/seed-templates";

export interface LegacyDoc {
  date?: Date | string;
  [k: string]: unknown;
}

export interface MappedEntry {
  date: string;
  data: Record<string, unknown>;
}

/** Legacy model field → seed template field key, where they differ. */
const RENAMES: Partial<Record<SectionId, Record<string, string>>> = {
  work: { jobName: "job" },
  reading: { pagesRead: "pages_read", totalPages: "total_pages" },
  health: { sleepHours: "sleep_hours" },
};

const SKIP = new Set(["_id", "userId", "__v", "createdAt", "updatedAt", "date", "order"]);

/**
 * Pure transform from a legacy built-in document into a CustomEntry shape,
 * keeping only keys the seed template actually declares (renaming where needed).
 * The live DB migration that calls this is a guarded, opt-in step — not run
 * automatically — because rewriting real user data is destructive.
 */
export function migrateBuiltinEntry(sectionKey: SectionId, legacy: LegacyDoc): MappedEntry {
  const spec = SEED_SPECS[sectionKey];
  const rename = RENAMES[sectionKey] ?? {};
  const validKeys = new Set(spec.fields.map((f) => f.key));

  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(legacy)) {
    if (SKIP.has(k)) continue;
    const key = rename[k] ?? k;
    if (validKeys.has(key)) data[key] = v;
  }

  const date = legacy.date ? new Date(legacy.date).toISOString() : new Date().toISOString();
  return { date, data };
}

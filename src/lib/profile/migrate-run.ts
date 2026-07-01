import type { SectionId } from "@/lib/constants";
import { migrateBuiltinEntry, type LegacyDoc } from "@/lib/profile/migrate-builtin";

/**
 * Migration kernel (pure). Turns legacy built-in docs into CustomEntry inserts,
 * stamping each with an idempotency marker so re-runs never duplicate rows.
 *
 * NOTE: this is the additive, non-destructive kernel. The live per-model runner
 * that feeds it (reading each legacy collection's real field names) and the
 * supervised production run are intentionally NOT wired here — they require the
 * exact legacy schemas and a dry-run against a copy, not a blind prod migration.
 */
export const MIGRATION_MARKER = "__src";

export interface MigrationInsert {
  templateId: string;
  date: string;
  data: Record<string, unknown>;
}

export function migrationMarker(sectionId: SectionId, legacyId: string): string {
  return `${sectionId}:${legacyId}`;
}

export function buildMigrationInserts(
  sectionId: SectionId,
  templateId: string,
  legacyDocs: (LegacyDoc & { _id?: unknown })[],
  seenMarkers: Set<string>
): MigrationInsert[] {
  const inserts: MigrationInsert[] = [];
  for (const doc of legacyDocs) {
    const legacyId = String(doc._id ?? "");
    const marker = migrationMarker(sectionId, legacyId);
    if (legacyId && seenMarkers.has(marker)) continue; // idempotent — already migrated
    const mapped = migrateBuiltinEntry(sectionId, doc);
    inserts.push({
      templateId,
      date: mapped.date,
      data: { ...mapped.data, [MIGRATION_MARKER]: marker },
    });
  }
  return inserts;
}

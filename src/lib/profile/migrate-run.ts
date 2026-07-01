import type { OutRow } from "@/lib/profile/migrate-sources";

/**
 * Migration kernel (pure). Turns transformed OutRows into CustomEntry inserts,
 * stamping each with an idempotency marker so re-runs never duplicate rows.
 * Additive + non-destructive — legacy collections are left intact.
 */
export const MIGRATION_MARKER = "__src";

export interface MigrationInsert {
  templateId: string;
  date: string;
  data: Record<string, unknown>;
}

export function migrationMarker(sectionId: string, srcKey: string): string {
  return `${sectionId}:${srcKey}`;
}

export function buildMigrationInserts(
  sectionId: string,
  templateId: string,
  rows: OutRow[],
  seenMarkers: Set<string>
): MigrationInsert[] {
  const inserts: MigrationInsert[] = [];
  for (const row of rows) {
    if (!row.srcKey) continue;
    const marker = migrationMarker(sectionId, row.srcKey);
    if (seenMarkers.has(marker)) continue; // already migrated
    inserts.push({
      templateId,
      date: row.date,
      data: { ...row.data, [MIGRATION_MARKER]: marker },
    });
  }
  return inserts;
}

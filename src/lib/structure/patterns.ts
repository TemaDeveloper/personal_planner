/**
 * Structural patterns the corpus proved we need but that no fixed section
 * schema expresses: alternating A/B schedules (custody weeks, shift rotations)
 * and per-entity repetition (per-child, per-client, per-pet).
 * All deterministic and unit-testable.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from a to b (floored; negative if b precedes a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / DAY_MS);
}

/** Positive modulo so alternation works for dates before the anchor. */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * Which side of an alternating schedule `current` falls on.
 * Default period is one week (custody weeks). `labels` names the two slots.
 */
export function alternatingSlot(
  start: Date,
  current: Date,
  opts: { periodDays?: number; labels?: [string, string] } = {}
): string {
  const periodDays = opts.periodDays ?? 7;
  const labels = opts.labels ?? ["A", "B"];
  const period = periodDays > 0 ? periodDays : 7;
  const index = Math.floor(daysBetween(start, current) / period);
  return labels[mod(index, 2)];
}

/**
 * Generalised rotation over N slots (e.g. day/night/off shift patterns).
 * `lengthDays` is how long each slot lasts before advancing.
 */
export function rotationSlot(
  start: Date,
  current: Date,
  slots: string[],
  lengthDays = 1
): string | null {
  if (slots.length === 0) return null;
  const len = lengthDays > 0 ? lengthDays : 1;
  const index = Math.floor(daysBetween(start, current) / len);
  return slots[mod(index, slots.length)];
}

export interface FieldTemplate {
  key: string;
  label: string;
  type: string;
}

export interface ExpandedField extends FieldTemplate {
  entity: string;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
}

/**
 * Repeat a set of field templates once per entity — the "per-child" pattern.
 * ["Ava","Ben"] × {key:"pickup"} → ava_pickup, ben_pickup with scoped labels.
 */
export function expandPerEntity(
  entities: string[],
  fields: FieldTemplate[]
): ExpandedField[] {
  const out: ExpandedField[] = [];
  for (const entity of entities) {
    for (const f of fields) {
      out.push({
        entity,
        key: `${slug(entity)}_${f.key}`,
        label: `${entity} — ${f.label}`,
        type: f.type,
      });
    }
  }
  return out;
}

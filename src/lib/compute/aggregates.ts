/**
 * Section-level computations that span MANY entries (unlike the per-row
 * derivations in primitives.ts). These read one field across an entry list.
 */

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface StreakResult {
  current: number;
  longest: number;
}

/** Robust truthiness for logged flags — "false"/"0"/"no"/"" are NOT done. */
export function isDone(v: unknown): boolean {
  if (v === true) return true;
  if (v === false || v == null) return false;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    return s !== "" && s !== "false" && s !== "0" && s !== "no" && s !== "off";
  }
  return Boolean(v);
}

/**
 * Consecutive-CALENDAR-DAY streak from a list of ISO date strings (one per
 * logged day). Unlike streak(), gaps between dates break the run — the correct
 * semantics for attendance logs that only store days that happened.
 */
export function dayStreak(isoDates: string[]): StreakResult {
  const days = [...new Set(isoDates.map((d) => String(d).slice(0, 10)))]
    .filter((d) => !Number.isNaN(Date.parse(d)))
    .sort();
  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = Date.parse(days[i]) - Date.parse(days[i - 1]);
    run = gap === DAY_MS ? run + 1 : 1;
    if (run > longest) longest = run;
  }
  let current = 1;
  for (let i = days.length - 1; i > 0; i--) {
    if (Date.parse(days[i]) - Date.parse(days[i - 1]) === DAY_MS) current++;
    else break;
  }
  return { current, longest };
}

/**
 * Consecutive-day streak over an ordered (oldest→newest) list of done/not-done.
 * `current` = trailing run of true; `longest` = best run anywhere.
 */
export function streak(done: boolean[]): StreakResult {
  let longest = 0;
  let run = 0;
  for (const d of done) {
    run = d ? run + 1 : 0;
    if (run > longest) longest = run;
  }
  let current = 0;
  for (let i = done.length - 1; i >= 0 && done[i]; i--) current++;
  return { current, longest };
}

/** Mean of the last `window` values (or all, if fewer). Empty → 0. */
export function rollingAvg(values: number[], window: number): number {
  const w = window > 0 ? window : values.length;
  const slice = values.slice(Math.max(0, values.length - w));
  if (slice.length === 0) return 0;
  const finite = slice.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return 0;
  return round2(finite.reduce((s, v) => s + v, 0) / finite.length);
}

export type AggregateOp = "sum" | "avg" | "count" | "max" | "min";

/** Reduce a list of numbers by the given operation. */
export function aggregate(values: number[], op: AggregateOp): number {
  const finite = values.filter((v) => Number.isFinite(v));
  switch (op) {
    case "count":
      return values.length;
    case "sum":
      return round2(finite.reduce((s, v) => s + v, 0));
    case "avg":
      return finite.length ? round2(finite.reduce((s, v) => s + v, 0) / finite.length) : 0;
    case "max":
      return finite.length ? Math.max(...finite) : 0;
    case "min":
      return finite.length ? Math.min(...finite) : 0;
    default:
      return 0;
  }
}

// --- Resolution over an entry list ----------------------------------------

type Entry = { data: Record<string, unknown> };

export type SectionComputation =
  | { kind: "streak"; params: { field: string } }
  | { kind: "rolling_avg"; params: { field: string; window?: number } }
  | { kind: "aggregate"; params: { field: string; op: AggregateOp } };

export type SectionComputedValue =
  | { kind: "streak"; value: StreakResult }
  | { kind: "rolling_avg"; value: number }
  | { kind: "aggregate"; value: number };

/** Missing/non-numeric → NaN (so aggregate/rollingAvg filter it out, not treat as 0). */
function numeric(v: unknown): number {
  if (v === undefined || v === null || v === "") return NaN;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function column(entries: Entry[], field: string): unknown[] {
  return entries.map((e) => e.data?.[field]);
}

/** Evaluate a section-level computation across an ordered entry list. */
export function resolveSectionComputed(
  computation: SectionComputation,
  entries: Entry[]
): SectionComputedValue | null {
  switch (computation.kind) {
    case "streak":
      return {
        kind: "streak",
        value: streak(column(entries, computation.params.field).map(isDone)),
      };
    case "rolling_avg":
      return {
        kind: "rolling_avg",
        value: rollingAvg(
          column(entries, computation.params.field).map(numeric),
          computation.params.window ?? 7
        ),
      };
    case "aggregate":
      return {
        kind: "aggregate",
        value: aggregate(
          column(entries, computation.params.field).map(numeric),
          computation.params.op
        ),
      };
    default:
      return null;
  }
}

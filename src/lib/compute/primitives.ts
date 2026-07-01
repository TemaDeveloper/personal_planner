/**
 * Deterministic computation primitives for adaptive sections.
 *
 * These are the seed of SP-1's primitive kit: a small, explicit, unit-testable
 * set of derivations that the section renderer can evaluate without an LLM.
 * A section field carries a typed `FieldComputation`; `resolveComputed` reads
 * the field values from an entry's data and returns the derived result.
 */

export type ComputationKind = "net" | "pace_eta" | "ceiling";

export interface FieldComputation {
  kind: ComputationKind;
  /** References to other field keys (string) or literal numbers/dates. */
  params: Record<string, unknown>;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function safeSum(xs: number[]): number {
  return xs.reduce((s, x) => s + (Number.isFinite(x) ? x : 0), 0);
}

// --- Pure primitives -------------------------------------------------------

/** net = sum(add) - sum(subtract). Non-finite inputs count as 0. */
export function net(add: number[], subtract: number[]): number {
  return round2(safeSum(add) - safeSum(subtract));
}

export interface PaceEtaResult {
  done: boolean;
  remaining: number;
  /** null when the target is unreachable at the current rate (rate <= 0). */
  weeksRemaining: number | null;
  eta: Date | null;
}

/** Projects an ETA to reach `target` from `current` at `ratePerWeek`. */
export function paceEta(opts: {
  target: number;
  current: number;
  ratePerWeek: number;
  from: Date;
}): PaceEtaResult {
  const remaining = round2(opts.target - opts.current);
  if (remaining <= 0) {
    return { done: true, remaining: 0, weeksRemaining: 0, eta: opts.from };
  }
  if (!(opts.ratePerWeek > 0)) {
    return { done: false, remaining, weeksRemaining: null, eta: null };
  }
  const weeks = remaining / opts.ratePerWeek;
  const eta = new Date(opts.from.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);
  return { done: false, remaining, weeksRemaining: round2(weeks), eta };
}

export interface CeilingResult {
  ok: boolean;
  over: number;
  remaining: number;
  /** value / cap; null when cap <= 0. */
  ratio: number | null;
}

/** Inverted metric: a cap to stay under, not a goal to maximise. */
export function ceiling(value: number, cap: number): CeilingResult {
  return {
    ok: value <= cap,
    over: round2(Math.max(0, value - cap)),
    remaining: round2(Math.max(0, cap - value)),
    ratio: cap > 0 ? round2(value / cap) : null,
  };
}

// --- Resolution from entry data -------------------------------------------

type Data = Record<string, unknown>;

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** A param may be a literal number, or a string key into the entry data. */
function resolveNum(ref: unknown, data: Data): number {
  if (typeof ref === "number") return ref;
  if (typeof ref === "string") {
    if (ref in data) return toNum(data[ref]);
    const parsed = Number(ref);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function resolveNumList(ref: unknown, data: Data): number[] {
  if (Array.isArray(ref)) return ref.map((r) => resolveNum(r, data));
  if (ref === undefined || ref === null) return [];
  return [resolveNum(ref, data)];
}

function resolveDate(ref: unknown, data: Data, fallback: Date): Date {
  const raw = typeof ref === "string" && ref in data ? data[ref] : ref;
  if (raw instanceof Date && !isNaN(raw.getTime())) return raw;
  if (typeof raw === "string" || typeof raw === "number") {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }
  return fallback;
}

export type ComputedValue =
  | { kind: "net"; value: number }
  | { kind: "pace_eta"; value: PaceEtaResult }
  | { kind: "ceiling"; value: CeilingResult };

/**
 * Evaluate a field computation against an entry's data.
 * Returns null for an unknown/unsupported kind.
 */
export function resolveComputed(
  computation: FieldComputation,
  data: Data,
  ctx: { now?: Date } = {}
): ComputedValue | null {
  const p = computation.params ?? {};
  switch (computation.kind) {
    case "net":
      return {
        kind: "net",
        value: net(resolveNumList(p.add, data), resolveNumList(p.subtract, data)),
      };
    case "pace_eta": {
      const from = resolveDate(p.from, data, ctx.now ?? new Date());
      return {
        kind: "pace_eta",
        value: paceEta({
          target: resolveNum(p.target, data),
          current: resolveNum(p.current, data),
          ratePerWeek: resolveNum(p.ratePerWeek, data),
          from,
        }),
      };
    }
    case "ceiling":
      return {
        kind: "ceiling",
        value: ceiling(resolveNum(p.value, data), resolveNum(p.cap, data)),
      };
    default:
      return null;
  }
}

/**
 * Deterministic computation primitives for adaptive sections.
 *
 * These are the seed of SP-1's primitive kit: a small, explicit, unit-testable
 * set of derivations that the section renderer can evaluate without an LLM.
 * A section field carries a typed `FieldComputation`; `resolveComputed` reads
 * the field values from an entry's data and returns the derived result.
 */

import { evalFormula } from "@/lib/compute/formula";

export type ComputationKind =
  | "net"
  | "pace_eta"
  | "ceiling"
  | "rate"
  | "target_progress"
  | "countdown"
  | "cycle"
  | "formula";

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

/** A per-unit rate, e.g. $/hr or $/km. null when the denominator is 0. */
export function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? round2(numerator / denominator) : null;
}

export interface TargetProgressResult {
  pct: number;
  remaining: number;
  done: boolean;
  ratio: number | null;
}

/** Progress toward a target (a goal to reach, clamped 0..100%). */
export function targetProgress(current: number, target: number): TargetProgressResult {
  if (!(target > 0)) {
    return { pct: 0, remaining: 0, done: current >= target, ratio: null };
  }
  const ratio = current / target;
  return {
    pct: round2(Math.min(100, Math.max(0, ratio * 100))),
    remaining: round2(Math.max(0, target - current)),
    done: current >= target,
    ratio: round2(ratio),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CountdownResult {
  daysRemaining: number;
  past: boolean;
}

/** Whole days until a target date (negative once past). */
export function countdown(target: Date, from: Date): CountdownResult {
  const days = Math.ceil((target.getTime() - from.getTime()) / DAY_MS) || 0; // normalize -0
  // Same-day (days === 0) is "today", not past — avoids a red "0d ago".
  return { daysRemaining: days, past: days < 0 };
}

export interface CycleResult {
  dayInCycle: number;
  cycleNumber: number;
}

/** Which cycle/day we are in for a repeating period (chemo, menstrual, crop...). 1-based. */
export function cycle(start: Date, current: Date, cycleLengthDays: number): CycleResult {
  if (!(cycleLengthDays > 0)) return { dayInCycle: 0, cycleNumber: 0 };
  const diffDays = Math.floor((current.getTime() - start.getTime()) / DAY_MS);
  const n = Math.floor(diffDays / cycleLengthDays);
  const dayInCycle = diffDays - n * cycleLengthDays; // 0-based, always 0..len-1
  return { dayInCycle: dayInCycle + 1, cycleNumber: n + 1 };
}

// --- Resolution from entry data -------------------------------------------

type Data = Record<string, unknown>;

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** A param may be a literal number, or a string key into the entry data. */
function resolveNum(ref: unknown, data: Data): number {
  if (typeof ref === "number") return Number.isFinite(ref) ? ref : 0;
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
  // Only parse strings — a bare number like 2026 would parse to 1970 (epoch ms).
  if (typeof raw === "string") {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d;
  }
  return fallback;
}

export type ComputedValue =
  | { kind: "net"; value: number }
  | { kind: "pace_eta"; value: PaceEtaResult }
  | { kind: "ceiling"; value: CeilingResult }
  | { kind: "rate"; value: number | null }
  | { kind: "target_progress"; value: TargetProgressResult }
  | { kind: "countdown"; value: CountdownResult }
  | { kind: "cycle"; value: CycleResult }
  | { kind: "formula"; value: number | null };

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
    case "rate":
      return {
        kind: "rate",
        value: rate(resolveNum(p.numerator, data), resolveNum(p.denominator, data)),
      };
    case "target_progress":
      return {
        kind: "target_progress",
        value: targetProgress(resolveNum(p.current, data), resolveNum(p.target, data)),
      };
    case "countdown": {
      const now = ctx.now ?? new Date();
      return {
        kind: "countdown",
        value: countdown(resolveDate(p.target, data, now), resolveDate(p.from, data, now)),
      };
    }
    case "cycle": {
      const now = ctx.now ?? new Date();
      return {
        kind: "cycle",
        value: cycle(
          resolveDate(p.start, data, now),
          resolveDate(p.current, data, now),
          resolveNum(p.cycleLengthDays, data)
        ),
      };
    }
    case "formula":
      return { kind: "formula", value: evalFormula(String(p.expr ?? ""), data) };
    default:
      return null;
  }
}

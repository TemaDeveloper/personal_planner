import { describe, it, expect } from "vitest";
import {
  rate,
  targetProgress,
  countdown,
  cycle,
  resolveComputed,
  type FieldComputation,
} from "@/lib/compute/primitives";
import { formatComputed } from "@/lib/compute/format";
import {
  streak,
  rollingAvg,
  aggregate,
  resolveSectionComputed,
  type SectionComputation,
} from "@/lib/compute/aggregates";
import {
  daysBetween,
  alternatingSlot,
  rotationSlot,
  expandPerEntity,
} from "@/lib/structure/patterns";
import { resolveRenderer, VIEW_TYPES } from "@/lib/views/registry";

describe("extended primitives", () => {
  it("rate divides, guarding against zero denominators", () => {
    expect(rate(214, 10)).toBe(21.4);
    expect(rate(100, 0)).toBeNull();
  });

  it("targetProgress clamps to 0..100 and reports remaining", () => {
    expect(targetProgress(250, 1000)).toEqual({ pct: 25, remaining: 750, done: false, ratio: 0.25 });
    expect(targetProgress(1200, 1000).pct).toBe(100);
    expect(targetProgress(1200, 1000).done).toBe(true);
  });

  it("countdown counts whole days and flags the past", () => {
    const from = new Date("2026-07-01T00:00:00.000Z");
    expect(countdown(new Date("2026-07-11T00:00:00.000Z"), from)).toEqual({ daysRemaining: 10, past: false });
    const past = countdown(new Date("2026-06-28T00:00:00.000Z"), from);
    expect(past.past).toBe(true);
    expect(past.daysRemaining).toBeLessThan(0);
  });

  it("cycle reports 1-based day and cycle number", () => {
    const start = new Date("2026-07-01T00:00:00.000Z");
    expect(cycle(start, new Date("2026-07-01T00:00:00.000Z"), 21)).toEqual({ dayInCycle: 1, cycleNumber: 1 });
    expect(cycle(start, new Date("2026-07-22T00:00:00.000Z"), 21)).toEqual({ dayInCycle: 1, cycleNumber: 2 });
    expect(cycle(start, new Date("2026-07-10T00:00:00.000Z"), 21)).toEqual({ dayInCycle: 10, cycleNumber: 1 });
  });

  it("resolveComputed handles the new per-row kinds", () => {
    const c: FieldComputation = { kind: "rate", params: { numerator: "earn", denominator: "hrs" } };
    expect(resolveComputed(c, { earn: 214, hrs: 10 })).toEqual({ kind: "rate", value: 21.4 });
    const tp = resolveComputed({ kind: "target_progress", params: { current: "s", target: "t" } }, { s: 250, t: 1000 });
    expect(tp?.kind).toBe("target_progress");
  });

  it("formats the new kinds", () => {
    expect(formatComputed({ kind: "rate", value: 21.4 }).text).toBe("21.40");
    expect(formatComputed({ kind: "rate", value: null }).text).toBe("—");
    expect(formatComputed({ kind: "target_progress", value: { pct: 25, remaining: 750, done: false, ratio: 0.25 } }).text).toBe("25%");
    expect(formatComputed({ kind: "countdown", value: { daysRemaining: 10, past: false } }).text).toBe("10d left");
    expect(formatComputed({ kind: "countdown", value: { daysRemaining: -3, past: true } })).toEqual({ text: "3d ago", warn: true });
    expect(formatComputed({ kind: "cycle", value: { dayInCycle: 10, cycleNumber: 2 } }).text).toBe("Cycle 2, day 10");
  });
});

describe("aggregates", () => {
  it("streak counts the trailing run and the longest run", () => {
    expect(streak([true, true, false, true, true, true])).toEqual({ current: 3, longest: 3 });
    expect(streak([true, false, false])).toEqual({ current: 0, longest: 1 });
  });

  it("rollingAvg averages the last window", () => {
    expect(rollingAvg([2, 4, 6, 8], 2)).toBe(7);
    expect(rollingAvg([], 3)).toBe(0);
  });

  it("aggregate reduces by op", () => {
    expect(aggregate([1, 2, 3], "sum")).toBe(6);
    expect(aggregate([1, 2, 3], "avg")).toBe(2);
    expect(aggregate([1, 2, 3], "max")).toBe(3);
    expect(aggregate([1, 2, 3], "count")).toBe(3);
  });

  it("resolveSectionComputed reads a field across entries", () => {
    const entries = [{ data: { done: true } }, { data: { done: true } }, { data: { done: false } }];
    const c: SectionComputation = { kind: "streak", params: { field: "done" } };
    expect(resolveSectionComputed(c, entries)).toEqual({ kind: "streak", value: { current: 0, longest: 2 } });
    const sum = resolveSectionComputed({ kind: "aggregate", params: { field: "x", op: "sum" } }, [
      { data: { x: 10 } },
      { data: { x: 5 } },
    ]);
    expect(sum).toEqual({ kind: "aggregate", value: 15 });
  });
});

describe("structural patterns", () => {
  const start = new Date("2026-07-06T00:00:00.000Z"); // a Monday

  it("daysBetween floors to whole days", () => {
    expect(daysBetween(start, new Date("2026-07-13T00:00:00.000Z"))).toBe(7);
  });

  it("alternatingSlot flips A/B each week, including before the anchor", () => {
    expect(alternatingSlot(start, new Date("2026-07-06T00:00:00.000Z"))).toBe("A");
    expect(alternatingSlot(start, new Date("2026-07-13T00:00:00.000Z"))).toBe("B");
    expect(alternatingSlot(start, new Date("2026-07-20T00:00:00.000Z"))).toBe("A");
    expect(alternatingSlot(start, new Date("2026-06-29T00:00:00.000Z"))).toBe("B");
    expect(alternatingSlot(start, new Date("2026-07-13T00:00:00.000Z"), { labels: ["Dad", "Mum"] })).toBe("Mum");
  });

  it("rotationSlot cycles through N slots", () => {
    const slots = ["Day", "Night", "Off"];
    expect(rotationSlot(start, start, slots)).toBe("Day");
    expect(rotationSlot(start, new Date("2026-07-08T00:00:00.000Z"), slots)).toBe("Off");
    expect(rotationSlot(start, new Date("2026-07-09T00:00:00.000Z"), slots)).toBe("Day");
  });

  it("expandPerEntity repeats fields per entity with scoped keys and labels", () => {
    const out = expandPerEntity(["Ava", "Ben"], [{ key: "pickup", label: "Pickup", type: "boolean" }]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ entity: "Ava", key: "ava_pickup", label: "Ava — Pickup", type: "boolean" });
    expect(out[1].key).toBe("ben_pickup");
  });
});

describe("view registry", () => {
  it("maps novel view types to a real renderer, falling back gracefully", () => {
    expect(resolveRenderer("pipeline")).toBe("board");
    expect(resolveRenderer("budget")).toBe("table");
    expect(resolveRenderer("goal-progress")).toBe("table");
    expect(resolveRenderer("table")).toBe("table");
    expect(resolveRenderer("something-unknown")).toBe("weekly-cards");
    expect(resolveRenderer(undefined)).toBe("weekly-cards");
  });

  it("exposes the full vocabulary", () => {
    expect(VIEW_TYPES).toContain("streak");
    expect(VIEW_TYPES.length).toBeGreaterThanOrEqual(12);
  });
});

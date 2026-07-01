import { describe, it, expect } from "vitest";
import {
  net,
  paceEta,
  ceiling,
  resolveComputed,
  type FieldComputation,
} from "@/lib/compute/primitives";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

describe("net", () => {
  it("sums the added amounts and subtracts the deducted ones", () => {
    // Marcus: gross 120 + tips 20 - fuel 10 - depreciation 5 = 125
    expect(net([120, 20], [10, 5])).toBe(125);
  });

  it("allows a negative net (costs exceed income)", () => {
    expect(net([50], [80])).toBe(-30);
  });

  it("treats non-finite inputs as zero", () => {
    expect(net([100, NaN], [Infinity, 10])).toBe(90);
  });

  it("rounds to two decimals", () => {
    expect(net([10.005], [0])).toBe(10.01);
  });
});

describe("paceEta", () => {
  const from = new Date("2026-07-01T00:00:00.000Z");

  it("projects weeks remaining and an ETA date from the current pace", () => {
    // Ella: target 8000, saved 5000, 250/wk -> 3000 / 250 = 12 weeks
    const r = paceEta({ target: 8000, current: 5000, ratePerWeek: 250, from });
    expect(r.done).toBe(false);
    expect(r.remaining).toBe(3000);
    expect(r.weeksRemaining).toBe(12);
    expect(r.eta?.getTime()).toBe(from.getTime() + 12 * WEEK_MS);
  });

  it("reports done when the target is already met", () => {
    const r = paceEta({ target: 8000, current: 8000, ratePerWeek: 250, from });
    expect(r.done).toBe(true);
    expect(r.remaining).toBe(0);
    expect(r.weeksRemaining).toBe(0);
    expect(r.eta?.getTime()).toBe(from.getTime());
  });

  it("returns no ETA when the rate is zero or negative", () => {
    const r = paceEta({ target: 8000, current: 5000, ratePerWeek: 0, from });
    expect(r.done).toBe(false);
    expect(r.remaining).toBe(3000);
    expect(r.weeksRemaining).toBeNull();
    expect(r.eta).toBeNull();
  });
});

describe("ceiling", () => {
  it("is ok and reports headroom when under the cap", () => {
    // Grace: 4 spoons spent, cap 12
    const r = ceiling(4, 12);
    expect(r.ok).toBe(true);
    expect(r.over).toBe(0);
    expect(r.remaining).toBe(8);
    expect(r.ratio).toBe(0.33);
  });

  it("flags an overage when the value exceeds the cap", () => {
    const r = ceiling(15, 12);
    expect(r.ok).toBe(false);
    expect(r.over).toBe(3);
    expect(r.remaining).toBe(0);
    expect(r.ratio).toBe(1.25);
  });

  it("treats value equal to cap as ok (not over)", () => {
    const r = ceiling(12, 12);
    expect(r.ok).toBe(true);
    expect(r.over).toBe(0);
  });

  it("returns a null ratio when the cap is zero", () => {
    expect(ceiling(3, 0).ratio).toBeNull();
  });
});

describe("resolveComputed", () => {
  it("resolves a net computation by reading field keys from entry data", () => {
    const comp: FieldComputation = {
      kind: "net",
      params: { add: ["gross", "tips"], subtract: ["fuel", "depreciation"] },
    };
    const out = resolveComputed(comp, { gross: 120, tips: 20, fuel: 10, depreciation: 5 });
    expect(out).toEqual({ kind: "net", value: 125 });
  });

  it("resolves pace_eta using a from-date stored in the data", () => {
    const comp: FieldComputation = {
      kind: "pace_eta",
      params: { target: "target", current: "saved", ratePerWeek: "weekly", from: "start" },
    };
    const out = resolveComputed(comp, {
      target: 8000,
      saved: 5000,
      weekly: 250,
      start: "2026-07-01T00:00:00.000Z",
    });
    expect(out?.kind).toBe("pace_eta");
    if (out?.kind === "pace_eta") {
      expect(out.value.weeksRemaining).toBe(12);
    }
  });

  it("resolves a ceiling computation from field keys", () => {
    const comp: FieldComputation = {
      kind: "ceiling",
      params: { value: "minutes", cap: "daily_cap" },
    };
    const out = resolveComputed(comp, { minutes: 15, daily_cap: 12 });
    expect(out).toEqual({
      kind: "ceiling",
      value: { ok: false, over: 3, remaining: 0, ratio: 1.25 },
    });
  });

  it("falls back to the ctx.now date when the from field is missing", () => {
    const now = new Date("2026-07-01T00:00:00.000Z");
    const comp: FieldComputation = {
      kind: "pace_eta",
      params: { target: 100, current: 0, ratePerWeek: 100 },
    };
    const out = resolveComputed(comp, {}, { now });
    if (out?.kind === "pace_eta") {
      expect(out.value.eta?.getTime()).toBe(now.getTime() + 1 * WEEK_MS);
    }
  });

  it("returns null for an unknown computation kind", () => {
    const comp = { kind: "bogus", params: {} } as unknown as FieldComputation;
    expect(resolveComputed(comp, {})).toBeNull();
  });
});

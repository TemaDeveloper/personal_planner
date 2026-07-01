import { describe, it, expect } from "vitest";
import { formatComputed } from "@/lib/compute/format";

describe("formatComputed", () => {
  it("formats a positive net without warning", () => {
    expect(formatComputed({ kind: "net", value: 125 })).toEqual({ text: "125.00", warn: false });
  });

  it("warns on a negative net", () => {
    expect(formatComputed({ kind: "net", value: -30 })).toEqual({ text: "-30.00", warn: true });
  });

  it("formats a pace_eta with weeks and an ISO date", () => {
    const eta = new Date("2026-09-23T00:00:00.000Z");
    const out = formatComputed({
      kind: "pace_eta",
      value: { done: false, remaining: 3000, weeksRemaining: 12, eta },
    });
    expect(out).toEqual({ text: "12 wk → 2026-09-23", warn: false });
  });

  it("shows Reached when a goal is done", () => {
    const out = formatComputed({
      kind: "pace_eta",
      value: { done: true, remaining: 0, weeksRemaining: 0, eta: new Date() },
    });
    expect(out.text).toBe("Reached");
    expect(out.warn).toBe(false);
  });

  it("warns when there is no ETA at the current pace", () => {
    const out = formatComputed({
      kind: "pace_eta",
      value: { done: false, remaining: 3000, weeksRemaining: null, eta: null },
    });
    expect(out).toEqual({ text: "No ETA at current pace", warn: true });
  });

  it("shows headroom under a ceiling", () => {
    expect(
      formatComputed({ kind: "ceiling", value: { ok: true, over: 0, remaining: 8, ratio: 0.33 } })
    ).toEqual({ text: "8 left", warn: false });
  });

  it("warns when a ceiling is exceeded", () => {
    expect(
      formatComputed({ kind: "ceiling", value: { ok: false, over: 3, remaining: 0, ratio: 1.25 } })
    ).toEqual({ text: "Over by 3", warn: true });
  });
});

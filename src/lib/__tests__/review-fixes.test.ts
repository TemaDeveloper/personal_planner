import { describe, it, expect } from "vitest";
import { countdown, resolveComputed } from "@/lib/compute/primitives";
import { dayStreak, isDone, resolveSectionComputed } from "@/lib/compute/aggregates";
import { evalFormula } from "@/lib/compute/formula";
import { parseFacets } from "@/lib/profile/facet-extract";
import { parseSections } from "@/lib/profile/generate-sections";

describe("countdown same-day", () => {
  it("treats a deadline earlier today as 'today' (0 left), not past", () => {
    const target = new Date("2026-07-01T00:00:00.000Z");
    const from = new Date("2026-07-01T15:00:00.000Z");
    expect(countdown(target, from)).toEqual({ daysRemaining: 0, past: false });
  });
});

describe("isDone / dayStreak", () => {
  it("does not treat the string 'false'/'0'/'' as done", () => {
    expect(isDone(true)).toBe(true);
    expect(isDone(1)).toBe(true);
    expect(isDone("yes")).toBe(true);
    expect(["false", "0", "no", "", 0, false, null].map(isDone)).toEqual([
      false, false, false, false, false, false, false,
    ]);
  });

  it("counts consecutive calendar days, with gaps breaking the run", () => {
    expect(dayStreak(["2026-06-01", "2026-06-05", "2026-06-12"])).toEqual({ current: 1, longest: 1 });
    expect(dayStreak(["2026-06-01", "2026-06-02", "2026-06-03"])).toEqual({ current: 3, longest: 3 });
    // longest earlier, current shorter
    expect(dayStreak(["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-10"])).toEqual({
      current: 1,
      longest: 3,
    });
  });
});

describe("aggregates ignore missing values (not coerced to 0)", () => {
  const entries = [{ data: { w: 80 } }, { data: {} }, { data: { w: 82 } }];
  it("min/avg skip the missing day instead of counting it as 0", () => {
    expect(resolveSectionComputed({ kind: "aggregate", params: { field: "w", op: "min" } }, entries))
      .toEqual({ kind: "aggregate", value: 80 });
    expect(resolveSectionComputed({ kind: "aggregate", params: { field: "w", op: "avg" } }, entries))
      .toEqual({ kind: "aggregate", value: 81 });
  });
});

describe("formula guards", () => {
  it("returns null on pathological deep input instead of blowing the stack", () => {
    const bomb = "(".repeat(5000) + "1" + ")".repeat(5000);
    expect(evalFormula(bomb, {})).toBeNull();
  });
});

describe("parseFacets leniency", () => {
  it("clamps an out-of-range salience instead of throwing", () => {
    const out = parseFacets('{"facets":[{"dimension":"health","value":"chronic","salience":5}]}');
    expect(out[0].salience).toBe(1);
  });
  it("skips facets missing dimension/value and normalizes source", () => {
    const out = parseFacets('[{"value":"x"},{"dimension":"money","value":"tight","source":"bogus"}]');
    expect(out).toHaveLength(1);
    expect(out[0].source).toBe("inferred");
  });
  it("returns [] on non-JSON rather than throwing", () => {
    expect(parseFacets("sorry, here is your profile")).toEqual([]);
  });
});

describe("section field-key de-dup", () => {
  it("keeps colliding label-derived keys distinct", () => {
    const raw = '{"sections":[{"name":"Money","fields":[{"label":"Net $","type":"number"},{"label":"Net %","type":"number"}]}]}';
    const keys = parseSections(raw)[0].fields.map((f) => f.key);
    expect(keys).toEqual(["net", "net_2"]);
  });
});

describe("resolveComputed number-date guard", () => {
  it("does not interpret a bare number as an epoch-ms date", () => {
    const now = new Date("2026-07-01T00:00:00.000Z");
    const cv = resolveComputed({ kind: "countdown", params: { target: "due" } }, { due: 2026 }, { now });
    // 2026 must NOT parse to 1970; falls back to `now` → 0 days.
    if (cv?.kind === "countdown") expect(cv.value.daysRemaining).toBe(0);
    else throw new Error("expected countdown");
  });
});

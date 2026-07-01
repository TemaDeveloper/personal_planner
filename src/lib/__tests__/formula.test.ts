import { describe, it, expect } from "vitest";
import { evalFormula } from "@/lib/compute/formula";
import { resolveComputed } from "@/lib/compute/primitives";
import { formatComputed } from "@/lib/compute/format";

describe("evalFormula", () => {
  const data = { hours: 8, rate: 25, fuel: 10, gross: 200 };

  it("evaluates field references with arithmetic", () => {
    expect(evalFormula("hours * rate", data)).toBe(200);
    expect(evalFormula("gross - fuel", data)).toBe(190);
  });

  it("respects operator precedence and parentheses", () => {
    expect(evalFormula("2 + 3 * 4", {})).toBe(14);
    expect(evalFormula("(2 + 3) * 4", {})).toBe(20);
  });

  it("supports division and decimals, rounding to 2 dp", () => {
    expect(evalFormula("earnings / hours", { earnings: 214, hours: 10 })).toBe(21.4);
    expect(evalFormula("10 / 3", {})).toBe(3.33);
  });

  it("treats unknown identifiers as 0", () => {
    expect(evalFormula("missing + 5", {})).toBe(5);
  });

  it("returns null on divide-by-zero", () => {
    expect(evalFormula("5 / 0", {})).toBeNull();
  });

  it("returns null on malformed input (no code execution)", () => {
    expect(evalFormula("2 +", {})).toBeNull();
    expect(evalFormula("alert(1)", {})).toBeNull();
    expect(evalFormula("", {})).toBeNull();
  });

  it("handles unary minus", () => {
    expect(evalFormula("-hours + 2", { hours: 5 })).toBe(-3);
  });
});

describe("formula computation kind", () => {
  it("resolves and formats gross = hours * rate", () => {
    const cv = resolveComputed(
      { kind: "formula", params: { expr: "hours * hourly_rate" } },
      { hours: 8, hourly_rate: 25 }
    );
    expect(cv).toEqual({ kind: "formula", value: 200 });
    expect(formatComputed(cv!).text).toBe("200.00");
  });

  it("formats a dash when the formula is invalid", () => {
    const cv = resolveComputed({ kind: "formula", params: { expr: "x /" } }, {});
    expect(formatComputed(cv!).text).toBe("—");
  });
});

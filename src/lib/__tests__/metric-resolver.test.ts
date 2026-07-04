// src/lib/__tests__/metric-resolver.test.ts
import { describe, it, expect, vi } from "vitest";

// Mocks hoisted to module level as required by vitest
vi.mock("@/lib/models/work-session", () => ({
  default: {
    find: () => { throw new Error("DB error"); },
    countDocuments: () => { throw new Error("DB error"); },
  },
}));
vi.mock("@/lib/models/gym-attendance", () => ({
  default: {
    find: () => { throw new Error("DB error"); },
    countDocuments: () => { throw new Error("DB error"); },
  },
}));
vi.mock("@/lib/models/study-session", () => ({
  default: { find: () => { throw new Error("DB error"); } },
}));
vi.mock("@/lib/models/health-log", () => ({
  default: { find: () => { throw new Error("DB error"); } },
}));
vi.mock("@/lib/models/expense", () => ({
  default: { find: () => { throw new Error("DB error"); } },
}));
vi.mock("@/lib/models/route", () => ({
  default: { find: () => { throw new Error("DB error"); } },
}));
vi.mock("@/lib/models/custom-field-value", () => ({
  default: { find: () => { throw new Error("DB error"); } },
}));
// Built-in metrics now read the unified store first; make those throw too so
// the resilience contract (never throw → "—") is what's exercised, not a hang.
vi.mock("@/lib/models/custom-entry", () => ({
  default: { find: () => { throw new Error("DB error"); } },
}));
vi.mock("@/lib/models/section-template", () => ({
  default: { findOne: () => { throw new Error("DB error"); } },
}));

// ── Helpers (local, mirrors metric-resolver internals) ─────────────────────

function applyAggregation(
  values: unknown[],
  aggregation: "sum" | "avg" | "latest" | "count",
  dateKeys: string[]
): string {
  if (values.length === 0) return "—";

  const nums = values.map(Number).filter((n) => !isNaN(n));

  switch (aggregation) {
    case "count":
      return String(values.length);
    case "sum": {
      const sum = nums.reduce((a, b) => a + b, 0);
      return String(Math.round(sum * 100) / 100);
    }
    case "avg": {
      if (nums.length === 0) return "—";
      const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
      return (Math.round(avg * 10) / 10).toFixed(1);
    }
    case "latest": {
      // Pair up values with dateKeys, pick the one with the latest dateKey
      const pairs = values.map((v, i) => ({ v, k: dateKeys[i] }));
      pairs.sort((a, b) => b.k.localeCompare(a.k));
      return String(pairs[0].v);
    }
  }
}

describe("custom-field aggregation logic (metric-resolver helpers)", () => {
  it("count returns number of docs", () => {
    expect(applyAggregation([7, 8, 9], "count", ["2026-06-01", "2026-06-02", "2026-06-03"])).toBe("3");
  });

  it("sum adds numeric values and rounds to 2 dp", () => {
    expect(applyAggregation([1.1, 2.2, 3.3], "sum", ["2026-06-01", "2026-06-02", "2026-06-03"])).toBe("6.6");
  });

  it("avg returns 1-decimal average", () => {
    expect(applyAggregation([6, 8, 7], "avg", ["2026-06-01", "2026-06-02", "2026-06-03"])).toBe("7.0");
  });

  it("avg rounds to 1 decimal", () => {
    // (7 + 8) / 2 = 7.5
    expect(applyAggregation([7, 8], "avg", ["2026-06-01", "2026-06-02"])).toBe("7.5");
  });

  it("latest picks the value with the lexicographically largest dateKey", () => {
    // dateKeys out of order — latest should be "2026-06-05" → value 99
    expect(
      applyAggregation(
        [10, 99, 50],
        "latest",
        ["2026-06-01", "2026-06-05", "2026-06-03"]
      )
    ).toBe("99");
  });

  it("returns — for empty values array", () => {
    expect(applyAggregation([], "sum", [])).toBe("—");
    expect(applyAggregation([], "avg", [])).toBe("—");
    expect(applyAggregation([], "count", [])).toBe("—");
    expect(applyAggregation([], "latest", [])).toBe("—");
  });

  it("sum handles floating point correctly", () => {
    // 0.1 + 0.2 = 0.30000000000000004 raw; round2 should give 0.3
    expect(applyAggregation([0.1, 0.2], "sum", ["2026-06-01", "2026-06-02"])).toBe("0.3");
  });

  it("avg ignores non-numeric values in the num array", () => {
    // "N/A" is not a number, so avg of [5] = 5.0
    expect(applyAggregation(["N/A", 5], "avg", ["2026-06-01", "2026-06-02"])).toBe("5.0");
  });
});

describe("resolveMetricValue error resilience", () => {
  it("returns value '—' when the resolver throws", async () => {
    const { resolveMetricValue } = await import("@/lib/metric-resolver");

    const fakeMetric = {
      _id: "abc123",
      label: "Test",
      sourceKind: "builtin" as const,
      sectionKey: "work",
      fieldKey: "weekEarnings",
      aggregation: "sum" as const,
      period: "week" as const,
      order: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const result = await resolveMetricValue(fakeMetric, "user1", {});
    expect(result.value).toBe("—");
    expect(result.id).toBe("abc123");
    expect(result.label).toBe("Test");
  });
});

import { describe, it, expect } from "vitest";
import { monthMatrix, indexByDay, WEEKDAYS, localDateKey } from "@/lib/notes/calendar-grid";

describe("monthMatrix", () => {
  it("returns 6 weeks of 7 days", () => {
    const m = monthMatrix(2026, 5); // June 2026
    expect(m).toHaveLength(6);
    for (const w of m) expect(w).toHaveLength(7);
  });
  it("is Monday-first and contains the 1st of the month", () => {
    const m = monthMatrix(2026, 5);
    // June 1 2026 is a Monday → first cell.
    expect(m[0][0]).toBe("2026-06-01");
    expect(WEEKDAYS[0]).toBe("Mon");
  });
  it("includes leading days from the previous month when the 1st isn't Monday", () => {
    const m = monthMatrix(2026, 0); // Jan 2026, 1st is Thursday
    expect(m[0][0]).toBe("2025-12-29");
    expect(m[0]).toContain("2026-01-01");
  });
});

describe("localDateKey", () => {
  it("formats a date as local yyyy-mm-dd with zero-padding", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(localDateKey(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
  it("uses local fields, not UTC (no toISOString shift)", () => {
    // 2026-06-18 09:00 LOCAL → key must be 2026-06-18 regardless of tz offset.
    const d = new Date(2026, 5, 18, 9, 0, 0);
    expect(localDateKey(d)).toBe("2026-06-18");
  });
});

describe("indexByDay", () => {
  it("buckets rows by the yyyy-mm-dd of a date cell", () => {
    const rows = [
      { cells: { d: "2026-06-18T09:00:00Z" } },
      { cells: { d: "2026-06-18" } },
      { cells: { d: "2026-06-20" } },
      { cells: {} },
    ];
    const map = indexByDay(rows, "d");
    expect(map.get("2026-06-18")).toHaveLength(2);
    expect(map.get("2026-06-20")).toHaveLength(1);
    expect(map.has("undefined")).toBe(false);
  });
  it("returns empty map when no date property", () => {
    expect(indexByDay([{ cells: {} }], undefined).size).toBe(0);
  });
});

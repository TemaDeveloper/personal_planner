import { describe, it, expect } from "vitest";
import { buildMiniMonth } from "@/lib/mini-month";

describe("buildMiniMonth", () => {
  it("returns whole Mon-started weeks covering June 2026", () => {
    const weeks = buildMiniMonth(new Date(2026, 5, 16));
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    // June 1 2026 is a Monday → first cell is June 1
    expect(weeks[0][0].getDate()).toBe(1);
    expect(weeks[0][0].getMonth()).toBe(5);
    // last cell is a Sunday
    expect(weeks[weeks.length - 1][6].getDay()).toBe(0);
  });
});

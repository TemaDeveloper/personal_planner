import { describe, it, expect } from "vitest";
import { HOUR_HEIGHT, MIN_HOUR_HEIGHT, MAX_HOUR_HEIGHT, clampHourHeight, zoomedHeight } from "@/lib/calendar-grid";

describe("hour-height zoom", () => {
  it("default height is 64", () => {
    expect(HOUR_HEIGHT).toBe(64);
  });
  it("clamps below the minimum", () => {
    expect(clampHourHeight(10)).toBe(MIN_HOUR_HEIGHT);
  });
  it("clamps above the maximum", () => {
    expect(clampHourHeight(9999)).toBe(MAX_HOUR_HEIGHT);
  });
  it("rounds to an integer pixel", () => {
    expect(clampHourHeight(64.7)).toBe(65);
  });
  it("zoomedHeight scales and clamps", () => {
    expect(zoomedHeight(64, 1.25)).toBe(80);
    expect(zoomedHeight(MAX_HOUR_HEIGHT, 2)).toBe(MAX_HOUR_HEIGHT);
    expect(zoomedHeight(MIN_HOUR_HEIGHT, 0.1)).toBe(MIN_HOUR_HEIGHT);
  });
});

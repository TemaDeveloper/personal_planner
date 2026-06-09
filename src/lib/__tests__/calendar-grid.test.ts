import { describe, it, expect } from "vitest";
import { HOUR_HEIGHT, snapHour, hourAtOffset, rawHourAtOffset, clampRange } from "../calendar-grid";

describe("calendar-grid math", () => {
  it("exposes a positive hour height", () => {
    expect(HOUR_HEIGHT).toBeGreaterThan(0);
  });

  it("snaps to 30-minute increments", () => {
    expect(snapHour(9.1)).toBe(9);
    expect(snapHour(9.3)).toBe(9.5);
    expect(snapHour(9.8)).toBe(10);
  });

  it("snaps to a custom step (e.g. 5 minutes) when given one", () => {
    // 4 min past the hour -> nearest 5 min = 5 min
    expect(snapHour(9 + 4 / 60, 5)).toBeCloseTo(9 + 5 / 60, 6);
    // 2 min past -> nearest 5 = 0
    expect(snapHour(9 + 2 / 60, 5)).toBeCloseTo(9, 6);
    // 15 min snaps cleanly
    expect(snapHour(9 + 15 / 60, 15)).toBeCloseTo(9.25, 6);
  });

  it("rawHourAtOffset follows the pixel offset with no snapping (clamped to [0,24])", () => {
    expect(rawHourAtOffset(0, 48)).toBe(0);
    expect(rawHourAtOffset(60, 48)).toBeCloseTo(1.25, 6); // 1.25h, NOT snapped to 1 or 1.5
    expect(rawHourAtOffset(50, 48)).toBeCloseTo(50 / 48, 6);
    expect(rawHourAtOffset(-20, 48)).toBe(0);
    expect(rawHourAtOffset(48 * 30, 48)).toBe(24);
  });

  it("clamps snapped hours to [0,24]", () => {
    expect(snapHour(-1)).toBe(0);
    expect(snapHour(30)).toBe(24);
  });

  it("converts a pixel offset to a snapped hour", () => {
    expect(hourAtOffset(0, 48)).toBe(0);
    expect(hourAtOffset(48, 48)).toBe(1);
    expect(hourAtOffset(72, 48)).toBe(1.5);
  });

  it("clampRange enforces a minimum 30-min duration within the day", () => {
    expect(clampRange(9, 9)).toEqual({ start: 9, end: 9.5 });
    expect(clampRange(23.5, 26)).toEqual({ start: 23.5, end: 24 });
    expect(clampRange(10, 9)).toEqual({ start: 10, end: 10.5 });
  });
});

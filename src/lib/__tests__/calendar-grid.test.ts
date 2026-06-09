import { describe, it, expect } from "vitest";
import { HOUR_HEIGHT, snapHour, hourAtOffset, clampRange } from "../calendar-grid";

describe("calendar-grid math", () => {
  it("exposes a positive hour height", () => {
    expect(HOUR_HEIGHT).toBeGreaterThan(0);
  });

  it("snaps to 30-minute increments", () => {
    expect(snapHour(9.1)).toBe(9);
    expect(snapHour(9.3)).toBe(9.5);
    expect(snapHour(9.8)).toBe(10);
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

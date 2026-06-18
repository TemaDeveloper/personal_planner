import { describe, it, expect } from "vitest";
import { CALLOUT_COLORS, CALLOUT_COLOR_KEYS, isCalloutColor } from "@/lib/notes/callout-colors";

describe("callout colors", () => {
  it("has Default + 9 colors", () => {
    expect(CALLOUT_COLORS).toHaveLength(10);
    expect(CALLOUT_COLOR_KEYS[0]).toBe("default");
    expect(CALLOUT_COLOR_KEYS).toContain("blue");
  });
  it("keys are unique and every entry has a label + swatch", () => {
    expect(new Set(CALLOUT_COLOR_KEYS).size).toBe(CALLOUT_COLOR_KEYS.length);
    for (const c of CALLOUT_COLORS) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.swatch.length).toBeGreaterThan(0);
    }
  });
  it("validates membership", () => {
    expect(isCalloutColor("blue")).toBe(true);
    expect(isCalloutColor("chartreuse")).toBe(false);
  });
});

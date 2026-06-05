import { describe, it, expect } from "vitest";
import { THEMES, THEME_COLORS, DEFAULT_ENABLED_SECTIONS } from "@/lib/constants";

describe("Editorial Calm theme constants", () => {
  it("uses muted single-hue presets led by clay", () => {
    expect(THEMES[0]).toBe("clay");
    expect(THEMES).toEqual(["clay", "sage", "ocean", "amber", "plum"]);
  });

  it("maps clay to the brand accent hex", () => {
    expect(THEME_COLORS.clay).toBe("#C0613C");
  });

  it("no preset is the old template green", () => {
    expect(Object.values(THEME_COLORS)).not.toContain("#22C55E");
  });

  it("keeps the default enabled sections intact", () => {
    expect(DEFAULT_ENABLED_SECTIONS).toContain("work");
  });
});

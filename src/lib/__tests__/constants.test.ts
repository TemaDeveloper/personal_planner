import { describe, it, expect } from "vitest";
import { SECTIONS, SECTION_META, THEMES, THEME_COLORS } from "../constants";

describe("constants", () => {
  it("every section has metadata", () => {
    for (const section of SECTIONS) {
      expect(SECTION_META[section]).toBeDefined();
      expect(SECTION_META[section].label).toBeTruthy();
      expect(SECTION_META[section].href).toMatch(/^\//);
      expect(SECTION_META[section].icon).toBeTruthy();
    }
  });

  it("every theme has a color", () => {
    for (const theme of THEMES) {
      expect(THEME_COLORS[theme]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("sections include gym", () => {
    expect(SECTIONS).toContain("gym");
  });

  it("gym description mentions attendance", () => {
    expect(SECTION_META.gym.description.toLowerCase()).toContain("attendance");
  });
});

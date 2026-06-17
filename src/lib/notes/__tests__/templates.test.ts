import { describe, it, expect } from "vitest";
import { TEMPLATES, TEMPLATE_CATEGORIES, buildTemplate } from "@/lib/notes/templates";

describe("templates", () => {
  it("lists all 5 categories in order", () => {
    expect(TEMPLATE_CATEGORIES).toEqual(["Basic", "Students", "Hobbies", "Work & Productivity", "Personal & Health"]);
  });
  it("every template has key/label/description/icon and a build()", () => {
    for (const t of TEMPLATES) {
      expect(t.key.length).toBeGreaterThan(0);
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.description.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
      expect(TEMPLATE_CATEGORIES).toContain(t.category);
    }
  });
  it("every template builds at least one block", () => {
    for (const t of TEMPLATES) expect(buildTemplate(t.key).length).toBeGreaterThan(0);
  });
  it("includes the five Basic presets", () => {
    const basic = TEMPLATES.filter((t) => t.category === "Basic").map((t) => t.key).sort();
    expect(basic).toEqual(["blank", "journal", "meeting", "project", "todo"]);
  });
  it("unknown key falls back to a single blank paragraph", () => {
    const blocks = buildTemplate("does-not-exist");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
  });
  it("keys are unique", () => {
    const keys = TEMPLATES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

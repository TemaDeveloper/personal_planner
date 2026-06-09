import { describe, it, expect } from "vitest";
import {
  CALENDAR_PALETTE,
  DEFAULT_CATEGORIES,
  categoryColor,
  monthGridRange,
  categoriesFromSections,
  isDefaultCategories,
} from "../calendar";

describe("section-based categories", () => {
  it("maps enabled planner sections to labeled, colored categories", () => {
    const cats = categoriesFromSections(["gym", "hobbies", "work"]);
    expect(cats.map((c) => c.key)).toEqual(["gym", "hobbies", "work"]);
    expect(cats.find((c) => c.key === "gym")!.label).toBe("Gym");
    expect(cats.find((c) => c.key === "hobbies")!.label).toBe("Hobbies");
    for (const c of cats) expect(c.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("falls back to the defaults when no sections are enabled", () => {
    expect(categoriesFromSections([])).toEqual(DEFAULT_CATEGORIES);
  });

  it("detects untouched default categories (so they can be re-seeded)", () => {
    expect(isDefaultCategories(DEFAULT_CATEGORIES)).toBe(true);
    expect(isDefaultCategories([{ key: "gym" }, { key: "work" }])).toBe(false);
    expect(isDefaultCategories(undefined)).toBe(false);
  });
});

describe("calendar lib", () => {
  it("exposes a non-empty hex palette", () => {
    expect(CALENDAR_PALETTE.length).toBeGreaterThan(0);
    for (const c of CALENDAR_PALETTE) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("seeds three default categories with palette colors", () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(3);
    for (const c of DEFAULT_CATEGORIES) {
      expect(CALENDAR_PALETTE).toContain(c.color);
      expect(c.key).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it("categoryColor returns the matching category color", () => {
    const cats = [{ key: "work", label: "Work", color: "#3F6B8C" }];
    expect(categoryColor(cats, "work")).toBe("#3F6B8C");
  });

  it("categoryColor falls back to the first category for unknown keys", () => {
    const cats = [{ key: "a", label: "A", color: "#C0613C" }];
    expect(categoryColor(cats, "missing")).toBe("#C0613C");
  });

  it("categoryColor falls back to a neutral grey when there are no categories", () => {
    expect(categoryColor([], "x")).toBe("#5C5552");
  });

  it("monthGridRange spans whole weeks (Mon-start) covering the month", () => {
    // June 2026: June 1 is a Monday.
    const { start, end } = monthGridRange(new Date(2026, 5, 15));
    expect(start.getDay()).toBe(1); // Monday
    expect(start <= new Date(2026, 5, 1)).toBe(true);
    expect(end >= new Date(2026, 5, 30)).toBe(true);
    // whole number of weeks
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    expect(days % 7).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { buildSeedTemplates, SEED_SPECS } from "@/lib/profile/seed-templates";
import { SECTIONS } from "@/lib/constants";
import { resolveComputed } from "@/lib/compute/primitives";

describe("buildSeedTemplates", () => {
  const seeds = buildSeedTemplates();

  it("produces one seed per built-in with unique slugs", () => {
    expect(seeds).toHaveLength(SECTIONS.length);
    const slugs = seeds.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual([...SECTIONS]);
    for (const s of seeds) {
      expect(s.isBuiltIn).toBe(true);
      expect(s.createdBy).toBeNull();
      expect(s.fields.length).toBeGreaterThan(0);
    }
  });

  it("turns work's fuel assumption into a plain field feeding a net computation", () => {
    const work = seeds.find((s) => s.slug === "work")!;
    const net = work.fields.find((f) => f.key === "net")!;
    expect(net.computation?.kind).toBe("net");
    const cv = resolveComputed(net.computation!, { gross: 200, fuel: 0 });
    expect(cv).toEqual({ kind: "net", value: 200 });
  });

  it("uses target_progress for reading and countdown for goals", () => {
    const reading = seeds.find((s) => s.slug === "reading")!;
    expect(reading.fields.find((f) => f.computation)?.computation?.kind).toBe("target_progress");
    const goals = seeds.find((s) => s.slug === "goals")!;
    expect(goals.fields.find((f) => f.computation)?.computation?.kind).toBe("countdown");
  });

  it("every seed spec has a non-empty view type", () => {
    for (const id of SECTIONS) {
      expect(typeof SEED_SPECS[id].viewType).toBe("string");
      expect(SEED_SPECS[id].viewType.length).toBeGreaterThan(0);
    }
  });
});

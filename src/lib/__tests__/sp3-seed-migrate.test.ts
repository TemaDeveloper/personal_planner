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

  it("computes work net from hours*rate-fuel via a formula (no fuel assumption baked in)", () => {
    const work = seeds.find((s) => s.slug === "work")!;
    const net = work.fields.find((f) => f.key === "net")!;
    expect(net.computation?.kind).toBe("formula");
    // A cyclist with no fuel: net === gross
    expect(resolveComputed(net.computation!, { hours: 8, hourly_rate: 25, fuel: 0 }))
      .toEqual({ kind: "formula", value: 200 });
    // A driver: fuel comes out
    expect(resolveComputed(net.computation!, { hours: 8, hourly_rate: 25, fuel: 30 }))
      .toEqual({ kind: "formula", value: 170 });
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

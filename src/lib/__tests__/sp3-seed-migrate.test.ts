import { describe, it, expect } from "vitest";
import { buildSeedTemplates, SEED_SPECS } from "@/lib/profile/seed-templates";
import { migrateBuiltinEntry } from "@/lib/profile/migrate-builtin";
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
    // A cyclist with no fuel: net === gross
    const cv = resolveComputed(net.computation!, { gross: 200, fuel: 0 });
    expect(cv).toEqual({ kind: "net", value: 200 });
  });

  it("uses target_progress for goals and reading", () => {
    for (const slug of ["goals", "reading"]) {
      const s = seeds.find((x) => x.slug === slug)!;
      const computed = s.fields.find((f) => f.computation);
      expect(computed?.computation?.kind).toBe("target_progress");
    }
  });

  it("every seed spec has a view type in the vocabulary", () => {
    for (const id of SECTIONS) {
      expect(typeof SEED_SPECS[id].viewType).toBe("string");
      expect(SEED_SPECS[id].viewType.length).toBeGreaterThan(0);
    }
  });
});

describe("migrateBuiltinEntry", () => {
  it("renames legacy work fields and keeps only declared keys", () => {
    const out = migrateBuiltinEntry("work", {
      _id: "abc",
      userId: "u1",
      __v: 0,
      jobName: "Wuzzals",
      hours: 8,
      date: "2026-05-20T00:00:00.000Z",
      bogus: "drop me",
    });
    expect(out.data).toEqual({ job: "Wuzzals", hours: 8 });
    expect(out.date).toBe("2026-05-20T00:00:00.000Z");
  });

  it("renames reading legacy fields", () => {
    const out = migrateBuiltinEntry("reading", {
      title: "Dune",
      pagesRead: 120,
      totalPages: 400,
      date: "2026-06-01T00:00:00.000Z",
    });
    expect(out.data).toEqual({ title: "Dune", pages_read: 120, total_pages: 400 });
  });

  it("drops keys the template does not declare", () => {
    const out = migrateBuiltinEntry("shopping", { item: "Milk", qty: 2, secret: "x", date: "2026-06-01" });
    expect(out.data).toEqual({ item: "Milk", qty: 2 });
  });
});

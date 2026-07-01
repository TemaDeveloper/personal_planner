import { describe, it, expect } from "vitest";
import { parseSections, pickSourceFacetKey } from "@/lib/profile/generate-sections";
import { buildTemplateDoc } from "@/lib/profile/persist-sections";
import {
  buildMigrationInserts,
  migrationMarker,
  MIGRATION_MARKER,
} from "@/lib/profile/migrate-run";
import type { ILifeFacet } from "@/lib/models/life-profile";

const f = (key: string, dimension: string, salience: number): ILifeFacet => ({
  key,
  dimension,
  value: "v",
  salience,
  source: "stated",
});

describe("SP-5a per-facet source tagging", () => {
  it("parses sourceDimension on a generated section", () => {
    const raw =
      '{"sections":[{"name":"Trips","sourceDimension":"livelihood","fields":[{"key":"g","label":"G","type":"number"}]}]}';
    expect(parseSections(raw)[0].sourceDimension).toBe("livelihood");
  });

  it("pickSourceFacetKey chooses the most salient facet in the dimension", () => {
    const facets = [f("l1", "livelihood", 0.6), f("l2", "livelihood", 0.9), f("m1", "money", 0.8)];
    expect(pickSourceFacetKey("livelihood", facets)).toBe("l2");
    expect(pickSourceFacetKey("Livelihood", facets)).toBe("l2"); // case-insensitive
    expect(pickSourceFacetKey("nonexistent", facets)).toBeUndefined();
    expect(pickSourceFacetKey(undefined, facets)).toBeUndefined();
  });

  it("buildTemplateDoc records source dimension + facet key when provided", () => {
    const section = {
      name: "Trips",
      icon: "Car",
      description: "",
      viewType: "table",
      layoutHtml: "",
      sourceDimension: "livelihood",
      fields: [{ key: "g", label: "G", type: "number" as const }],
    };
    const doc = buildTemplateDoc(section, "u1", "trips", {
      dimension: "livelihood",
      facetKey: "l2",
    });
    expect(doc.sourceDimension).toBe("livelihood");
    expect(doc.sourceFacetKey).toBe("l2");
  });

  it("buildTemplateDoc omits source fields when not provided", () => {
    const section = {
      name: "X",
      icon: "Star",
      description: "",
      viewType: "table",
      layoutHtml: "",
      fields: [{ key: "g", label: "G", type: "number" as const }],
    };
    const doc = buildTemplateDoc(section, "u1", "x");
    expect(doc.sourceDimension).toBeUndefined();
    expect(doc.sourceFacetKey).toBeUndefined();
  });
});

describe("SP-5d migration kernel", () => {
  it("maps legacy docs to CustomEntry inserts and stamps an idempotency marker", () => {
    const legacy = [
      { _id: "a1", jobName: "Wuzzals", hours: 8, date: "2026-05-20T00:00:00.000Z" },
      { _id: "a2", jobName: "Advapay", hours: 5, date: "2026-05-21T00:00:00.000Z" },
    ];
    const inserts = buildMigrationInserts("work", "tpl1", legacy, new Set());
    expect(inserts).toHaveLength(2);
    expect(inserts[0].templateId).toBe("tpl1");
    expect(inserts[0].data.job).toBe("Wuzzals");
    expect(inserts[0].data[MIGRATION_MARKER]).toBe(migrationMarker("work", "a1"));
  });

  it("is idempotent — skips docs already migrated", () => {
    const legacy = [{ _id: "a1", jobName: "Wuzzals", hours: 8 }];
    const seen = new Set([migrationMarker("work", "a1")]);
    expect(buildMigrationInserts("work", "tpl1", legacy, seen)).toHaveLength(0);
  });
});

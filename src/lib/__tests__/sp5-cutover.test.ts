import { describe, it, expect } from "vitest";
import { parseSections, pickSourceFacetKey } from "@/lib/profile/generate-sections";
import { buildTemplateDoc } from "@/lib/profile/persist-sections";
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

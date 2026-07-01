import { describe, it, expect } from "vitest";
import { mergeFacets, distinctDimensions, normalizeDimension } from "@/lib/profile/merge";
import { isProfileSufficient } from "@/lib/profile/conversation";
import { buildTemplateDoc, slugify } from "@/lib/profile/persist-sections";
import { recordDimensions, classifyDimension, novelDimensions } from "@/lib/profile/vocab";
import type { ILifeFacet } from "@/lib/models/life-profile";
import type { GeneratedSection } from "@/lib/profile/generate-sections";

const f = (
  key: string,
  dimension: string,
  value: string,
  salience: number,
  source: ILifeFacet["source"] = "inferred"
): ILifeFacet => ({ key, dimension, value, salience, source });

describe("mergeFacets (living brain)", () => {
  it("updates salience and keeps the stronger provenance on re-statement", () => {
    const existing = [f("a", "health", "chronic", 0.5, "inferred")];
    const incoming = [f("a", "health", "chronic", 0.9, "stated")];
    const merged = mergeFacets(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].salience).toBe(0.9);
    expect(merged[0].source).toBe("stated");
  });

  it("does not downgrade a stated source to inferred", () => {
    const existing = [f("a", "money", "tight", 0.6, "stated")];
    const incoming = [f("a", "money", "tight", 0.4, "inferred")];
    expect(mergeFacets(existing, incoming)[0].source).toBe("stated");
  });

  it("appends genuinely new facets", () => {
    const merged = mergeFacets([f("a", "health", "x", 0.5)], [f("b", "money", "y", 0.5)]);
    expect(merged.map((m) => m.key).sort()).toEqual(["a", "b"]);
  });

  it("counts distinct normalized dimensions", () => {
    expect(distinctDimensions([f("a", "Health", "x", 0.5), f("b", "health", "y", 0.5)])).toEqual(["health"]);
    expect(normalizeDimension("  Money ")).toBe("money");
  });
});

describe("isProfileSufficient", () => {
  const rich: ILifeFacet[] = [
    f("1", "livelihood", "rideshare", 0.9, "stated"),
    f("2", "mobility", "car-is-job", 0.8),
    f("3", "money", "cashflow", 0.6),
    f("4", "health", "back pain", 0.5),
    f("5", "big-arc", "escape fund", 0.7),
  ];

  it("is true for a broad, deep profile with a central facet", () => {
    expect(isProfileSufficient(rich)).toBe(true);
  });

  it("is false with too few facets", () => {
    expect(isProfileSufficient(rich.slice(0, 3))).toBe(false);
  });

  it("is false without enough distinct dimensions", () => {
    const narrow = [
      f("1", "health", "a", 0.9),
      f("2", "health", "b", 0.8),
      f("3", "health", "c", 0.7),
      f("4", "health", "d", 0.6),
      f("5", "health", "e", 0.9),
    ];
    expect(isProfileSufficient(narrow)).toBe(false);
  });

  it("is false when nothing is central enough", () => {
    const flat = rich.map((x) => ({ ...x, salience: 0.4 }));
    expect(isProfileSufficient(flat)).toBe(false);
  });
});

describe("buildTemplateDoc", () => {
  const section: GeneratedSection = {
    name: "  Trips & Earnings ",
    icon: "Car",
    description: "",
    viewType: "table",
    layoutHtml: "",
    fields: [
      { key: "gross", label: "Gross", type: "number" },
      {
        key: "net",
        label: "Net",
        type: "number",
        computation: { kind: "net", params: { add: ["gross"], subtract: ["fuel"] } },
      },
    ],
  };

  it("preserves computations and trims the name", () => {
    const doc = buildTemplateDoc(section, "user123", "trips-earnings");
    expect(doc.name).toBe("Trips & Earnings");
    expect(doc.createdBy).toBe("user123");
    expect(doc.isBuiltIn).toBe(false);
    const net = doc.fields.find((x) => x.key === "net");
    expect(net?.computation?.kind).toBe("net");
  });

  it("slugify normalizes names", () => {
    expect(slugify("My Cool Section!!")).toBe("my-cool-section");
  });
});

describe("vocabulary learn-back", () => {
  const facets = [f("1", "livelihood", "a", 0.9), f("2", "pigeon-racing", "b", 0.6)];

  it("records dimension counts", () => {
    const counts = recordDimensions({ livelihood: 3 }, facets);
    expect(counts.livelihood).toBe(4);
    expect(counts["pigeon-racing"]).toBe(1);
  });

  it("classifies known vs novel dimensions", () => {
    const known = ["livelihood", "mobility", "health"];
    expect(classifyDimension("Livelihood", known)).toBe("known");
    expect(classifyDimension("pigeon-racing", known)).toBe("novel");
    expect(novelDimensions(facets, known)).toEqual(["pigeon-racing"]);
  });
});

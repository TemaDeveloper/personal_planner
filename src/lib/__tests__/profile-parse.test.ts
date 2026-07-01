import { describe, it, expect } from "vitest";
import { parseFacets } from "@/lib/profile/facet-extract";
import { parseSections, facetSummary } from "@/lib/profile/generate-sections";
import type { ILifeFacet } from "@/lib/models/life-profile";

describe("parseFacets", () => {
  it("parses a fenced JSON object, applying defaults and generating keys", () => {
    const raw = '```json\n{"facets":[{"dimension":"livelihood","value":"per-trip rideshare income","salience":0.9,"source":"stated"}]}\n```';
    const facets = parseFacets(raw);
    expect(facets).toHaveLength(1);
    expect(facets[0].dimension).toBe("livelihood");
    expect(facets[0].salience).toBe(0.9);
    expect(facets[0].key).toBe("livelihood-per-trip-rideshare-income");
  });

  it("accepts a bare array and fills salience/source defaults", () => {
    const raw = '[{"dimension":"mobility","value":"cycles, no car"}]';
    const facets = parseFacets(raw);
    expect(facets[0].salience).toBe(0.5);
    expect(facets[0].source).toBe("inferred");
  });

  it("coerces a stringified salience number", () => {
    const raw = '{"facets":[{"dimension":"health","value":"ME/CFS","salience":"0.8"}]}';
    expect(parseFacets(raw)[0].salience).toBe(0.8);
  });

  it("throws when a facet is missing its dimension", () => {
    const raw = '{"facets":[{"value":"no dimension"}]}';
    expect(() => parseFacets(raw)).toThrow();
  });
});

describe("parseSections", () => {
  it("parses sections and preserves a ceiling computation", () => {
    const raw = `{"sections":[{
      "name":"Gentle Movement","icon":"Activity","description":"stay under the cap","viewType":"table",
      "fields":[
        {"key":"minutes","label":"Minutes","type":"number"},
        {"key":"daily_cap","label":"Daily cap","type":"number"},
        {"key":"headroom","label":"Headroom","type":"number","computation":{"kind":"ceiling","params":{"value":"minutes","cap":"daily_cap"}}}
      ]
    }]}`;
    const sections = parseSections(raw);
    expect(sections).toHaveLength(1);
    const computed = sections[0].fields.find((f) => f.computation);
    expect(computed?.computation?.kind).toBe("ceiling");
    expect(computed?.computation?.params).toEqual({ value: "minutes", cap: "daily_cap" });
  });

  it("applies section defaults (icon, viewType, layoutHtml)", () => {
    const raw = '{"sections":[{"name":"Trips","fields":[{"key":"gross","label":"Gross","type":"number"}]}]}';
    const s = parseSections(raw)[0];
    expect(s.icon).toBe("Star");
    expect(s.viewType).toBe("weekly-cards");
    expect(s.layoutHtml).toBe("");
  });

  it("accepts net and pace_eta computations", () => {
    const raw = `{"sections":[{"name":"X","fields":[
      {"key":"net","label":"Net","type":"number","computation":{"kind":"net","params":{"add":["gross"],"subtract":["fuel"]}}},
      {"key":"eta","label":"ETA","type":"number","computation":{"kind":"pace_eta","params":{"target":"goal","current":"saved","ratePerWeek":"rate"}}}
    ]}]}`;
    const kinds = parseSections(raw)[0].fields.map((f) => f.computation?.kind).filter(Boolean);
    expect(kinds).toEqual(["net", "pace_eta"]);
  });

  it("skips a section with an unknown computation kind instead of throwing", () => {
    const raw = '{"sections":[{"name":"X","fields":[{"key":"a","label":"A","type":"number","computation":{"kind":"bogus","params":{}}}]}]}';
    expect(parseSections(raw)).toEqual([]);
  });

  it("keeps valid sections and drops malformed ones", () => {
    const raw = '{"sections":[{"name":"Good","fields":[{"key":"a","label":"A","type":"number"}]},{"nope":true}]}';
    const out = parseSections(raw);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("Good");
  });
});

describe("facetSummary", () => {
  it("orders facets by salience, most central first", () => {
    const facets: ILifeFacet[] = [
      { key: "a", dimension: "money", value: "tight", salience: 0.4, source: "inferred" },
      { key: "b", dimension: "health", value: "chronic", salience: 0.95, source: "stated" },
    ];
    const summary = facetSummary(facets);
    expect(summary.indexOf("health")).toBeLessThan(summary.indexOf("money"));
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseSections } from "@/lib/profile/generate-sections";
import { resolveComputed } from "@/lib/compute/primitives";
import { formatComputed } from "@/lib/compute/format";
import type { ILifeFacet } from "@/lib/models/life-profile";

// The three M0 acceptance personas, as AI would return them. Fixtures keep the
// test deterministic; the live generation step is inherently non-deterministic.
const MARCUS = `{"sections":[{
  "name":"Trips & Earnings","icon":"Car","viewType":"table",
  "fields":[
    {"key":"gross","label":"Gross","type":"number"},
    {"key":"tips","label":"Tips","type":"number"},
    {"key":"fuel","label":"Fuel","type":"number"},
    {"key":"depreciation","label":"Depreciation","type":"number"},
    {"key":"net","label":"Net kept","type":"number","computation":{"kind":"net","params":{"add":["gross","tips"],"subtract":["fuel","depreciation"]}}}
  ]
}]}`;

const ELLA = `{"sections":[{
  "name":"House Fund","icon":"PiggyBank","viewType":"table",
  "fields":[
    {"key":"target","label":"Target","type":"number"},
    {"key":"saved","label":"Saved","type":"number"},
    {"key":"weekly","label":"Weekly rate","type":"number"},
    {"key":"eta","label":"On track for","type":"number","computation":{"kind":"pace_eta","params":{"target":"target","current":"saved","ratePerWeek":"weekly","from":"start"}}}
  ]
}]}`;

const GRACE = `{"sections":[{
  "name":"Gentle Movement","icon":"Activity","viewType":"table",
  "fields":[
    {"key":"minutes","label":"Minutes","type":"number"},
    {"key":"daily_cap","label":"Daily cap","type":"number"},
    {"key":"headroom","label":"Headroom","type":"number","computation":{"kind":"ceiling","params":{"value":"minutes","cap":"daily_cap"}}}
  ]
}]}`;

describe("M0 acceptance — three lives, three different computations", () => {
  it("Marcus: net = gross + tips - fuel - depreciation", () => {
    const section = parseSections(MARCUS)[0];
    const field = section.fields.find((f) => f.computation)!;
    expect(field.computation!.kind).toBe("net");
    const cv = resolveComputed(field.computation!, {
      gross: 120,
      tips: 20,
      fuel: 10,
      depreciation: 5,
    });
    expect(cv).toEqual({ kind: "net", value: 125 });
  });

  it("Ella: savings ETA projected from weekly pace", () => {
    const section = parseSections(ELLA)[0];
    const field = section.fields.find((f) => f.computation)!;
    expect(field.computation!.kind).toBe("pace_eta");
    const cv = resolveComputed(field.computation!, {
      target: 8000,
      saved: 5000,
      weekly: 250,
      start: "2026-07-01T00:00:00.000Z",
    });
    if (cv?.kind === "pace_eta") {
      expect(cv.value.weeksRemaining).toBe(12);
      expect(formatComputed(cv).text).toBe("12 wk → 2026-09-23");
    } else {
      throw new Error("expected pace_eta");
    }
  });

  it("Grace: movement is a ceiling to stay under, and warns when exceeded", () => {
    const section = parseSections(GRACE)[0];
    const field = section.fields.find((f) => f.computation)!;
    expect(field.computation!.kind).toBe("ceiling");
    const over = resolveComputed(field.computation!, { minutes: 15, daily_cap: 12 })!;
    expect(formatComputed(over)).toEqual({ text: "Over by 3", warn: true });
    const under = resolveComputed(field.computation!, { minutes: 8, daily_cap: 12 })!;
    expect(formatComputed(under).warn).toBe(false);
  });

  it("the three lives produce three genuinely different computation kinds", () => {
    const kindsOf = (raw: string) =>
      parseSections(raw)[0].fields.map((f) => f.computation?.kind).filter(Boolean);
    const marcus = kindsOf(MARCUS);
    const ella = kindsOf(ELLA);
    const grace = kindsOf(GRACE);
    expect(new Set([...marcus, ...ella, ...grace])).toEqual(
      new Set(["net", "pace_eta", "ceiling"])
    );
  });
});

describe("generateSectionsFromFacets wrapper", () => {
  beforeEach(() => vi.resetModules());

  it("calls the AI and returns parsed, validated sections", async () => {
    vi.doMock("@/lib/ai", () => ({ callAI: vi.fn().mockResolvedValue(MARCUS) }));
    const { generateSectionsFromFacets: gen } = await import("@/lib/profile/generate-sections");
    const facets: ILifeFacet[] = [
      { key: "l", dimension: "livelihood", value: "rideshare", salience: 0.9, source: "stated" },
    ];
    const sections = await gen(facets, "mistral", "test-key");
    expect(sections[0].name).toBe("Trips & Earnings");
    vi.doUnmock("@/lib/ai");
  });
});

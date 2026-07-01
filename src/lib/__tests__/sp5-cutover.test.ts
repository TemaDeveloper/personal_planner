import { describe, it, expect } from "vitest";
import { parseSections, pickSourceFacetKey } from "@/lib/profile/generate-sections";
import { buildTemplateDoc } from "@/lib/profile/persist-sections";
import {
  buildMigrationInserts,
  migrationMarker,
  MIGRATION_MARKER,
} from "@/lib/profile/migrate-run";
import {
  transformWork,
  transformShopping,
  transformMealprep,
  transformHabits,
  transformStudy,
  type OutRow,
} from "@/lib/profile/migrate-sources";
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

const NOW = new Date("2026-07-01T00:00:00.000Z");

describe("SP-5d migration kernel + transforms", () => {
  it("stamps an idempotency marker and preserves mapped data", () => {
    const rows = transformWork(
      [
        { _id: "a1", jobName: "Wuzzals", hours: 8, date: "2026-05-20T00:00:00.000Z" },
        { _id: "a2", jobName: "Advapay", hours: 5, date: "2026-05-21T00:00:00.000Z" },
      ],
      NOW
    );
    const inserts = buildMigrationInserts("work", "tpl1", rows, new Set());
    expect(inserts).toHaveLength(2);
    expect(inserts[0].templateId).toBe("tpl1");
    expect(inserts[0].data.job).toBe("Wuzzals");
    expect(inserts[0].data.hours).toBe(8);
    expect(inserts[0].data[MIGRATION_MARKER]).toBe(migrationMarker("work", "a1"));
  });

  it("is idempotent — skips rows already migrated", () => {
    const rows: OutRow[] = [{ srcKey: "a1", date: NOW.toISOString(), data: { job: "X" } }];
    const seen = new Set([migrationMarker("work", "a1")]);
    expect(buildMigrationInserts("work", "tpl1", rows, seen)).toHaveLength(0);
  });

  it("explodes nested shopping items into one row per item with unique srcKeys", () => {
    const rows = transformShopping(
      [
        {
          _id: "L1",
          name: "Groceries",
          createdAt: "2026-06-01T00:00:00.000Z",
          items: [
            { name: "Milk", quantity: 2, checked: false },
            { name: "Eggs", quantity: 1, checked: true },
          ],
        },
      ],
      NOW
    );
    expect(rows.map((r) => r.srcKey)).toEqual(["L1:0", "L1:1"]);
    expect(rows[0].data).toEqual({ item: "Milk", qty: 2, bought: false, list: "Groceries" });
    expect(rows[1].data).toMatchObject({ item: "Eggs", qty: 1, bought: true });
  });

  it("maps meal-plan meals with day-of-week names", () => {
    const rows = transformMealprep(
      [{ _id: "P1", date: "2026-06-01", dayOfWeek: 3, meals: [{ type: "lunch", name: "Soup" }] }],
      NOW
    );
    expect(rows[0].data).toMatchObject({ meal: "Soup", day: "Wed", type: "lunch" });
  });

  it("joins habit logs to their habit name", () => {
    const names = new Map([["h1", "Meditate"]]);
    const rows = transformHabits([{ _id: "l1", habitId: "h1", date: "2026-06-01" }], names, NOW);
    expect(rows[0].data).toEqual({ habit: "Meditate", done: true });
  });

  it("unifies study's three sources into one stream with prefixed srcKeys", () => {
    const rows = transformStudy(
      {
        academic: [{ _id: "a", type: "test", subject: "Math", title: "Midterm", grade: 88, dueDate: "2026-06-01" }],
        sessions: [{ _id: "s", subject: "Math", minutes: 45, date: "2026-06-02" }],
        homework: [{ _id: "h", subject: "CS", title: "PS1", completed: true, dueDate: "2026-06-03" }],
      },
      NOW
    );
    expect(rows.map((r) => r.srcKey)).toEqual(["ai:a", "ss:s", "hw:h"]);
    expect(rows[1].data).toMatchObject({ item_type: "session", minutes: 45 });
  });
});

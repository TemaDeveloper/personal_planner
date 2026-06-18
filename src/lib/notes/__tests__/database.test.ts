import { describe, it, expect } from "vitest";
import {
  buildDefaultDatabase, groupRowsByProperty, formatCellText, optionColor,
  isSelectType, genId, OPTION_COLOR_KEYS, colorForLabel, computeRollup, relatedRowsFor,
} from "@/lib/notes/database";
import type { DBProperty, DBRow } from "@/lib/models/notes-database";

describe("buildDefaultDatabase", () => {
  it("creates Name(title) + Status + Date and one Table view", () => {
    const db = buildDefaultDatabase();
    expect(db.properties[0].type).toBe("title");
    expect(db.properties.map((p) => p.name)).toEqual(["Name", "Status", "Date"]);
    expect(db.properties[1].options).toHaveLength(3);
    expect(db.views).toHaveLength(1);
    expect(db.views[0].type).toBe("table");
    expect(db.rows).toEqual([]);
  });
  it("gives unique ids to properties and options", () => {
    const db = buildDefaultDatabase();
    const ids = db.properties.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("genId", () => {
  it("is prefixed and stable for a seed", () => {
    expect(genId("p", 5).startsWith("p_")).toBe(true);
    expect(genId("p", 5)).toBe(genId("p", 5));
    expect(genId("p", 5)).not.toBe(genId("p", 6));
  });
});

describe("optionColor / isSelectType", () => {
  it("falls back to default for unknown colors", () => {
    expect(optionColor("chartreuse")).toEqual(optionColor("default"));
    expect(OPTION_COLOR_KEYS).toContain("blue");
  });
  it("assigns a stable non-default color per label", () => {
    const c = colorForLabel("Marketing");
    expect(c).toBe(colorForLabel("Marketing"));
    expect(c).not.toBe("default");
    expect(c).not.toBe("gray");
    expect(OPTION_COLOR_KEYS).toContain(c);
  });
  it("classifies select-like types", () => {
    expect(isSelectType("select")).toBe(true);
    expect(isSelectType("status")).toBe(true);
    expect(isSelectType("multi_select")).toBe(true);
    expect(isSelectType("text")).toBe(false);
  });
});

describe("groupRowsByProperty", () => {
  const status: DBProperty = {
    id: "s", name: "Status", type: "status",
    options: [
      { id: "o1", label: "To Do", color: "gray" },
      { id: "o2", label: "Done", color: "green" },
    ],
  };
  const rows: DBRow[] = [
    { id: "r1", cells: { s: "To Do" } },
    { id: "r2", cells: { s: "Done" } },
    { id: "r3", cells: { s: "Done" } },
    { id: "r4", cells: {} },
  ];
  it("groups rows by each option, plus an empty group", () => {
    const g = groupRowsByProperty(rows, status);
    expect(g.map((x) => x.label)).toEqual(["To Do", "Done", "No Status"]);
    expect(g[1].rows).toHaveLength(2);
    expect(g[2].rows).toHaveLength(1);
  });
  it("returns a single group for non-select properties", () => {
    const g = groupRowsByProperty(rows, { id: "t", name: "T", type: "text" });
    expect(g).toHaveLength(1);
    expect(g[0].rows).toHaveLength(4);
  });
});

describe("relatedRowsFor", () => {
  const target: DBRow[] = [
    { id: "a", cells: { done: true } },
    { id: "b", cells: { done: false } },
    { id: "c", cells: { done: true } },
  ];
  it("resolves the referenced ids, ignoring unknowns", () => {
    expect(relatedRowsFor(["a", "c", "zzz"], target).map((r) => r.id)).toEqual(["a", "c"]);
    expect(relatedRowsFor(undefined, target)).toEqual([]);
  });
});

describe("computeRollup", () => {
  const related: DBRow[] = [
    { id: "a", cells: { done: true, n: 2 } },
    { id: "b", cells: { done: false, n: 3 } },
    { id: "c", cells: { done: true, n: 5 } },
  ];
  it("counts related rows", () => {
    expect(computeRollup({ id: "r", name: "R", type: "rollup", rollupFn: "count" }, related)).toEqual({ value: 3, isPercent: false });
  });
  it("sums a numeric target", () => {
    expect(computeRollup({ id: "r", name: "R", type: "rollup", rollupFn: "sum", rollupTarget: "n" }, related)).toEqual({ value: 10, isPercent: false });
  });
  it("computes percent checked (0..1)", () => {
    const r = computeRollup({ id: "r", name: "R", type: "rollup", rollupFn: "percent_checked", rollupTarget: "done" }, related);
    expect(r.isPercent).toBe(true);
    expect(r.value).toBeCloseTo(2 / 3);
  });
  it("is 0 percent for no related rows", () => {
    expect(computeRollup({ id: "r", name: "R", type: "rollup", rollupFn: "percent_checked", rollupTarget: "done" }, [])).toEqual({ value: 0, isPercent: true });
  });
});

describe("formatCellText", () => {
  it("formats by type", () => {
    expect(formatCellText({ id: "c", name: "Done", type: "checkbox" }, true)).toBe("✓");
    expect(formatCellText({ id: "m", name: "Tags", type: "multi_select" }, ["a", "b"])).toBe("a, b");
    expect(formatCellText({ id: "d", name: "When", type: "date" }, "2026-06-18T10:00:00Z")).toBe("2026-06-18");
    expect(formatCellText({ id: "t", name: "T", type: "text" }, "")).toBe("");
  });
});

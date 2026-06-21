import { describe, it, expect } from "vitest";
import {
  buildDefaultDatabase, groupRowsByProperty, formatCellText, optionColor,
  isSelectType, genId, OPTION_COLOR_KEYS, colorForLabel, computeRollup, relatedRowsFor, filterRows,
  migrateCellValue, migrateRowsForTypeChange, applySorts, applyFilters, reorderRows,
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
  it("is prefixed and unique across calls (even with the same seed)", () => {
    expect(genId("p", 5).startsWith("p_")).toBe(true);
    // Must be unique across databases that happen to share a seed.
    const ids = new Set(Array.from({ length: 200 }, () => genId("p", 5)));
    expect(ids.size).toBe(200);
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
  it("places multi_select rows in every matching group", () => {
    const ms: DBProperty = {
      id: "m", name: "Tags", type: "multi_select",
      options: [
        { id: "a", label: "A", color: "blue" },
        { id: "b", label: "B", color: "green" },
      ],
    };
    const rs: DBRow[] = [
      { id: "1", cells: { m: ["A", "B"] } },
      { id: "2", cells: { m: ["B"] } },
      { id: "3", cells: { m: ["gone"] } }, // option removed → Empty
    ];
    const g = groupRowsByProperty(rs, ms);
    expect(g[0].label).toBe("A"); expect(g[0].rows.map((r) => r.id)).toEqual(["1"]);
    expect(g[1].label).toBe("B"); expect(g[1].rows.map((r) => r.id)).toEqual(["1", "2"]);
    expect(g[2].rows.map((r) => r.id)).toEqual(["3"]); // empty group
  });
});

describe("migrateCellValue / migrateRowsForTypeChange", () => {
  it("wraps to array for multi_select and unwraps from it", () => {
    expect(migrateCellValue("text", "multi_select", "x")).toEqual(["x"]);
    expect(migrateCellValue("multi_select", "select", ["a", "b"])).toBe("a");
  });
  it("coerces number and checkbox, clears bad number", () => {
    expect(migrateCellValue("text", "number", "42")).toBe(42);
    expect(migrateCellValue("text", "number", "nope")).toBeUndefined();
    expect(migrateCellValue("text", "checkbox", "x")).toBe(true);
  });
  it("clears rollup (computed) and keeps same-type values", () => {
    expect(migrateCellValue("number", "rollup", 5)).toBeUndefined();
    expect(migrateCellValue("text", "text", "keep")).toBe("keep");
  });
  it("migrates all rows and deletes cleared cells", () => {
    const rs: DBRow[] = [
      { id: "1", cells: { c: "5", other: "x" } },
      { id: "2", cells: { c: "bad" } },
    ];
    const out = migrateRowsForTypeChange(rs, "c", "text", "number");
    expect(out[0].cells.c).toBe(5);
    expect(out[0].cells.other).toBe("x");
    expect("c" in out[1].cells).toBe(false); // "bad" → cleared
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

describe("filterRows", () => {
  const rows = [
    { id: "1", cells: { t: "Ship the feature", tags: ["urgent", "backend"] } },
    { id: "2", cells: { t: "Plan sprint", tags: ["planning"] } },
    { id: "3", cells: { t: "Review PRs" } },
  ];
  it("returns all rows for empty query", () => {
    expect(filterRows(rows, "  ")).toHaveLength(3);
  });
  it("matches across text and array cells, case-insensitively", () => {
    expect(filterRows(rows, "ship").map((r) => r.id)).toEqual(["1"]);
    expect(filterRows(rows, "BACKEND").map((r) => r.id)).toEqual(["1"]);
    expect(filterRows(rows, "plan").map((r) => r.id)).toEqual(["2"]);
  });
  it("returns empty when nothing matches", () => {
    expect(filterRows(rows, "zzz")).toEqual([]);
  });
});

describe("applySorts", () => {
  const props: DBProperty[] = [
    { id: "t", name: "Name", type: "title" },
    { id: "n", name: "Pri", type: "number" },
  ];
  const rows: DBRow[] = [
    { id: "1", cells: { t: "Banana", n: 2 } },
    { id: "2", cells: { t: "apple", n: 10 } },
    { id: "3", cells: { t: "Cherry", n: 2 } },
    { id: "4", cells: { t: "Date" } }, // empty n
  ];
  it("returns input unchanged with no sorts", () => {
    expect(applySorts(rows, undefined, props)).toBe(rows);
  });
  it("sorts numbers numerically and empties last; stable within ties", () => {
    const out = applySorts(rows, [{ prop: "n", dir: "asc" }], props);
    expect(out.map((r) => r.id)).toEqual(["1", "3", "2", "4"]); // 2,2,10,empty
  });
  it("sorts descending", () => {
    const out = applySorts(rows, [{ prop: "n", dir: "desc" }], props);
    expect(out.map((r) => r.id)).toEqual(["2", "1", "3", "4"]); // 10,2,2,empty
  });
  it("sorts text case-insensitively via localeCompare", () => {
    const out = applySorts(rows, [{ prop: "t", dir: "asc" }], props);
    expect(out.map((r) => r.cells.t)).toEqual(["apple", "Banana", "Cherry", "Date"]);
  });
});

describe("applyFilters", () => {
  const rows: DBRow[] = [
    { id: "1", cells: { s: "Done", tags: ["urgent", "backend"] } },
    { id: "2", cells: { s: "To Do", tags: ["planning"] } },
    { id: "3", cells: { s: "Done" } },
  ];
  it("returns all rows with no filters", () => {
    expect(applyFilters(rows, [])).toHaveLength(3);
    expect(applyFilters(rows, undefined)).toHaveLength(3);
  });
  it("is / is_not match exact (case-insensitive)", () => {
    expect(applyFilters(rows, [{ prop: "s", op: "is", value: "done" }]).map((r) => r.id)).toEqual(["1", "3"]);
    expect(applyFilters(rows, [{ prop: "s", op: "is_not", value: "Done" }]).map((r) => r.id)).toEqual(["2"]);
  });
  it("contains matches any array element", () => {
    expect(applyFilters(rows, [{ prop: "tags", op: "contains", value: "back" }]).map((r) => r.id)).toEqual(["1"]);
  });
  it("is_empty / is_not_empty test presence", () => {
    expect(applyFilters(rows, [{ prop: "tags", op: "is_empty" }]).map((r) => r.id)).toEqual(["3"]);
    expect(applyFilters(rows, [{ prop: "tags", op: "is_not_empty" }]).map((r) => r.id)).toEqual(["1", "2"]);
  });
  it("ANDs multiple filters", () => {
    const out = applyFilters(rows, [
      { prop: "s", op: "is", value: "Done" },
      { prop: "tags", op: "is_not_empty" },
    ]);
    expect(out.map((r) => r.id)).toEqual(["1"]);
  });
});

describe("reorderRows", () => {
  const rows: DBRow[] = ["a", "b", "c", "d"].map((id) => ({ id, cells: {} }));
  it("moves a row to before the target (downward)", () => {
    expect(reorderRows(rows, "a", "c").map((r) => r.id)).toEqual(["b", "a", "c", "d"]);
  });
  it("moves a row upward", () => {
    expect(reorderRows(rows, "d", "b").map((r) => r.id)).toEqual(["a", "d", "b", "c"]);
  });
  it("is a no-op for same id or missing ids", () => {
    expect(reorderRows(rows, "a", "a")).toBe(rows);
    expect(reorderRows(rows, "z", "b")).toBe(rows);
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

import type { DBProperty, DBRow, DBView, PropertyType, RollupFn } from "@/lib/models/notes-database";

/** Notion's option color palette → chip background + text (light mode).
 * Functional color tokens used to render select/status chips. */
export const NOTION_OPTION_COLORS: Record<string, { bg: string; text: string }> = {
  default: { bg: "#E3E2E0", text: "#37352F" },
  gray: { bg: "#E3E2E0", text: "#37352F" },
  brown: { bg: "#EEE0DA", text: "#4A3228" },
  orange: { bg: "#FADEC9", text: "#5C3B23" },
  yellow: { bg: "#FDECC8", text: "#594A1F" },
  green: { bg: "#DBEDDB", text: "#1C3829" },
  blue: { bg: "#D3E5EF", text: "#183347" },
  purple: { bg: "#E8DEEE", text: "#412454" },
  pink: { bg: "#F5E0E9", text: "#4C2337" },
  red: { bg: "#FFE2DD", text: "#5D1715" },
};
export const OPTION_COLOR_KEYS = Object.keys(NOTION_OPTION_COLORS);

export function optionColor(key: string | undefined) {
  return NOTION_OPTION_COLORS[key ?? "default"] ?? NOTION_OPTION_COLORS.default;
}

/** Deterministically assign a (non-default) palette color to a new option label. */
export function colorForLabel(label: string): string {
  const palette = OPTION_COLOR_KEYS.filter((k) => k !== "default" && k !== "gray");
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

/** Unique id for schema/rows (no crypto needed). The seed keeps ids readable
 * and ordered within one buildDefaultDatabase call; a random suffix guarantees
 * uniqueness ACROSS databases, so e.g. a rollup target id from one database
 * can't accidentally match a property in another. */
export function genId(prefix: string, seed: number): string {
  return `${prefix}_${seed.toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  title: "Title",
  text: "Text",
  number: "Number",
  select: "Select",
  multi_select: "Multi-select",
  status: "Status",
  date: "Date",
  checkbox: "Checkbox",
  url: "URL",
  relation: "Relation",
  rollup: "Rollup",
};

export function isSelectType(t: PropertyType): boolean {
  return t === "select" || t === "multi_select" || t === "status";
}

/** A fresh Notion-like database: Name (title), Status, Date, plus a Table view. */
export function buildDefaultDatabase(seed = 1): { properties: DBProperty[]; views: DBView[]; rows: DBRow[] } {
  const titleId = genId("p", seed);
  const statusId = genId("p", seed + 1);
  const dateId = genId("p", seed + 2);
  const status: DBProperty = {
    id: statusId,
    name: "Status",
    type: "status",
    options: [
      { id: genId("o", seed + 10), label: "To Do", color: "gray" },
      { id: genId("o", seed + 11), label: "In Progress", color: "blue" },
      { id: genId("o", seed + 12), label: "Done", color: "green" },
    ],
  };
  return {
    properties: [
      { id: titleId, name: "Name", type: "title" },
      status,
      { id: dateId, name: "Date", type: "date" },
    ],
    views: [{ id: genId("v", seed), name: "Table", type: "table" }],
    rows: [],
  };
}

/** Group rows by a select/status property's option (for board view).
 * Returns ordered groups including an "Empty" group for unset cells. */
export function groupRowsByProperty(
  rows: DBRow[],
  prop: DBProperty | undefined
): { key: string; label: string; color: string; rows: DBRow[] }[] {
  if (!prop || !isSelectType(prop.type)) return [{ key: "all", label: "All", color: "default", rows }];
  const groups = new Map<string, DBRow[]>();
  for (const opt of prop.options ?? []) groups.set(opt.label, []);
  groups.set("__empty__", []);
  for (const row of rows) {
    const v = row.cells[prop.id];
    // multi_select: a row belongs to EVERY one of its values' groups (Notion
    // shows a multi-value card in each matching column). Single select/status
    // has one value. Values with no matching option fall through to Empty.
    const labels = Array.isArray(v) ? (v as string[]) : v ? [v as string] : [];
    const matched = labels.filter((l) => groups.has(l));
    if (matched.length) for (const l of matched) groups.get(l)!.push(row);
    else groups.get("__empty__")!.push(row);
  }
  const out: { key: string; label: string; color: string; rows: DBRow[] }[] = [];
  for (const opt of prop.options ?? []) {
    out.push({ key: opt.id, label: opt.label, color: opt.color, rows: groups.get(opt.label) ?? [] });
  }
  const empty = groups.get("__empty__") ?? [];
  if (empty.length) out.push({ key: "__empty__", label: "No " + prop.name, color: "default", rows: empty });
  return out;
}

/** Aggregate a rollup for one row over its related rows.
 * `relatedRows` are the rows of the target database referenced by the relation cell. */
export function computeRollup(
  prop: DBProperty,
  relatedRows: DBRow[]
): { value: number; isPercent: boolean } {
  const fn: RollupFn = prop.rollupFn ?? "count";
  const target = prop.rollupTarget;
  if (fn === "count") return { value: relatedRows.length, isPercent: false };
  if (fn === "sum") {
    const sum = relatedRows.reduce((acc, r) => acc + (Number(target && r.cells[target]) || 0), 0);
    return { value: sum, isPercent: false };
  }
  // percent_checked → fraction of related rows whose target cell is truthy (0..1)
  if (!relatedRows.length || !target) return { value: 0, isPercent: true };
  const checked = relatedRows.filter((r) => !!r.cells[target]).length;
  return { value: checked / relatedRows.length, isPercent: true };
}

/** Resolve the related rows referenced by a relation cell value (array of row ids). */
export function relatedRowsFor(cellValue: unknown, targetRows: DBRow[]): DBRow[] {
  const ids = Array.isArray(cellValue) ? (cellValue as string[]) : [];
  if (!ids.length) return [];
  const byId = new Map(targetRows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter((r): r is DBRow => !!r);
}

/** Convert one cell value when a column's type changes, so the stored shape
 * stays valid for the new type (e.g. text→multi_select must become an array).
 * Returns the new value, or undefined to clear the cell. */
export function migrateCellValue(from: PropertyType, to: PropertyType, value: unknown): unknown {
  if (from === to || value == null || value === "") return value;
  switch (to) {
    case "multi_select":
      return Array.isArray(value) ? value : [String(value)];
    case "select":
    case "status":
      return Array.isArray(value) ? (value[0] != null ? String(value[0]) : undefined) : String(value);
    case "number": {
      const n = Number(Array.isArray(value) ? value[0] : value);
      return Number.isFinite(n) ? n : undefined;
    }
    case "checkbox":
      return !!value && value !== "false" && value !== 0;
    case "text":
    case "url":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "relation":
      return Array.isArray(value) ? value : undefined; // relation holds row ids; otherwise clear
    case "rollup":
      return undefined; // computed, never stored
    default:
      return value;
  }
}

/** Apply migrateCellValue to every row for a changed property. Pure. */
export function migrateRowsForTypeChange(
  rows: DBRow[], propId: string, from: PropertyType, to: PropertyType
): DBRow[] {
  if (from === to) return rows;
  return rows.map((r) => {
    if (!(propId in r.cells)) return r;
    const next = migrateCellValue(from, to, r.cells[propId]);
    const cells = { ...r.cells };
    if (next === undefined) delete cells[propId];
    else cells[propId] = next;
    return { ...r, cells };
  });
}

/** Filter rows by a free-text query across all cell values (in-view search). */
export function filterRows(rows: DBRow[], query: string): DBRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) =>
    Object.values(r.cells).some((v) => {
      if (v == null) return false;
      const s = Array.isArray(v) ? v.join(" ") : String(v);
      return s.toLowerCase().includes(q);
    })
  );
}

/** Human-readable cell text for plain rendering (list/exports). */
export function formatCellText(prop: DBProperty, value: unknown): string {
  if (value == null || value === "") return "";
  switch (prop.type) {
    case "checkbox": return value ? "✓" : "";
    case "multi_select": return Array.isArray(value) ? value.join(", ") : String(value);
    case "date": return String(value).slice(0, 10);
    default: return String(value);
  }
}

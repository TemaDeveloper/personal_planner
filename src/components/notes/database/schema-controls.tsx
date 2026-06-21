"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, ChevronDown, Trash2, Table2, Columns3, List as ListIcon, LayoutGrid, CalendarDays, ArrowUpDown, Filter, X, Eye, EyeOff, SlidersHorizontal } from "lucide-react";
import type { DBFilter, DBProperty, DBSort, FilterOp, PropertyType, RollupFn, ViewType } from "@/lib/models/notes-database";
import { PROPERTY_TYPE_LABELS } from "@/lib/notes/database";

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return { open, setOpen, ref };
}

const popoverStyle = { background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 8px 24px rgba(0,0,0,.14)" } as const;

const VIEW_TYPES: { type: ViewType; label: string; icon: React.ReactNode }[] = [
  { type: "table", label: "Table", icon: <Table2 size={14} /> },
  { type: "board", label: "Board", icon: <Columns3 size={14} /> },
  { type: "gallery", label: "Gallery", icon: <LayoutGrid size={14} /> },
  { type: "list", label: "List", icon: <ListIcon size={14} /> },
  { type: "calendar", label: "Calendar", icon: <CalendarDays size={14} /> },
];

/** "+" after the view tabs: add a new saved view of a chosen type. */
export function AddViewButton({ onAdd }: { onAdd: (type: ViewType) => void }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-label="Add view" onClick={() => setOpen((o) => !o)}
        className="px-1.5 py-1.5 flex items-center" style={{ color: "var(--text-faint)" }}>
        <Plus size={14} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 p-1 rounded-lg border min-w-[150px] animate-[notesPop_120ms_ease-out]" style={popoverStyle}>
          {VIEW_TYPES.map((v) => (
            <button key={v.type} type="button" onClick={() => { onAdd(v.type); setOpen(false); }}
              className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded text-[13px] hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-primary)" }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const FILTER_OPS: { op: FilterOp; label: string; needsValue: boolean }[] = [
  { op: "is", label: "Is", needsValue: true },
  { op: "is_not", label: "Is not", needsValue: true },
  { op: "contains", label: "Contains", needsValue: true },
  { op: "is_empty", label: "Is empty", needsValue: false },
  { op: "is_not_empty", label: "Is not empty", needsValue: false },
];

/** Filter control: add/edit/remove a list of AND filters for the active view. */
export function FilterControl({ properties, filters, onChange }: {
  properties: DBProperty[]; filters: DBFilter[]; onChange: (f: DBFilter[]) => void;
}) {
  const { open, setOpen, ref } = usePopover();
  const filterable = properties.filter((p) => p.type !== "rollup" && p.type !== "image" && p.type !== "relation");
  const set = (i: number, patch: Partial<DBFilter>) => onChange(filters.map((f, j) => j === i ? { ...f, ...patch } : f));
  const add = () => filterable[0] && onChange([...filters, { prop: filterable[0].id, op: "is", value: "" }]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-label="Filter" onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-md hover:bg-[var(--surface-raised)]"
        style={{ color: filters.length ? "var(--accent-color)" : "var(--text-muted)" }}>
        <Filter size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 p-2 rounded-lg border min-w-[280px] animate-[notesPop_120ms_ease-out]" style={popoverStyle}>
          {filters.length === 0 && <div className="px-1 pb-2 text-[12px]" style={{ color: "var(--text-faint)" }}>No filters yet.</div>}
          {filters.map((f, i) => {
            const op = FILTER_OPS.find((o) => o.op === f.op);
            return (
              <div key={i} className="flex items-center gap-1 mb-1">
                <select value={f.prop} onChange={(e) => set(i, { prop: e.target.value })}
                  className="px-1 py-1 text-[12px] rounded border outline-none" style={selectStyle}>
                  {filterable.map((p) => <option key={p.id} value={p.id}>{p.name || "Untitled"}</option>)}
                </select>
                <select value={f.op} onChange={(e) => set(i, { op: e.target.value as FilterOp })}
                  className="px-1 py-1 text-[12px] rounded border outline-none" style={selectStyle}>
                  {FILTER_OPS.map((o) => <option key={o.op} value={o.op}>{o.label}</option>)}
                </select>
                {op?.needsValue && (
                  <input value={f.value ?? ""} onChange={(e) => set(i, { value: e.target.value })} placeholder="value"
                    className="w-20 px-1 py-1 text-[12px] rounded border outline-none" style={selectStyle} />
                )}
                <button type="button" aria-label="Remove filter" onClick={() => onChange(filters.filter((_, j) => j !== i))}
                  style={{ color: "var(--text-faint)" }}><X size={13} /></button>
              </div>
            );
          })}
          <button type="button" onClick={add} className="flex items-center gap-1 px-1 py-1 text-[12px]" style={{ color: "var(--text-muted)" }}>
            <Plus size={13} /> Add filter
          </button>
        </div>
      )}
    </div>
  );
}

/** Properties control: toggle which properties are visible in the active view.
 * The title property is always visible (can't be hidden). */
export function PropertiesControl({ properties, hidden, onToggle }: {
  properties: DBProperty[]; hidden: string[]; onToggle: (propId: string, hide: boolean) => void;
}) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-label="Properties" onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-md hover:bg-[var(--surface-raised)]"
        style={{ color: hidden.length ? "var(--accent-color)" : "var(--text-muted)" }}>
        <SlidersHorizontal size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 p-1 rounded-lg border min-w-[200px] animate-[notesPop_120ms_ease-out]" style={popoverStyle}>
          <div className="px-2 py-1 text-[11px] uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Properties</div>
          {properties.map((p) => {
            const isHidden = hidden.includes(p.id);
            const isTitle = p.type === "title";
            return (
              <button key={p.id} type="button" disabled={isTitle}
                onClick={() => onToggle(p.id, !isHidden)}
                className="flex items-center justify-between gap-2 w-full text-left px-2 py-1 rounded text-[13px] hover:bg-[var(--surface-raised)] disabled:opacity-60"
                style={{ color: "var(--text-primary)" }}>
                <span className="truncate">{p.name || "Untitled"}</span>
                {isTitle ? <Eye size={14} style={{ color: "var(--text-faint)" }} />
                  : isHidden ? <EyeOff size={14} style={{ color: "var(--text-faint)" }} />
                  : <Eye size={14} style={{ color: "var(--text-muted)" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Sort control: pick a property + direction for the active view (single key). */
export function SortControl({ properties, sort, onSet }: {
  properties: DBProperty[]; sort?: DBSort; onSet: (propId: string, dir: "asc" | "desc" | null) => void;
}) {
  const { open, setOpen, ref } = usePopover();
  const sortable = properties.filter((p) => p.type !== "rollup" && p.type !== "image" && p.type !== "relation");
  const active = !!sort;
  return (
    <div className="relative" ref={ref}>
      <button type="button" aria-label="Sort" onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-md hover:bg-[var(--surface-raised)] flex items-center gap-1"
        style={{ color: active ? "var(--accent-color)" : "var(--text-muted)" }}>
        <ArrowUpDown size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 p-1 rounded-lg border min-w-[180px] animate-[notesPop_120ms_ease-out]" style={popoverStyle}>
          <div className="px-2 py-1 text-[11px] uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Sort by</div>
          <select value={sort?.prop ?? ""} onChange={(e) => onSet(e.target.value, e.target.value ? (sort?.dir ?? "asc") : null)}
            className="w-full mx-1 mb-1 px-1.5 py-1 text-[13px] rounded border outline-none" style={selectStyle}>
            <option value="">None</option>
            {sortable.map((p) => <option key={p.id} value={p.id}>{p.name || "Untitled"}</option>)}
          </select>
          {sort && (
            <div className="flex gap-1 px-1 pb-1">
              {(["asc", "desc"] as const).map((d) => (
                <button key={d} type="button" onClick={() => onSet(sort.prop, d)}
                  className="flex-1 px-2 py-1 rounded text-[12px]"
                  style={{ background: sort.dir === d ? "var(--surface-raised)" : "transparent", color: "var(--text-primary)", fontWeight: sort.dir === d ? 600 : 400 }}>
                  {d === "asc" ? "Ascending" : "Descending"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const TYPES: PropertyType[] = ["text", "number", "select", "multi_select", "status", "date", "checkbox", "url", "image", "relation", "rollup"];
const ROLLUP_FNS: { fn: RollupFn; label: string }[] = [
  { fn: "count", label: "Count" }, { fn: "percent_checked", label: "Percent checked" }, { fn: "sum", label: "Sum" },
];
const selectStyle = { background: "var(--surface-raised)", color: "var(--text-primary)", borderColor: "var(--border-subtle)" } as const;

/** Per-column caret menu: change property type, configure relation/rollup, or delete the column. */
export function ColumnMenu({ prop, properties, onChangeType, onConfig, onDelete }: {
  prop: DBProperty; properties: DBProperty[];
  onChangeType: (t: PropertyType) => void; onConfig: (patch: Partial<DBProperty>) => void; onDelete: () => void;
}) {
  const { open, setOpen, ref } = usePopover();
  const [dbs, setDbs] = useState<{ id: string; title: string }[]>([]);
  useEffect(() => {
    if (!open || prop.type !== "relation") return;
    fetch("/api/notes/databases").then((r) => r.ok ? r.json() : { databases: [] }).then((d) => setDbs(d.databases));
  }, [open, prop.type]);

  const relationProps = properties.filter((p) => p.type === "relation");

  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" aria-label="Column options" onClick={() => setOpen((o) => !o)}
        className="px-0.5 opacity-50 hover:opacity-100" style={{ color: "var(--text-faint)" }}>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 p-1 rounded-lg border min-w-[180px] animate-[notesPop_120ms_ease-out]" style={popoverStyle}>
          <div className="px-2 py-1 text-[11px] uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Type</div>
          {prop.type === "title" ? (
            <div className="px-2 py-1 text-[13px]" style={{ color: "var(--text-muted)" }}>Title</div>
          ) : (
            <>
              <select value={prop.type} onChange={(e) => onChangeType(e.target.value as PropertyType)}
                className="w-full mx-1 mb-1 px-1.5 py-1 text-[13px] rounded border outline-none" style={selectStyle}>
                {TYPES.map((t) => <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>)}
              </select>

              {prop.type === "relation" && (
                <div className="px-2 py-1">
                  <div className="text-[11px] mb-0.5" style={{ color: "var(--text-faint)" }}>Related database</div>
                  <select value={prop.relationDbId ?? ""} onChange={(e) => onConfig({ relationDbId: e.target.value })}
                    className="w-full px-1.5 py-1 text-[13px] rounded border outline-none" style={selectStyle}>
                    <option value="">Select…</option>
                    {dbs.map((d) => <option key={d.id} value={d.id}>{d.title || "Untitled"}</option>)}
                  </select>
                </div>
              )}

              {prop.type === "rollup" && (
                <div className="px-2 py-1 space-y-1">
                  <div>
                    <div className="text-[11px] mb-0.5" style={{ color: "var(--text-faint)" }}>From relation</div>
                    <select value={prop.rollupRelation ?? ""} onChange={(e) => onConfig({ rollupRelation: e.target.value })}
                      className="w-full px-1.5 py-1 text-[13px] rounded border outline-none" style={selectStyle}>
                      <option value="">Select…</option>
                      {relationProps.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-[11px] mb-0.5" style={{ color: "var(--text-faint)" }}>Target property id</div>
                    <input value={prop.rollupTarget ?? ""} onChange={(e) => onConfig({ rollupTarget: e.target.value })}
                      placeholder="property id on related db" className="w-full px-1.5 py-1 text-[12px] rounded border outline-none" style={selectStyle} />
                  </div>
                  <div>
                    <div className="text-[11px] mb-0.5" style={{ color: "var(--text-faint)" }}>Calculate</div>
                    <select value={prop.rollupFn ?? "count"} onChange={(e) => onConfig({ rollupFn: e.target.value as RollupFn })}
                      className="w-full px-1.5 py-1 text-[13px] rounded border outline-none" style={selectStyle}>
                      {ROLLUP_FNS.map((f) => <option key={f.fn} value={f.fn}>{f.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div className="my-1 h-px" style={{ background: "var(--border-subtle)" }} />
              <button type="button" onClick={() => { onDelete(); setOpen(false); }}
                className="flex items-center gap-2 w-full text-left px-2 py-1 rounded text-[13px] hover:bg-[var(--surface-raised)]" style={{ color: "var(--alert)" }}>
                <Trash2 size={13} /> Delete property
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

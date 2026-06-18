"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Table2, Columns3, List as ListIcon, LayoutGrid, Trash2, CalendarDays } from "lucide-react";
import type { DBProperty, DBRow, DBView, PropertyType, ViewType } from "@/lib/models/notes-database";
import { groupRowsByProperty, isSelectType, optionColor, colorForLabel } from "@/lib/notes/database";
import { CellEditor } from "./cell-editor";
import { AddViewButton, ColumnMenu } from "./schema-controls";
import { CalendarView } from "./calendar-view";

type DB = { id: string; title: string; icon: string; properties: DBProperty[]; views: DBView[]; rows: DBRow[] };

const VIEW_ICON: Record<ViewType, React.ReactNode> = {
  table: <Table2 size={14} />, board: <Columns3 size={14} />, list: <ListIcon size={14} />,
  gallery: <LayoutGrid size={14} />, calendar: <CalendarDays size={14} />,
};

/** Renders an editable Notion-style database: view-switcher tabs + the active view. */
export function DatabaseView({ databaseId }: { databaseId: string }) {
  const [db, setDb] = useState<DB | null>(null);
  const [activeView, setActiveView] = useState(0);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/notes/databases/${databaseId}`);
    if (!res.ok) { setMissing(true); return; }
    setDb((await res.json()).database);
  }, [databaseId]);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- initial fetch

  const titleProp = useMemo(() => db?.properties.find((p) => p.type === "title"), [db]);

  const patchRow = async (rowId: string, cells: Record<string, unknown>) => {
    setDb((d) => d ? { ...d, rows: d.rows.map((r) => r.id === rowId ? { ...r, cells: { ...r.cells, ...cells } } : r) } : d);
    await fetch(`/api/notes/databases/${databaseId}/rows/${rowId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cells }),
    });
  };
  const addRow = async (seed: Record<string, unknown> = {}) => {
    const res = await fetch(`/api/notes/databases/${databaseId}/rows`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cells: seed }),
    });
    if (res.ok) { const { row } = await res.json(); setDb((d) => d ? { ...d, rows: [...d.rows, row] } : d); }
  };
  const deleteRow = async (rowId: string) => {
    setDb((d) => d ? { ...d, rows: d.rows.filter((r) => r.id !== rowId) } : d);
    await fetch(`/api/notes/databases/${databaseId}/rows/${rowId}`, { method: "DELETE" });
  };
  const saveSchema = async (properties: DBProperty[]) => {
    setDb((d) => d ? { ...d, properties } : d);
    await fetch(`/api/notes/databases/${databaseId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ properties }),
    });
  };
  const saveViews = async (views: DBView[]) => {
    setDb((d) => d ? { ...d, views } : d);
    await fetch(`/api/notes/databases/${databaseId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ views }),
    });
  };
  const addColumn = () => {
    if (!db) return;
    const id = `p_${Date.now().toString(36)}`;
    saveSchema([...db.properties, { id, name: "New", type: "text" }]);
  };
  const changeColumnType = (propId: string, type: PropertyType) => {
    if (!db) return;
    saveSchema(db.properties.map((p) => p.id === propId
      ? { ...p, type, options: isSelectType(type) ? (p.options ?? []) : p.options }
      : p));
  };
  const deleteColumn = (propId: string) => {
    if (!db) return;
    saveSchema(db.properties.filter((p) => p.id !== propId));
  };
  const addOption = (propId: string, label: string) => {
    if (!db) return;
    setDb((d) => {
      if (!d) return d;
      const properties = d.properties.map((p) => {
        if (p.id !== propId || (p.options ?? []).some((o) => o.label === label)) return p;
        const opt = { id: `o_${Date.now().toString(36)}`, label, color: colorForLabel(label) };
        return { ...p, options: [...(p.options ?? []), opt] };
      });
      fetch(`/api/notes/databases/${databaseId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ properties }),
      });
      return { ...d, properties };
    });
  };
  const addView = (type: ViewType) => {
    if (!db) return;
    const groupBy = type === "board" ? db.properties.find((p) => isSelectType(p.type))?.id : undefined;
    const view: DBView = { id: `v_${Date.now().toString(36)}`, name: type[0].toUpperCase() + type.slice(1), type, groupBy };
    saveViews([...db.views, view]);
    setActiveView(db.views.length);
  };

  if (missing) return <div contentEditable={false} className="my-2 text-[13px] px-3 py-2 rounded-md" style={{ background: "var(--surface-raised)", color: "var(--text-faint)" }}>Database not found.</div>;
  if (!db) return <div contentEditable={false} className="my-2 text-[13px] px-1" style={{ color: "var(--text-faint)" }}>Loading database…</div>;

  const view = db.views[activeView] ?? db.views[0];

  const saveTitle = (title: string) => {
    setDb((d) => d ? { ...d, title } : d);
    fetch(`/api/notes/databases/${databaseId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }),
    });
  };

  return (
    <div contentEditable={false} className="my-2 select-none">
      {/* Database title (Notion shows the collection name above its views) */}
      <input value={db.title} onChange={(e) => saveTitle(e.target.value)} placeholder="Untitled"
        className="block bg-transparent outline-none text-[18px] font-semibold mb-1.5"
        style={{ color: "var(--text-primary)" }} />
      {/* View-switcher tab bar */}
      <div className="flex items-center gap-1 border-b mb-1.5" style={{ borderColor: "var(--border-subtle)" }}>
        {db.views.map((v, i) => (
          <button key={v.id} type="button" onClick={() => setActiveView(i)}
            className="flex items-center gap-1.5 px-2 py-1.5 text-[13px] -mb-px border-b-2"
            style={{ borderColor: i === activeView ? "var(--text-primary)" : "transparent", color: i === activeView ? "var(--text-primary)" : "var(--text-muted)", fontWeight: i === activeView ? 600 : 400 }}>
            {VIEW_ICON[v.type]} {v.name}
          </button>
        ))}
        <AddViewButton onAdd={addView} />
      </div>

      {view?.type === "table" && (
        <TableView db={db} onCell={patchRow} onAddRow={() => addRow()} onAddColumn={addColumn} onDeleteRow={deleteRow} onSaveSchema={saveSchema} onChangeType={changeColumnType} onDeleteColumn={deleteColumn} onAddOption={addOption} />
      )}
      {view?.type === "board" && (
        <BoardView db={db} view={view} titleProp={titleProp} onCell={patchRow} onAddRow={addRow} />
      )}
      {(view?.type === "gallery") && (
        <GalleryView db={db} titleProp={titleProp} onAddRow={() => addRow()} />
      )}
      {view?.type === "list" && (
        <ListView db={db} titleProp={titleProp} onAddRow={() => addRow()} />
      )}
      {view?.type === "calendar" && (
        <CalendarView properties={db.properties} rows={db.rows} titleProp={titleProp} onAddRow={addRow} />
      )}
    </div>
  );
}

function Chip({ label, color }: { label: string; color: string }) {
  const c = optionColor(color);
  return <span className="inline-block px-1.5 py-0.5 rounded text-[12px] leading-none" style={{ background: c.bg, color: c.text }}>{label}</span>;
}

function TableView({ db, onCell, onAddRow, onAddColumn, onDeleteRow, onSaveSchema, onChangeType, onDeleteColumn, onAddOption }: {
  db: DB; onCell: (rowId: string, cells: Record<string, unknown>) => void;
  onAddRow: () => void; onAddColumn: () => void; onDeleteRow: (id: string) => void;
  onSaveSchema: (p: DBProperty[]) => void;
  onChangeType: (propId: string, t: import("@/lib/models/notes-database").PropertyType) => void;
  onDeleteColumn: (propId: string) => void;
  onAddOption: (propId: string, label: string) => void;
}) {
  return (
    <div className="overflow-x-auto border rounded-md" style={{ borderColor: "var(--border-subtle)" }}>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {db.properties.map((p) => (
              <th key={p.id} className="text-left font-normal px-2 py-1.5 border-b border-r whitespace-nowrap"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)", minWidth: p.type === "title" ? 200 : 120 }}>
                <span className="flex items-center gap-1">
                  <input value={p.name} onChange={(e) => onSaveSchema(db.properties.map((q) => q.id === p.id ? { ...q, name: e.target.value } : q))}
                    className="bg-transparent outline-none w-full" style={{ color: "var(--text-muted)" }} />
                  <ColumnMenu prop={p} onChangeType={(t) => onChangeType(p.id, t)} onDelete={() => onDeleteColumn(p.id)} />
                </span>
              </th>
            ))}
            <th className="px-2 py-1.5 border-b w-8" style={{ borderColor: "var(--border-subtle)" }}>
              <button type="button" onClick={onAddColumn} aria-label="Add column" style={{ color: "var(--text-faint)" }}><Plus size={14} /></button>
            </th>
          </tr>
        </thead>
        <tbody>
          {db.rows.map((row) => (
            <tr key={row.id} className="group/row">
              {db.properties.map((p) => (
                <td key={p.id} className="px-2 py-1 border-b border-r align-top" style={{ borderColor: "var(--border-subtle)" }}>
                  <CellEditor prop={p} value={row.cells[p.id]} onChange={(v) => onCell(row.id, { [p.id]: v })} onAddOption={(label) => onAddOption(p.id, label)} />
                </td>
              ))}
              <td className="px-1 py-1 border-b text-center" style={{ borderColor: "var(--border-subtle)" }}>
                <button type="button" onClick={() => onDeleteRow(row.id)} aria-label="Delete row"
                  className="opacity-0 group-hover/row:opacity-100" style={{ color: "var(--text-faint)" }}><Trash2 size={13} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button type="button" onClick={onAddRow} className="flex items-center gap-1.5 w-full px-2 py-1.5 text-[13px] hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-faint)" }}>
        <Plus size={14} /> New
      </button>
    </div>
  );
}

function rowTitle(row: DBRow, titleProp?: DBProperty): string {
  return titleProp ? (String(row.cells[titleProp.id] ?? "") || "Untitled") : "Untitled";
}

function BoardView({ db, view, titleProp, onCell, onAddRow }: {
  db: DB; view: DBView; titleProp?: DBProperty;
  onCell: (rowId: string, cells: Record<string, unknown>) => void; onAddRow: (seed?: Record<string, unknown>) => void;
}) {
  const groupProp = db.properties.find((p) => p.id === view.groupBy) ?? db.properties.find((p) => isSelectType(p.type));
  const groups = groupRowsByProperty(db.rows, groupProp);
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {groups.map((g) => (
        <div key={g.key} className="shrink-0 w-60">
          <div className="mb-2"><Chip label={`${g.label}  ${g.rows.length}`} color={g.color} /></div>
          <div className="space-y-2">
            {g.rows.map((row) => (
              <div key={row.id} className="rounded-md border px-2.5 py-2 text-[13px]" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)", color: "var(--text-primary)" }}>
                {rowTitle(row, titleProp)}
              </div>
            ))}
            <button type="button"
              onClick={() => onAddRow(groupProp && g.key !== "__empty__" ? { [groupProp.id]: g.label } : {})}
              className="flex items-center gap-1.5 w-full px-1 py-1 text-[12px]" style={{ color: "var(--text-faint)" }}>
              <Plus size={13} /> New
            </button>
            {/* keep onCell referenced for future drag-between-columns */}
            <span className="hidden">{typeof onCell}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function GalleryView({ db, titleProp, onAddRow }: { db: DB; titleProp?: DBProperty; onAddRow: () => void }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
      {db.rows.map((row) => (
        <div key={row.id} className="rounded-lg border p-3 text-[13px] min-h-20" style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}>
          <div className="font-medium mb-1" style={{ color: "var(--text-primary)" }}>{rowTitle(row, titleProp)}</div>
          {db.properties.filter((p) => p.type !== "title").slice(0, 3).map((p) => {
            const v = row.cells[p.id];
            if (v == null || v === "") return null;
            if (isSelectType(p.type)) {
              const opt = p.options?.find((o) => o.label === (Array.isArray(v) ? v[0] : v));
              return <div key={p.id} className="mt-1"><Chip label={String(Array.isArray(v) ? v[0] : v)} color={opt?.color ?? "default"} /></div>;
            }
            return <div key={p.id} className="text-[12px] mt-0.5" style={{ color: "var(--text-muted)" }}>{String(v)}</div>;
          })}
        </div>
      ))}
      <button type="button" onClick={onAddRow} className="rounded-lg border border-dashed flex items-center justify-center min-h-20 text-[13px]" style={{ borderColor: "var(--border-default)", color: "var(--text-faint)" }}>
        <Plus size={16} /> New
      </button>
    </div>
  );
}

function ListView({ db, titleProp, onAddRow }: { db: DB; titleProp?: DBProperty; onAddRow: () => void }) {
  return (
    <div>
      {db.rows.map((row) => {
        const statusProp = db.properties.find((p) => isSelectType(p.type));
        const sv = statusProp ? row.cells[statusProp.id] : undefined;
        const opt = statusProp?.options?.find((o) => o.label === (Array.isArray(sv) ? sv[0] : sv));
        return (
          <div key={row.id} className="flex items-center gap-2 px-2 py-1.5 border-b text-[13px]" style={{ borderColor: "var(--border-subtle)" }}>
            <span className="flex-1 truncate" style={{ color: "var(--text-primary)" }}>{rowTitle(row, titleProp)}</span>
            {sv ? <Chip label={String(Array.isArray(sv) ? sv[0] : sv)} color={opt?.color ?? "default"} /> : null}
          </div>
        );
      })}
      <button type="button" onClick={onAddRow} className="flex items-center gap-1.5 px-2 py-1.5 text-[13px]" style={{ color: "var(--text-faint)" }}>
        <Plus size={14} /> New
      </button>
    </div>
  );
}

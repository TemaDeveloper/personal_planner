"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, ChevronDown, Trash2, Table2, Columns3, List as ListIcon, LayoutGrid, CalendarDays } from "lucide-react";
import type { DBProperty, PropertyType, ViewType } from "@/lib/models/notes-database";
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

const TYPES: PropertyType[] = ["text", "number", "select", "multi_select", "status", "date", "checkbox", "url"];

/** Per-column caret menu: change property type or delete the column (title is protected). */
export function ColumnMenu({ prop, onChangeType, onDelete }: {
  prop: DBProperty; onChangeType: (t: PropertyType) => void; onDelete: () => void;
}) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="relative inline-block" ref={ref}>
      <button type="button" aria-label="Column options" onClick={() => setOpen((o) => !o)}
        className="px-0.5 opacity-50 hover:opacity-100" style={{ color: "var(--text-faint)" }}>
        <ChevronDown size={12} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 p-1 rounded-lg border min-w-[160px] animate-[notesPop_120ms_ease-out]" style={popoverStyle}>
          <div className="px-2 py-1 text-[11px] uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Type</div>
          {prop.type === "title" ? (
            <div className="px-2 py-1 text-[13px]" style={{ color: "var(--text-muted)" }}>Title</div>
          ) : (
            <>
              {TYPES.map((t) => (
                <button key={t} type="button" onClick={() => { onChangeType(t); setOpen(false); }}
                  className="block w-full text-left px-2 py-1 rounded text-[13px] hover:bg-[var(--surface-raised)]"
                  style={{ color: "var(--text-primary)", fontWeight: t === prop.type ? 600 : 400 }}>
                  {PROPERTY_TYPE_LABELS[t]}
                </button>
              ))}
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

"use client";

import { useEffect } from "react";
import { X, Copy, Trash2 } from "lucide-react";
import type { DBProperty, DBRow } from "@/lib/models/notes-database";
import { PROPERTY_TYPE_LABELS } from "@/lib/notes/database";
import { CellEditor, type RelatedDbs } from "./cell-editor";

/** Notion-style row peek: a side panel showing every property of a database row
 * as an editable field. Edits persist through the same onCell used by the grid. */
export function RowPeek({ properties, row, relatedDbs, onCell, onAddOption, onDuplicate, onDelete, onClose }: {
  properties: DBProperty[]; row: DBRow; relatedDbs: RelatedDbs;
  onCell: (rowId: string, cells: Record<string, unknown>) => void;
  onAddOption: (propId: string, label: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const titleProp = properties.find((p) => p.type === "title");
  const title = titleProp ? (String(row.cells[titleProp.id] ?? "") || "Untitled") : "Untitled";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" contentEditable={false}>
      <button aria-label="Close" className="absolute inset-0 bg-[var(--backdrop-overlay)]" onClick={onClose} />
      <div className="relative w-full max-w-md h-full overflow-y-auto p-5 animate-[slideInRight_140ms_ease-out]"
        style={{ background: "var(--surface-1)", borderLeft: "1px solid var(--border-default)", boxShadow: "-8px 0 32px rgba(0,0,0,.16)" }}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>Row</span>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Duplicate row" title="Duplicate" onClick={onDuplicate}
              className="p-1 rounded hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-muted)" }}><Copy size={15} /></button>
            <button type="button" aria-label="Delete row" title="Delete" onClick={onDelete}
              className="p-1 rounded hover:bg-[var(--surface-raised)]" style={{ color: "var(--alert)" }}><Trash2 size={15} /></button>
            <button type="button" aria-label="Close" onClick={onClose} className="p-1 rounded hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-muted)" }}>
              <X size={16} />
            </button>
          </div>
        </div>
        <h2 className="text-[24px] font-bold mb-5" style={{ color: "var(--text-primary)" }}>{title}</h2>
        <div className="space-y-3">
          {properties.map((p) => (
            <div key={p.id} className="grid grid-cols-[120px_1fr] gap-2 items-start">
              <span className="text-[13px] pt-1" style={{ color: "var(--text-muted)" }}>{p.name || PROPERTY_TYPE_LABELS[p.type]}</span>
              <div className="min-w-0">
                <CellEditor prop={p} value={row.cells[p.id]} onChange={(v) => onCell(row.id, { [p.id]: v })}
                  onAddOption={(label) => onAddOption(p.id, label)}
                  ctx={{ properties, row, relatedDbs }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

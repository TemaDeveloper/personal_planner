"use client";

import { useEffect, useRef, useState } from "react";
import type { DBProperty, DBRow } from "@/lib/models/notes-database";
import { optionColor, computeRollup, relatedRowsFor } from "@/lib/notes/database";
import { ProgressRing } from "./progress-ring";

/** Related-database data needed to render relation chips and rollups. */
export type RelatedDbs = Record<string, { rows: DBRow[]; titleId?: string }>;
export type CellCtx = { properties: DBProperty[]; row: DBRow; relatedDbs: RelatedDbs };

function relTitle(row: DBRow, titleId?: string): string {
  return (titleId ? String(row.cells[titleId] ?? "") : "") || "Untitled";
}

/** Inline editor for a single database cell, dispatched by property type. */
export function CellEditor({ prop, value, onChange, onAddOption, ctx }: {
  prop: DBProperty; value: unknown; onChange: (v: unknown) => void; onAddOption?: (label: string) => void; ctx?: CellCtx;
}) {
  switch (prop.type) {
    case "relation":
      return <RelationCell prop={prop} value={(value as string[]) || []} onChange={onChange} ctx={ctx} />;
    case "rollup":
      return <RollupCell prop={prop} ctx={ctx} />;
    case "checkbox":
      return (
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)}
          className="accent-[var(--accent-color)] cursor-pointer" />
      );
    case "number":
      return <TextCell value={value} onChange={(v) => onChange(v === "" ? "" : Number(v))} type="number" />;
    case "date":
      return (
        <input type="date" value={value ? String(value).slice(0, 10) : ""} onChange={(e) => onChange(e.target.value)}
          className="bg-transparent outline-none w-full text-[13px]" style={{ color: "var(--text-primary)" }} />
      );
    case "url":
      return <TextCell value={value} onChange={onChange} type="url" />;
    case "image":
      return <ImageCell value={value as string} onChange={onChange} />;
    case "select":
    case "status":
      return <SelectCell prop={prop} value={value as string} onChange={onChange} onAddOption={onAddOption} />;
    case "multi_select":
      return <MultiSelectCell prop={prop} value={(value as string[]) || []} onChange={onChange} onAddOption={onAddOption} />;
    default: // title, text
      return <TextCell value={value} onChange={onChange} bold={prop.type === "title"} />;
  }
}

function TextCell({ value, onChange, type = "text", bold }: {
  value: unknown; onChange: (v: string) => void; type?: string; bold?: boolean;
}) {
  const [v, setV] = useState(value == null ? "" : String(value));
  useEffect(() => { setV(value == null ? "" : String(value)); }, [value]); // eslint-disable-line react-hooks/set-state-in-effect -- sync external cell value into local input
  return (
    <input type={type} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => onChange(v)}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      className="bg-transparent outline-none w-full text-[13px]"
      style={{ color: "var(--text-primary)", fontWeight: bold ? 500 : 400 }} />
  );
}

/** Image cell: shows a thumbnail when set, with a popover to paste/clear the URL. */
function ImageCell({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { open, setOpen, ref } = usePopover();
  const [draft, setDraft] = useState(value || "");
  useEffect(() => { setDraft(value || ""); }, [value]); // eslint-disable-line react-hooks/set-state-in-effect -- sync external value
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="block">
        {value
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary user URL; next/image needs configured domains
          ? <img src={value} alt="" className="h-8 w-8 rounded object-cover" />
          : <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>＋ Image</span>}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 p-2 rounded-lg border w-64 animate-[notesPop_120ms_ease-out]"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
          <input autoFocus value={draft} placeholder="Paste image URL…"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { onChange(draft.trim()); setOpen(false); } }}
            className="w-full px-2 py-1 text-[13px] bg-transparent outline-none rounded border"
            style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }} />
          {value && (
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className="mt-1 text-[12px]" style={{ color: "var(--text-faint)" }}>Clear</button>
          )}
        </div>
      )}
    </div>
  );
}

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

function Chip({ label, color }: { label: string; color: string }) {
  const c = optionColor(color);
  return <span className="inline-block px-1.5 py-0.5 rounded text-[12px] leading-none" style={{ background: c.bg, color: c.text }}>{label}</span>;
}

function OptionCreator({ onCreate }: { onCreate: (label: string) => void }) {
  const [v, setV] = useState("");
  return (
    <input value={v} placeholder="Type to add option…" onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter" && v.trim()) { onCreate(v.trim()); setV(""); } }}
      className="w-full px-1.5 py-1 mb-1 bg-transparent outline-none text-[12px] border-b"
      style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }} />
  );
}

function SelectCell({ prop, value, onChange, onAddOption }: { prop: DBProperty; value: string; onChange: (v: string) => void; onAddOption?: (label: string) => void }) {
  const { open, setOpen, ref } = usePopover();
  const opt = prop.options?.find((o) => o.label === value);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left min-h-5">
        {value ? <Chip label={value} color={opt?.color ?? "default"} /> : <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>—</span>}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 p-1 rounded-lg border min-w-[150px] animate-[notesPop_120ms_ease-out]"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
          {onAddOption && <OptionCreator onCreate={(label) => { onAddOption(label); onChange(label); setOpen(false); }} />}
          {(prop.options ?? []).map((o) => (
            <button key={o.id} type="button" onClick={() => { onChange(o.label); setOpen(false); }}
              className="block w-full text-left px-1.5 py-1 rounded hover:bg-[var(--surface-raised)]">
              <Chip label={o.label} color={o.color} />
            </button>
          ))}
          {value && (
            <button type="button" onClick={() => { onChange(""); setOpen(false); }}
              className="block w-full text-left px-1.5 py-1 rounded text-[12px] hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-faint)" }}>
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RelationCell({ prop, value, onChange, ctx }: { prop: DBProperty; value: string[]; onChange: (v: string[]) => void; ctx?: CellCtx }) {
  const { open, setOpen, ref } = usePopover();
  const target = prop.relationDbId ? ctx?.relatedDbs[prop.relationDbId] : undefined;
  if (!prop.relationDbId) return <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>Set target DB →</span>;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  const rowsT = target?.rows ?? [];
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left flex flex-wrap gap-1 min-h-5">
        {value.length ? value.map((id) => {
          const r = rowsT.find((x) => x.id === id);
          return <span key={id} className="inline-block px-1.5 py-0.5 rounded text-[12px] leading-none underline decoration-dotted" style={{ background: "var(--surface-raised)", color: "var(--text-primary)" }}>{r ? relTitle(r, target?.titleId) : "↗"}</span>;
        }) : <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>—</span>}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 p-1 rounded-lg border min-w-[180px] max-h-56 overflow-y-auto animate-[notesPop_120ms_ease-out]"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
          {rowsT.length === 0 && <div className="px-2 py-1 text-[12px]" style={{ color: "var(--text-faint)" }}>No rows in target database.</div>}
          {rowsT.map((r) => (
            <button key={r.id} type="button" onClick={() => toggle(r.id)}
              className="flex items-center gap-2 w-full text-left px-1.5 py-1 rounded text-[13px] hover:bg-[var(--surface-raised)]" style={{ color: "var(--text-primary)" }}>
              <input type="checkbox" readOnly checked={value.includes(r.id)} className="accent-[var(--accent-color)]" />
              {relTitle(r, target?.titleId)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RollupCell({ prop, ctx }: { prop: DBProperty; ctx?: CellCtx }) {
  if (!ctx || !prop.rollupRelation) return <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>—</span>;
  const relProp = ctx.properties.find((p) => p.id === prop.rollupRelation);
  const targetDb = relProp?.relationDbId ? ctx.relatedDbs[relProp.relationDbId] : undefined;
  const related = relatedRowsFor(relProp ? ctx.row.cells[relProp.id] : undefined, targetDb?.rows ?? []);
  const { value, isPercent } = computeRollup(prop, related);
  if (isPercent) return <ProgressRing value={value} />;
  return <span className="text-[13px]" style={{ color: "var(--text-primary)" }}>{value}</span>;
}

function MultiSelectCell({ prop, value, onChange, onAddOption }: { prop: DBProperty; value: string[]; onChange: (v: string[]) => void; onAddOption?: (label: string) => void }) {
  const { open, setOpen, ref } = usePopover();
  const toggle = (label: string) => onChange(value.includes(label) ? value.filter((x) => x !== label) : [...value, label]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left flex flex-wrap gap-1 min-h-5">
        {value.length ? value.map((l) => <Chip key={l} label={l} color={prop.options?.find((o) => o.label === l)?.color ?? "default"} />)
          : <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>—</span>}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 p-1 rounded-lg border min-w-[150px] animate-[notesPop_120ms_ease-out]"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
          {onAddOption && <OptionCreator onCreate={(label) => { onAddOption(label); onChange([...value, label]); }} />}
          {(prop.options ?? []).map((o) => (
            <button key={o.id} type="button" onClick={() => toggle(o.label)}
              className="flex items-center gap-2 w-full text-left px-1.5 py-1 rounded hover:bg-[var(--surface-raised)]">
              <input type="checkbox" readOnly checked={value.includes(o.label)} className="accent-[var(--accent-color)]" />
              <Chip label={o.label} color={o.color} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

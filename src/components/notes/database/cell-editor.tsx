"use client";

import { useEffect, useRef, useState } from "react";
import type { DBProperty } from "@/lib/models/notes-database";
import { optionColor } from "@/lib/notes/database";

/** Inline editor for a single database cell, dispatched by property type. */
export function CellEditor({ prop, value, onChange }: {
  prop: DBProperty; value: unknown; onChange: (v: unknown) => void;
}) {
  switch (prop.type) {
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
    case "select":
    case "status":
      return <SelectCell prop={prop} value={value as string} onChange={onChange} />;
    case "multi_select":
      return <MultiSelectCell prop={prop} value={(value as string[]) || []} onChange={onChange} />;
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

function SelectCell({ prop, value, onChange }: { prop: DBProperty; value: string; onChange: (v: string) => void }) {
  const { open, setOpen, ref } = usePopover();
  const opt = prop.options?.find((o) => o.label === value);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left min-h-5">
        {value ? <Chip label={value} color={opt?.color ?? "default"} /> : <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>—</span>}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 p-1 rounded-lg border min-w-[140px] animate-[notesPop_120ms_ease-out]"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
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

function MultiSelectCell({ prop, value, onChange }: { prop: DBProperty; value: string[]; onChange: (v: string[]) => void }) {
  const { open, setOpen, ref } = usePopover();
  const toggle = (label: string) => onChange(value.includes(label) ? value.filter((x) => x !== label) : [...value, label]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full text-left flex flex-wrap gap-1 min-h-5">
        {value.length ? value.map((l) => <Chip key={l} label={l} color={prop.options?.find((o) => o.label === l)?.color ?? "default"} />)
          : <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>—</span>}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 p-1 rounded-lg border min-w-[140px] animate-[notesPop_120ms_ease-out]"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}>
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

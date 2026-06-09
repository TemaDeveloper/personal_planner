"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CALENDAR_PALETTE, type CalendarCategory } from "@/lib/calendar";

export type EventDraft = {
  id?: string;
  title: string;
  start: string; // datetime-local
  end: string; // datetime-local
  allDay: boolean;
  categoryKey: string;
  description: string;
};

export function EventInspector({
  open,
  draft,
  categories,
  onChange,
  onSave,
  onClose,
  onDelete,
  onAddCategory,
}: {
  open: boolean;
  draft: EventDraft;
  categories: CalendarCategory[];
  onChange: (next: EventDraft) => void;
  onSave: (draft: EventDraft) => void;
  onClose: () => void;
  onDelete?: () => void;
  onAddCategory: (cat: CalendarCategory) => void;
}) {
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState<string>(CALENDAR_PALETTE[1]);

  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => onChange({ ...draft, [k]: v });

  const fmtStart = (s: string) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };
  const fmtEnd = (s: string) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const submit = () => {
    if (!draft.title.trim()) { setError("Title is required"); return; }
    if (!draft.allDay && new Date(draft.end).getTime() <= new Date(draft.start).getTime()) { setError("End must be after start"); return; }
    setError("");
    onSave(draft);
  };

  const addCat = () => {
    const name = catName.trim();
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") + "_" + (categories.length + 1);
    onAddCategory({ key, label: name, color: catColor });
    onChange({ ...draft, categoryKey: key });
    setAdding(false);
    setCatName("");
  };

  return (
    <aside
      aria-hidden={!open}
      className="absolute top-0 right-0 h-full w-[336px] flex flex-col z-20 transition-transform duration-[260ms] motion-reduce:transition-none"
      style={{
        background: "var(--surface-1)",
        boxShadow: "-12px 0 30px rgba(0,0,0,.06)",
        transform: open ? "translateX(0)" : "translateX(100%)",
      }}
    >
      <div className="flex items-center justify-between px-[18px] pt-4 pb-2.5">
        <span className="text-[11px] tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
          {draft.id ? "Edit event" : "New event"}
        </span>
        <button type="button" aria-label="Close" onClick={onClose} className="w-8 h-8 rounded-lg" style={{ color: "var(--text-muted)" }}>✕</button>
      </div>

      <div className="px-[18px] pb-[18px] flex flex-col gap-[18px] overflow-y-auto">
        <div>
          <label htmlFor="ins-title" className="sr-only">Title</label>
          <input id="ins-title" className="w-full text-[20px] font-semibold bg-transparent outline-none"
            style={{ color: "var(--text-primary)" }} placeholder="Add title"
            value={draft.title} onChange={(e) => set("title", e.target.value)} />
        </div>

        <div className="text-[13px]" style={{ color: "var(--text-muted)" }}>{fmtStart(draft.start)} – {fmtEnd(draft.end)}</div>

        <div>
          <div className="text-[11px] tracking-wide uppercase mb-2" style={{ color: "var(--text-muted)" }}>Category</div>
          <div className="flex flex-wrap gap-2 items-center">
            {categories.map((c) => (
              <button key={c.key} type="button" onClick={() => set("categoryKey", c.key)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px]"
                style={{
                  background: draft.categoryKey === c.key ? `color-mix(in srgb, ${c.color} 12%, transparent)` : "var(--surface-1)",
                  border: `1px solid ${draft.categoryKey === c.key ? c.color : "var(--border-default)"}`,
                  color: "var(--text-primary)",
                }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
            <button type="button" onClick={() => setAdding(true)}
              className="rounded-full px-3 py-1.5 text-[12.5px] border border-dashed"
              style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}>+ New</button>
          </div>

          {adding && (
            <div className="mt-2.5 p-3 rounded-[10px] flex flex-col gap-2.5" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)" }}>
              <input placeholder="Category name" maxLength={24} value={catName} onChange={(e) => setCatName(e.target.value)}
                className="rounded-lg px-2.5 py-1.5 text-[13px] outline-none" style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
              <div className="flex flex-wrap gap-1.5">
                {CALENDAR_PALETTE.map((hex) => (
                  <button key={hex} type="button" aria-label={`color ${hex}`} onClick={() => setCatColor(hex)}
                    className="w-[22px] h-[22px] rounded-full" style={{ background: hex, outline: catColor === hex ? "2px solid var(--text-primary)" : "none" }} />
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={addCat}>Add</Button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] tracking-wide uppercase mb-2" style={{ color: "var(--text-muted)" }}>Notes</div>
          <textarea value={draft.description} onChange={(e) => set("description", e.target.value)}
            placeholder="Add a description for this task…"
            className="w-full min-h-[92px] rounded-[10px] p-2.5 text-[13px] outline-none resize-y"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
        </div>

        {error && <p className="text-[13px]" style={{ color: "var(--alert)" }}>{error}</p>}
      </div>

      <div className="mt-auto flex gap-2 px-[18px] py-3.5">
        {onDelete ? <Button variant="destructive" size="sm" onClick={onDelete}>Delete</Button> : <span />}
        <Button variant="primary" size="sm" className="flex-1" onClick={submit}>Save</Button>
      </div>
    </aside>
  );
}

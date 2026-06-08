"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { CalendarCategory } from "@/lib/calendar";

export type EventDraft = {
  id?: string;
  title: string;
  start: string; // datetime-local string
  end: string; // datetime-local string
  allDay: boolean;
  categoryKey: string;
};

export function EventEditor({
  open,
  categories,
  initial,
  onSave,
  onClose,
  onDelete,
}: {
  open: boolean;
  categories: CalendarCategory[];
  initial: EventDraft;
  onSave: (draft: EventDraft) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<EventDraft>(initial);
  const [error, setError] = useState("");

  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const submit = () => {
    if (!draft.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!draft.allDay && new Date(draft.end).getTime() <= new Date(draft.start).getTime()) {
      setError("End must be after start");
      return;
    }
    setError("");
    onSave(draft);
  };

  return (
    <Modal open={open} onClose={onClose} title={initial.id ? "Edit event" : "New event"}>
      <div className="space-y-4">
        <div>
          <label htmlFor="ev-title" className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>Title</label>
          <input
            id="ev-title"
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
          <input type="checkbox" checked={draft.allDay} onChange={(e) => set("allDay", e.target.checked)} />
          All day
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ev-start" className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>Start</label>
            <input
              id="ev-start"
              type="datetime-local"
              disabled={draft.allDay}
              className="w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              value={draft.start}
              onChange={(e) => set("start", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="ev-end" className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>End</label>
            <input
              id="ev-end"
              type="datetime-local"
              disabled={draft.allDay}
              className="w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              value={draft.end}
              onChange={(e) => set("end", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => set("categoryKey", c.key)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                style={{
                  background: draft.categoryKey === c.key ? `${c.color}22` : "var(--surface-raised)",
                  border: `1px solid ${draft.categoryKey === c.key ? c.color : "var(--border-default)"}`,
                  color: "var(--text-primary)",
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm" style={{ color: "var(--alert)" }}>{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {onDelete ? (
            <Button variant="destructive" size="sm" onClick={onDelete}>Delete</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={submit}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

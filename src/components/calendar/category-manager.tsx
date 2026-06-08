"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CALENDAR_PALETTE, type CalendarCategory } from "@/lib/calendar";

export function CategoryManager({
  open,
  categories,
  onClose,
  onSave,
}: {
  open: boolean;
  categories: CalendarCategory[];
  onClose: () => void;
  onSave: (next: CalendarCategory[]) => void;
}) {
  const [list, setList] = useState<CalendarCategory[]>(categories);

  const update = (i: number, patch: Partial<CalendarCategory>) =>
    setList((l) => l.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => setList((l) => (l.length > 1 ? l.filter((_, idx) => idx !== i) : l));
  const add = () =>
    setList((l) => [...l, { key: `cat_${l.length + 1}`, label: "New", color: CALENDAR_PALETTE[l.length % CALENDAR_PALETTE.length] }]);

  return (
    <Modal open={open} onClose={onClose} title="Categories">
      <div className="space-y-3">
        {list.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex gap-1">
              {CALENDAR_PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`color ${hex}`}
                  onClick={() => update(i, { color: hex })}
                  className="w-5 h-5 rounded-full"
                  style={{ background: hex, outline: c.color === hex ? "2px solid var(--text-primary)" : "none" }}
                />
              ))}
            </div>
            <input
              className="flex-1 rounded-lg px-2 py-1 text-sm"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              value={c.label}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <Button variant="ghost" size="sm" onClick={() => remove(i)} disabled={list.length <= 1}>✕</Button>
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={add}>+ Add category</Button>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={() => onSave(list)}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

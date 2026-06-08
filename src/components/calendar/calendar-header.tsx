"use client";

import { Button } from "@/components/ui/button";

export type CalView = "month" | "week" | "day" | "agenda";

export function CalendarHeader({
  view,
  label,
  onView,
  onPrev,
  onNext,
  onToday,
  onNew,
  onManageCategories,
}: {
  view: CalView;
  label: string;
  onView: (v: CalView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNew: () => void;
  onManageCategories: () => void;
}) {
  const views: CalView[] = ["month", "week", "day", "agenda"];
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onPrev} aria-label="Previous">‹</Button>
        <Button variant="secondary" size="sm" onClick={onToday}>Today</Button>
        <Button variant="secondary" size="sm" onClick={onNext} aria-label="Next">›</Button>
        <span className="text-sm font-medium ml-2" style={{ color: "var(--text-primary)" }}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
          {views.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onView(v)}
              className="px-3 py-1 text-xs capitalize"
              style={{
                background: view === v ? "var(--accent-color)" : "var(--surface-raised)",
                color: view === v ? "#fff" : "var(--text-primary)",
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={onManageCategories}>Categories</Button>
        <Button variant="primary" size="sm" onClick={onNew}>New event</Button>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { addMonths, format, isSameDay, isSameMonth } from "date-fns";
import { buildMiniMonth } from "@/lib/mini-month";
import { useToday } from "@/hooks/use-today";

const DOW = ["M", "T", "W", "T", "F", "S", "S"];

/** Compact month navigator. Clicking a date calls onPick(date). */
export function MiniCalendar({ selected, onPick }: { selected: Date; onPick: (d: Date) => void }) {
  const today = useToday();
  const [month, setMonth] = useState<Date>(selected);
  const weeks = buildMiniMonth(month);

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>{format(month, "MMMM yyyy")}</span>
        <div className="flex gap-0.5">
          <button type="button" aria-label="Previous month" onClick={() => setMonth((m) => addMonths(m, -1))} className="w-6 h-6 rounded-md text-[14px]" style={{ color: "var(--text-muted)" }}>‹</button>
          <button type="button" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))} className="w-6 h-6 rounded-md text-[14px]" style={{ color: "var(--text-muted)" }}>›</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {DOW.map((d, i) => (
          <div key={i} className="text-center text-[9px] uppercase" style={{ color: "var(--text-faint)" }}>{d}</div>
        ))}
        {weeks.flat().map((day) => {
          const isToday = isSameDay(day, today);
          const isSel = isSameDay(day, selected);
          const dim = !isSameMonth(day, month);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onPick(day)}
              className="mx-auto w-6 h-6 rounded-full text-[11px] flex items-center justify-center"
              style={{
                background: isToday ? "var(--accent-color)" : isSel ? "var(--accent-glow)" : "transparent",
                color: isToday ? "#fff" : dim ? "var(--text-faint)" : "var(--text-primary)",
                fontWeight: isSel && !isToday ? 600 : 400,
              }}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

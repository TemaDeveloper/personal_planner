"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { DBProperty, DBRow } from "@/lib/models/notes-database";
import { monthMatrix, indexByDay, WEEKDAYS, MONTH_NAMES, localDateKey } from "@/lib/notes/calendar-grid";
import { isSelectType, optionColor } from "@/lib/notes/database";

/** Month-grid calendar: places rows on their date-property day. */
export function CalendarView({ properties, rows, titleProp, onAddRow }: {
  properties: DBProperty[]; rows: DBRow[]; titleProp?: DBProperty;
  onAddRow: (seed?: Record<string, unknown>) => void;
}) {
  const dateProp = properties.find((p) => p.type === "date");
  // Color event pills by the first select/status property (Notion colors
  // calendar entries by their status/category).
  const colorProp = properties.find((p) => isSelectType(p.type));
  const pillStyle = (row: DBRow) => {
    if (!colorProp) return { background: "var(--accent-glow)", color: "var(--text-primary)" };
    const v = row.cells[colorProp.id];
    const label = Array.isArray(v) ? v[0] : v;
    const opt = colorProp.options?.find((o) => o.label === label);
    if (!opt) return { background: "var(--accent-glow)", color: "var(--text-primary)" };
    const c = optionColor(opt.color);
    return { background: c.bg, color: c.text };
  };
  const today = new Date();
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const todayKey = localDateKey(today);

  const weeks = useMemo(() => monthMatrix(ym.y, ym.m), [ym]);
  const byDay = useMemo(() => indexByDay(rows, dateProp?.id), [rows, dateProp]);

  const shift = (delta: number) => setYm(({ y, m }) => {
    const d = new Date(Date.UTC(y, m + delta, 1));
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
  });

  if (!dateProp) {
    return <div className="text-[13px] px-1 py-2" style={{ color: "var(--text-faint)" }}>Add a Date property to use the calendar view.</div>;
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>{MONTH_NAMES[ym.m]} {ym.y}</span>
        <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="p-0.5" style={{ color: "var(--text-muted)" }}><ChevronLeft size={16} /></button>
        <button type="button" aria-label="Next month" onClick={() => shift(1)} className="p-0.5" style={{ color: "var(--text-muted)" }}><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 border-l border-t rounded-md overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="px-2 py-1 text-[11px] border-r border-b" style={{ borderColor: "var(--border-subtle)", color: "var(--text-faint)" }}>{d}</div>
        ))}
        {weeks.flat().map((day) => {
          const inMonth = Number(day.slice(5, 7)) === ym.m + 1;
          const items = byDay.get(day) ?? [];
          return (
            <div key={day} className="min-h-20 px-1.5 py-1 border-r border-b group/day" style={{ borderColor: "var(--border-subtle)", background: inMonth ? undefined : "var(--surface-raised)" }}>
              <div className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: day === todayKey ? "var(--accent-color)" : "var(--text-faint)", fontWeight: day === todayKey ? 700 : 400 }}>{Number(day.slice(8, 10))}</span>
                <button type="button" aria-label="Add on day" onClick={() => onAddRow({ [dateProp.id]: day })}
                  className="opacity-0 group-hover/day:opacity-100" style={{ color: "var(--text-faint)" }}><Plus size={12} /></button>
              </div>
              <div className="space-y-1 mt-1">
                {items.map((row) => (
                  <div key={row.id} className="text-[12px] truncate rounded px-1 py-0.5" style={pillStyle(row)}>
                    {titleProp ? (String(row.cells[titleProp.id] ?? "") || "Untitled") : "Untitled"}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

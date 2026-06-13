"use client";

import { useMemo } from "react";
import { addDays, format, isSameDay, isSameMonth } from "date-fns";
import { monthGridRange, categoryColor, type CalendarCategory } from "@/lib/calendar";
import { useToday } from "@/hooks/use-today";
import { EventChip } from "./event-chip";

export type CalEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  categoryKey: string;
  description: string;
};

const MAX_CHIPS = 3;

export function MonthView({
  month,
  events,
  categories,
  onSelectDay,
  onSelectEvent,
}: {
  month: Date;
  events: CalEvent[];
  categories: CalendarCategory[];
  onSelectDay: (d: Date) => void;
  onSelectEvent: (id: string) => void;
}) {
  const now = useToday();
  const { start, end } = monthGridRange(month);
  const days = useMemo(() => {
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [start, end]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of events) {
      const key = format(new Date(ev.start), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
    }
    return map;
  }, [events]);

  return (
    <div>
      <div className="grid grid-cols-7 text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px" style={{ background: "var(--border-subtle)" }}>
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const list = byDay.get(key) ?? [];
          const today = isSameDay(d, now);
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <div
              key={key}
              className="min-h-24 p-1.5 cursor-pointer"
              style={{ background: weekend ? "rgba(63,107,140,.045)" : "var(--surface-1)", opacity: isSameMonth(d, month) ? 1 : 0.45 }}
              onClick={() => onSelectDay(d)}
            >
              <div
                className="text-xs mb-1 inline-flex items-center justify-center w-5 h-5 rounded-full"
                style={today ? { background: "var(--accent-color)", color: "#fff" } : { color: "var(--text-primary)" }}
              >
                {format(d, "d")}
              </div>
              <div className="space-y-0.5">
                {list.slice(0, MAX_CHIPS).map((ev) => (
                  <div key={ev.id} onClick={(e) => { e.stopPropagation(); onSelectEvent(ev.id); }}>
                    <EventChip event={{ ...ev, color: categoryColor(categories, ev.categoryKey) }} />
                  </div>
                ))}
                {list.length > MAX_CHIPS && (
                  <div className="text-[10px] px-1" style={{ color: "var(--text-muted)" }}>
                    +{list.length - MAX_CHIPS} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

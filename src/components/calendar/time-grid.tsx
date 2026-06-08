"use client";

import { startOfDay, isSameDay, format } from "date-fns";
import { layoutDayEvents } from "@/lib/event-layout";
import { categoryColor, type CalendarCategory } from "@/lib/calendar";
import { EventChip } from "./event-chip";
import type { CalEvent } from "./month-view";

const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayColumn({
  date,
  events,
  categories,
  onSelectSlot,
  onSelectEvent,
}: {
  date: Date;
  events: CalEvent[];
  categories: CalendarCategory[];
  onSelectSlot: (date: Date, hour: number) => void;
  onSelectEvent: (id: string) => void;
}) {
  const dayStart = startOfDay(date);
  const timed = events.filter((e) => !e.allDay && isSameDay(new Date(e.start), date));
  const positioned = layoutDayEvents(
    timed.map((e) => ({ id: e.id, start: new Date(e.start), end: new Date(e.end) })),
    { dayStart, hourHeight: HOUR_HEIGHT, minHeight: 14 }
  );
  const byId = new Map(timed.map((e) => [e.id, e]));

  return (
    <div className="relative flex-1 border-l" style={{ borderColor: "var(--border-subtle)", height: 24 * HOUR_HEIGHT }}>
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 cursor-pointer"
          style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT, borderTop: "1px solid var(--border-subtle)" }}
          onClick={() => onSelectSlot(date, h)}
        />
      ))}
      {positioned.map((p) => {
        const ev = byId.get(p.id)!;
        return (
          <div
            key={p.id}
            className="absolute px-0.5"
            style={{ top: p.top, height: p.height, left: `${p.left * 100}%`, width: `${p.width * 100}%` }}
          >
            <EventChip
              variant="block"
              event={{ ...ev, color: categoryColor(categories, ev.categoryKey) }}
              onClick={() => onSelectEvent(ev.id)}
            />
          </div>
        );
      })}
    </div>
  );
}

export function HourGutter() {
  return (
    <div className="w-12 shrink-0" style={{ height: 24 * HOUR_HEIGHT }}>
      {HOURS.map((h) => (
        <div key={h} className="text-[10px] text-right pr-1 -translate-y-1.5" style={{ height: HOUR_HEIGHT, color: "var(--text-muted)" }}>
          {h === 0 ? "" : format(new Date(2026, 0, 1, h), "h a")}
        </div>
      ))}
    </div>
  );
}

export function AllDayStrip({
  days,
  events,
  categories,
  onSelectEvent,
}: {
  days: Date[];
  events: CalEvent[];
  categories: CalendarCategory[];
  onSelectEvent: (id: string) => void;
}) {
  const allDay = events.filter((e) => e.allDay);
  const covers = (e: CalEvent, day: Date) => {
    const s = startOfDay(new Date(e.start)).getTime();
    const en = startOfDay(new Date(e.end)).getTime();
    const d = startOfDay(day).getTime();
    return d >= s && d <= en;
  };
  return (
    <div className="flex border-b" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="w-12 shrink-0 text-[10px] pr-1 text-right pt-1" style={{ color: "var(--text-muted)" }}>all-day</div>
      {days.map((day) => (
        <div key={day.toISOString()} className="flex-1 border-l p-0.5 space-y-0.5 min-h-6" style={{ borderColor: "var(--border-subtle)" }}>
          {allDay.filter((e) => covers(e, day)).map((e) => (
            <EventChip
              key={e.id}
              event={{ ...e, color: categoryColor(categories, e.categoryKey) }}
              onClick={() => onSelectEvent(e.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export { HOUR_HEIGHT };

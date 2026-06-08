"use client";

import { startOfWeek, addDays, format, isSameDay } from "date-fns";
import { DayColumn, HourGutter } from "./time-grid";
import type { CalEvent } from "./month-view";
import type { CalendarCategory } from "@/lib/calendar";

export function WeekView({
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
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="overflow-auto max-h-[70vh]">
      <div className="flex sticky top-0 z-10" style={{ background: "var(--surface-1)" }}>
        <div className="w-12 shrink-0" />
        {days.map((d) => (
          <div key={d.toISOString()} className="flex-1 text-center text-xs py-1"
            style={{ color: isSameDay(d, new Date()) ? "var(--accent-color)" : "var(--text-muted)" }}>
            {format(d, "EEE d")}
          </div>
        ))}
      </div>
      <div className="flex">
        <HourGutter />
        {days.map((d) => (
          <DayColumn key={d.toISOString()} date={d} events={events} categories={categories}
            onSelectSlot={onSelectSlot} onSelectEvent={onSelectEvent} />
        ))}
      </div>
    </div>
  );
}

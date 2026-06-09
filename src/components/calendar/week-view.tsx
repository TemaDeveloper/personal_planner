"use client";

import { startOfWeek, addDays, format, isSameDay } from "date-fns";
import { TimeGrid } from "./time-grid";
import { AllDayStrip } from "./all-day-strip";
import type { CalEvent } from "./month-view";
import type { CalendarCategory } from "@/lib/calendar";

export function WeekView({ date, events, categories, onCreate, onMove, onResize, onSelect }: {
  date: Date; events: CalEvent[]; categories: CalendarCategory[];
  onCreate: (d: { day: Date; startH: number; endH: number }) => void;
  onMove: (id: string, day: Date, startH: number, endH: number) => void;
  onResize: (id: string, endH: number) => void;
  onSelect: (id: string) => void;
}) {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
  return (
    <div className="h-full flex flex-col">
      <div className="grid [scrollbar-gutter:stable] overflow-y-scroll shrink-0" style={{ gridTemplateColumns: "56px repeat(7,1fr)" }}>
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="text-center pb-2" data-weekend={isWeekend(d)} style={{ background: isWeekend(d) ? "rgba(63,107,140,.045)" : undefined }}>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: isWeekend(d) ? "#3F6B8C" : "var(--text-muted)" }}>{format(d, "EEE")}</div>
            <div className="text-[18px] font-medium mt-1 w-[34px] h-[34px] leading-[34px] rounded-full inline-block"
              style={isSameDay(d, new Date()) ? { background: "var(--accent-color)", color: "#fff" } : { color: "var(--text-primary)" }}>{format(d, "d")}</div>
          </div>
        ))}
      </div>
      <div className="shrink-0">
        <AllDayStrip days={days} events={events} categories={categories} onSelectEvent={onSelect} />
      </div>
      <TimeGrid days={days} events={events} categories={categories} onCreate={onCreate} onMove={onMove} onResize={onResize} onSelect={onSelect} />
    </div>
  );
}

"use client";

import { TimeGrid } from "./time-grid";
import { AllDayStrip } from "./all-day-strip";
import type { CalEvent } from "./month-view";
import type { CalendarCategory } from "@/lib/calendar";

export function DayView({ date, events, categories, onCreate, onMove, onResize, onSelect }: {
  date: Date; events: CalEvent[]; categories: CalendarCategory[];
  onCreate: (d: { day: Date; startH: number; endH: number }) => void;
  onMove: (id: string, day: Date, startH: number, endH: number) => void;
  onResize: (id: string, endH: number) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0">
        <AllDayStrip days={[date]} events={events} categories={categories} onSelectEvent={onSelect} />
      </div>
      <TimeGrid days={[date]} events={events} categories={categories} onCreate={onCreate} onMove={onMove} onResize={onResize} onSelect={onSelect} />
    </div>
  );
}

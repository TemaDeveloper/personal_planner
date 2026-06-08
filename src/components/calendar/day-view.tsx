"use client";

import { DayColumn, HourGutter } from "./time-grid";
import type { CalEvent } from "./month-view";
import type { CalendarCategory } from "@/lib/calendar";

export function DayView({
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
  return (
    <div className="overflow-auto max-h-[70vh] flex">
      <HourGutter />
      <DayColumn date={date} events={events} categories={categories} onSelectSlot={onSelectSlot} onSelectEvent={onSelectEvent} />
    </div>
  );
}

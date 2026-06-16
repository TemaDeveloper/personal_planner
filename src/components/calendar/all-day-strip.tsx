"use client";

import { startOfDay } from "date-fns";
import { categoryColor, type CalendarCategory } from "@/lib/calendar";
import { EventChip } from "./event-chip";
import type { CalEvent } from "./month-view";
import { gridTemplate, GUTTER_CLASS } from "@/lib/calendar-layout";

export function AllDayStrip({ days, events, categories, onSelectEvent }: {
  days: Date[]; events: CalEvent[]; categories: CalendarCategory[]; onSelectEvent: (id: string) => void;
}) {
  const allDay = events.filter((e) => e.allDay);
  const covers = (e: CalEvent, day: Date) => {
    const s = startOfDay(new Date(e.start)).getTime();
    const en = startOfDay(new Date(e.end)).getTime();
    const d = startOfDay(day).getTime();
    return d >= s && d <= en;
  };
  return (
    <div className={`grid ${GUTTER_CLASS} border-b`} style={{ gridTemplateColumns: gridTemplate(days.length), borderColor: "var(--border-subtle)" }}>
      <div className="text-[10px] text-right pr-2 pt-1" style={{ color: "var(--text-muted)" }}>all-day</div>
      {days.map((day) => (
        <div key={day.toISOString()} className="border-l p-0.5 space-y-0.5 min-h-6" style={{ borderColor: "var(--border-subtle)" }}>
          {allDay.filter((e) => covers(e, day)).map((e) => (
            <EventChip key={e.id} event={{ ...e, color: categoryColor(categories, e.categoryKey) }} onClick={() => onSelectEvent(e.id)} />
          ))}
        </div>
      ))}
    </div>
  );
}

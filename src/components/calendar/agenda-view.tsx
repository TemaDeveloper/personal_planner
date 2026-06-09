"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { categoryColor, type CalendarCategory } from "@/lib/calendar";
import { EventChip } from "./event-chip";
import type { CalEvent } from "./month-view";

export function AgendaView({
  events,
  categories,
  onSelectEvent,
}: {
  events: CalEvent[];
  categories: CalendarCategory[];
  onSelectEvent: (id: string) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    for (const ev of sorted) {
      const key = format(new Date(ev.start), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [events]);

  if (!groups.length) {
    return (
      <div className="py-16 text-center" style={{ color: "var(--text-muted)" }}>
        No upcoming events
      </div>
    );
  }

  return (
    <div className="divide-y" style={{ borderColor: "var(--border-subtle)" }}>
      {groups.map(([day, list]) => (
        <div key={day} className="py-3">
          <div className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>
            {/* Derive the header from the event's own Date (local), not from the
                "yyyy-MM-dd" key, which new Date() would parse as UTC and shift a day. */}
            {format(new Date(list[0].start), "EEEE, MMM d")}
          </div>
          {list.map((ev) => (
            <EventChip
              key={ev.id}
              variant="row"
              event={{ ...ev, color: categoryColor(categories, ev.categoryKey) }}
              onClick={() => onSelectEvent(ev.id)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

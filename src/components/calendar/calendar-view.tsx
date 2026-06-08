"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { addDays, addWeeks, addMonths, format, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import { toast } from "sonner";
import { monthGridRange, DEFAULT_CATEGORIES, type CalendarCategory } from "@/lib/calendar";
import { CalendarHeader, type CalView } from "./calendar-header";
import { MonthView, type CalEvent } from "./month-view";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { AgendaView } from "./agenda-view";
import { EventEditor, type EventDraft } from "./event-editor";
import { CategoryManager } from "./category-manager";

const toLocalInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

export function CalendarView({ slug, categories: initialCategories }: { slug: string; categories?: CalendarCategory[] }) {
  const [view, setView] = useState<CalView>("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [categories, setCategories] = useState<CalendarCategory[]>(initialCategories?.length ? initialCategories : DEFAULT_CATEGORIES);
  const [editor, setEditor] = useState<{ draft: EventDraft } | null>(null);
  const [managing, setManaging] = useState(false);

  const range = useMemo(() => {
    if (view === "month") return monthGridRange(cursor);
    if (view === "week") return { start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) };
    if (view === "day") return { start: startOfDay(cursor), end: endOfDay(cursor) };
    return { start: startOfDay(new Date()), end: addDays(new Date(), 60) }; // agenda
  }, [view, cursor]);

  const fetchEvents = useCallback(async () => {
    // monthGridRange().end is midnight of the last grid day, so always extend the
    // upper bound to end-of-day to avoid dropping events on the final day.
    const fromIso = range.start.toISOString();
    const toIso = endOfDay(range.end).toISOString();
    const res = await fetch(`/api/sections/${slug}/entries?from=${fromIso}&to=${toIso}`);
    if (!res.ok) { toast.error("Failed to load events"); return; }
    const json = await res.json();
    if (json.template?.calendarCategories?.length) setCategories(json.template.calendarCategories);
    setEvents(
      (json.entries ?? [])
        .filter((e: { start?: string }) => e.start)
        .map((e: CalEvent & { _id?: string }) => ({ ...e, id: e._id ?? e.id }))
    );
  }, [slug, range.start, range.end]);

  // fetchEvents only updates state after an awaited fetch (not synchronously),
  // so this is a normal data-fetch effect, not a cascading-render hazard.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const label = useMemo(() => {
    if (view === "month") return format(cursor, "MMMM yyyy");
    if (view === "day") return format(cursor, "EEEE, MMM d");
    if (view === "week") {
      const s = startOfWeek(cursor, { weekStartsOn: 1 });
      return `${format(s, "MMM d")} – ${format(addDays(s, 6), "MMM d")}`;
    }
    return "Upcoming";
  }, [view, cursor]);

  const step = (dir: 1 | -1) => {
    if (view === "month") setCursor((c) => addMonths(c, dir));
    else if (view === "week") setCursor((c) => addWeeks(c, dir));
    else setCursor((c) => addDays(c, dir));
  };

  const openNew = (date: Date, hour?: number) => {
    const start = hour != null ? new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour) : startOfDay(date);
    const end = hour != null ? new Date(start.getTime() + 3600000) : endOfDay(date);
    setEditor({ draft: { title: "", start: toLocalInput(start), end: toLocalInput(end), allDay: hour == null, categoryKey: categories[0]?.key ?? "" } });
  };

  const openEdit = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    setEditor({ draft: { id, title: ev.title, start: toLocalInput(new Date(ev.start)), end: toLocalInput(new Date(ev.end)), allDay: ev.allDay, categoryKey: ev.categoryKey } });
  };

  const save = async (draft: EventDraft) => {
    const payload = {
      title: draft.title,
      start: new Date(draft.start).toISOString(),
      end: new Date(draft.end).toISOString(),
      allDay: draft.allDay,
      categoryKey: draft.categoryKey,
    };
    const url = draft.id ? `/api/sections/${slug}/entries/${draft.id}` : `/api/sections/${slug}/entries`;
    const res = await fetch(url, { method: draft.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error(j.error ?? "Failed to save"); return; }
    setEditor(null);
    toast.success(draft.id ? "Event updated" : "Event created");
    fetchEvents();
  };

  const remove = async () => {
    if (!editor?.draft.id) return;
    const res = await fetch(`/api/sections/${slug}/entries/${editor.draft.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setEditor(null);
    toast.success("Event deleted");
    fetchEvents();
  };

  const saveCategories = async (next: CalendarCategory[]) => {
    const res = await fetch(`/api/sections/templates/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ calendarCategories: next }),
    });
    if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error(j.error ?? "Failed to save categories"); return; }
    setCategories(next);
    setManaging(false);
    toast.success("Categories saved");
  };

  return (
    <div>
      <CalendarHeader
        view={view}
        label={label}
        onView={setView}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToday={() => setCursor(new Date())}
        onNew={() => openNew(cursor)}
        onManageCategories={() => setManaging(true)}
      />

      {view === "month" && <MonthView month={cursor} events={events} categories={categories} onSelectDay={(d) => { setCursor(d); setView("day"); }} onSelectEvent={openEdit} />}
      {view === "week" && <WeekView date={cursor} events={events} categories={categories} onSelectSlot={(d, h) => openNew(d, h)} onSelectEvent={openEdit} />}
      {view === "day" && <DayView date={cursor} events={events} categories={categories} onSelectSlot={(d, h) => openNew(d, h)} onSelectEvent={openEdit} />}
      {view === "agenda" && <AgendaView events={events} categories={categories} onSelectEvent={openEdit} />}

      {editor && (
        <EventEditor
          key={editor.draft.id ?? "new"}
          open
          categories={categories}
          initial={editor.draft}
          onSave={save}
          onClose={() => setEditor(null)}
          onDelete={editor.draft.id ? remove : undefined}
        />
      )}

      {managing && (
        <CategoryManager open categories={categories} onClose={() => setManaging(false)} onSave={saveCategories} />
      )}
    </div>
  );
}

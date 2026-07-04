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
import { EventInspector, type EventDraft } from "./event-inspector";
import { MiniCalendar } from "./mini-calendar";
import { pickDefaultCalendarView } from "@/lib/default-calendar-view";

const toLocalInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
const hourToDate = (day: Date, h: number) => new Date(startOfDay(day).getTime() + h * 3_600_000);

export function CalendarView({ slug, categories: initialCategories }: { slug: string; categories?: CalendarCategory[] }) {
  const [view, setView] = useState<CalView>("week");
  // On mount, drop to day view on narrow screens.
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setView(pickDefaultCalendarView(true)); // eslint-disable-line react-hooks/set-state-in-effect -- one-time viewport-based default
    }
  }, []);
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [categories, setCategories] = useState<CalendarCategory[]>(initialCategories?.length ? initialCategories : DEFAULT_CATEGORIES);
  const [draft, setDraft] = useState<EventDraft | null>(null);

  const range = useMemo(() => {
    if (view === "month") return monthGridRange(cursor);
    if (view === "week") return { start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) };
    if (view === "day") return { start: startOfDay(cursor), end: endOfDay(cursor) };
    return { start: startOfDay(cursor), end: addDays(startOfDay(cursor), 60) };
  }, [view, cursor]);

  const fetchEvents = useCallback(async () => {
    const fromIso = range.start.toISOString();
    const toIso = endOfDay(range.end).toISOString();
    const res = await fetch(`/api/sections/${slug}/entries?from=${fromIso}&to=${toIso}`);
    if (!res.ok) { toast.error("Failed to load events"); return; }
    const json = await res.json();
    if (json.template?.calendarCategories?.length) setCategories(json.template.calendarCategories);
    setEvents((json.entries ?? []).filter((e: { start?: string }) => e.start).map((e: CalEvent & { _id?: string }) => ({ ...e, id: e._id ?? e.id, description: e.description ?? "" })));
  }, [slug, range.start, range.end]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const monthLabel = format(cursor, "MMMM");
  const yearLabel = format(cursor, "yyyy");
  const step = (dir: 1 | -1) => {
    if (view === "month") setCursor((c) => addMonths(c, dir));
    else if (view === "week") setCursor((c) => addWeeks(c, dir));
    else setCursor((c) => addDays(c, dir));
  };

  const openCreate = (day: Date, startH: number, endH: number) =>
    setDraft({ title: "", start: toLocalInput(hourToDate(day, startH)), end: toLocalInput(hourToDate(day, endH)), allDay: false, categoryKey: categories[0]?.key ?? "", description: "" });
  const openEdit = (id: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    setDraft({ id, title: ev.title, start: toLocalInput(new Date(ev.start)), end: toLocalInput(new Date(ev.end)), allDay: ev.allDay, categoryKey: ev.categoryKey, description: ev.description ?? "" });
  };

  const save = async (d: EventDraft) => {
    const payload = { title: d.title, start: new Date(d.start).toISOString(), end: new Date(d.end).toISOString(), allDay: d.allDay, categoryKey: d.categoryKey, description: d.description };
    const url = d.id ? `/api/sections/${slug}/entries/${d.id}` : `/api/sections/${slug}/entries`;
    const res = await fetch(url, { method: d.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error(j.error ?? "Failed to save"); return; }
    setDraft(null); toast.success(d.id ? "Event updated" : "Event created"); fetchEvents();
  };
  const remove = async () => {
    if (!draft?.id) return;
    const res = await fetch(`/api/sections/${slug}/entries/${draft.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Failed to delete"); return; }
    setDraft(null); toast.success("Event deleted"); fetchEvents();
  };

  const patchTimes = async (id: string, startISO: string, endISO: string) => {
    const ev = events.find((e) => e.id === id);
    if (!ev) return;
    const prev = events;
    setEvents((list) => list.map((e) => (e.id === id ? { ...e, start: startISO, end: endISO } : e)));
    const res = await fetch(`/api/sections/${slug}/entries/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: ev.title, start: startISO, end: endISO, allDay: ev.allDay, categoryKey: ev.categoryKey, description: ev.description ?? "" }),
    });
    if (!res.ok) { setEvents(prev); toast.error("Failed to move event"); }
  };
  const isDraftId = (id: string) => !!draft && (id === "__draft__" || id === draft.id);

  const onMove = (id: string, day: Date, startH: number, endH: number) => {
    const startISO = hourToDate(day, startH).toISOString();
    const endISO = hourToDate(day, endH).toISOString();
    if (draft && isDraftId(id)) {
      // Dragging the in-progress event: move the draft so the placeholder follows.
      setDraft({ ...draft, start: toLocalInput(new Date(startISO)), end: toLocalInput(new Date(endISO)) });
      if (draft.id) patchTimes(draft.id, startISO, endISO); // also persist when editing a saved event
      return;
    }
    patchTimes(id, startISO, endISO);
  };
  const onResize = (id: string, endH: number) => {
    if (draft && isDraftId(id)) {
      const day = startOfDay(new Date(draft.start));
      const startISO = new Date(draft.start).toISOString();
      const endISO = hourToDate(day, endH).toISOString();
      setDraft({ ...draft, end: toLocalInput(new Date(endISO)) });
      if (draft.id) patchTimes(draft.id, startISO, endISO);
      return;
    }
    const ev = events.find((e) => e.id === id); if (!ev) return;
    const day = new Date(ev.start);
    patchTimes(id, new Date(ev.start).toISOString(), hourToDate(day, endH).toISOString());
  };

  const addCategory = async (cat: CalendarCategory) => {
    const next = [...categories, cat];
    const prev = categories;
    setCategories(next);
    const res = await fetch(`/api/sections/templates/${slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ calendarCategories: next }) });
    if (!res.ok) { setCategories(prev); const j = await res.json().catch(() => ({})); toast.error(j.error ?? "Failed to add category"); }
  };

  // Show the in-progress event live in the grid: a placeholder block while creating,
  // or the live-edited version while editing an existing event.
  const renderedEvents = useMemo<CalEvent[]>(() => {
    if (!draft) return events;
    const ds = new Date(draft.start);
    const de = new Date(draft.end);
    if (Number.isNaN(ds.getTime()) || Number.isNaN(de.getTime())) return events;
    const draftEvent: CalEvent = {
      id: draft.id ?? "__draft__",
      title: draft.title,
      start: ds.toISOString(),
      end: de.toISOString(),
      allDay: draft.allDay,
      categoryKey: draft.categoryKey,
      description: draft.description,
    };
    return draft.id
      ? events.map((e) => (e.id === draft.id ? draftEvent : e))
      : [...events, draftEvent];
  }, [events, draft]);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 md:px-6 pt-4 shrink-0">
        <CalendarHeader monthLabel={monthLabel} yearLabel={yearLabel} view={view} onView={setView} onPrev={() => step(-1)} onNext={() => step(1)} />
      </div>

      <div className="relative overflow-hidden flex-1 min-h-0">
        {/* Left mini-calendar rail — desktop only, hidden while editing */}
        <div
          className={`hidden md:block absolute top-0 left-0 h-full w-[240px] overflow-y-auto border-r px-3 py-3 transition-transform duration-[260ms] motion-reduce:transition-none ${draft ? "-translate-x-full" : "translate-x-0"}`}
          style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}
        >
          <MiniCalendar selected={cursor} onPick={(d) => { setCursor(d); setView("day"); }} />
        </div>

        {/* Views wrapper. Desktop: left margin for the mini-cal when idle, right
            margin for the editor when editing. Mobile: full width (editor is a
            bottom-sheet overlay, not a margin). */}
        <div className={`h-full transition-[margin] duration-[260ms] motion-reduce:transition-none ${draft ? "md:mr-[336px]" : "md:ml-[240px]"}`}>
          {view === "month" && <div className="h-full overflow-y-auto px-4 md:px-6 pb-6"><MonthView month={cursor} events={renderedEvents} categories={categories} onSelectDay={(d) => { setCursor(d); setView("day"); }} onSelectEvent={openEdit} /></div>}
          {view === "week" && <div className="h-full px-2 md:px-4 pb-2"><WeekView date={cursor} events={renderedEvents} categories={categories} onCreate={(c) => openCreate(c.day, c.startH, c.endH)} onMove={onMove} onResize={onResize} onSelect={openEdit} /></div>}
          {view === "day" && <div className="h-full px-2 md:px-4 pb-2"><DayView date={cursor} events={renderedEvents} categories={categories} onCreate={(c) => openCreate(c.day, c.startH, c.endH)} onMove={onMove} onResize={onResize} onSelect={openEdit} /></div>}
          {view === "agenda" && <div className="h-full overflow-y-auto px-4 md:px-6 pb-6"><AgendaView events={renderedEvents} categories={categories} onSelectEvent={openEdit} /></div>}
        </div>

        {draft && (
          <EventInspector key={draft.id ?? "new"} open draft={draft} categories={categories}
            onChange={setDraft} onSave={save} onClose={() => setDraft(null)} onDelete={draft.id ? remove : undefined} onAddCategory={addCategory} />
        )}
      </div>
    </div>
  );
}

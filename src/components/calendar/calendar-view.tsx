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

const toLocalInput = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");
const hourToDate = (day: Date, h: number) => new Date(startOfDay(day).getTime() + h * 3_600_000);

export function CalendarView({ slug, categories: initialCategories }: { slug: string; categories?: CalendarCategory[] }) {
  const [view, setView] = useState<CalView>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [categories, setCategories] = useState<CalendarCategory[]>(initialCategories?.length ? initialCategories : DEFAULT_CATEGORIES);
  const [draft, setDraft] = useState<EventDraft | null>(null);

  const range = useMemo(() => {
    if (view === "month") return monthGridRange(cursor);
    if (view === "week") return { start: startOfWeek(cursor, { weekStartsOn: 1 }), end: endOfWeek(cursor, { weekStartsOn: 1 }) };
    if (view === "day") return { start: startOfDay(cursor), end: endOfDay(cursor) };
    return { start: startOfDay(new Date()), end: addDays(new Date(), 60) };
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
  const onMove = (id: string, day: Date, startH: number, endH: number) => patchTimes(id, hourToDate(day, startH).toISOString(), hourToDate(day, endH).toISOString());
  const onResize = (id: string, endH: number) => {
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

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 md:px-6 pt-4 shrink-0">
        <CalendarHeader monthLabel={monthLabel} yearLabel={yearLabel} view={view} onView={setView} onPrev={() => step(-1)} onNext={() => step(1)} />
      </div>

      <div className="relative overflow-hidden flex-1 min-h-0">
        <div className="h-full transition-[margin] duration-[260ms] motion-reduce:transition-none" style={{ marginRight: draft ? 336 : 0 }}>
          {view === "month" && <div className="h-full overflow-y-auto px-4 md:px-6 pb-6"><MonthView month={cursor} events={events} categories={categories} onSelectDay={(d) => { setCursor(d); setView("day"); }} onSelectEvent={openEdit} /></div>}
          {view === "week" && <div className="h-full px-2 md:px-4 pb-2"><WeekView date={cursor} events={events} categories={categories} onCreate={(c) => openCreate(c.day, c.startH, c.endH)} onMove={onMove} onResize={onResize} onSelect={openEdit} /></div>}
          {view === "day" && <div className="h-full px-2 md:px-4 pb-2"><DayView date={cursor} events={events} categories={categories} onCreate={(c) => openCreate(c.day, c.startH, c.endH)} onMove={onMove} onResize={onResize} onSelect={openEdit} /></div>}
          {view === "agenda" && <div className="h-full overflow-y-auto px-4 md:px-6 pb-6"><AgendaView events={events} categories={categories} onSelectEvent={openEdit} /></div>}
        </div>

        {draft && (
          <EventInspector key={draft.id ?? "new"} open draft={draft} categories={categories}
            onChange={setDraft} onSave={save} onClose={() => setDraft(null)} onDelete={draft.id ? remove : undefined} onAddCategory={addCategory} />
        )}
      </div>
    </div>
  );
}

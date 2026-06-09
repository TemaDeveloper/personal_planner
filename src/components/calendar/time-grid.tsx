"use client";

import { useEffect, useRef } from "react";
import { startOfDay, isSameDay } from "date-fns";
import { layoutDayEvents } from "@/lib/event-layout";
import { categoryColor, type CalendarCategory } from "@/lib/calendar";
import { HOUR_HEIGHT, rawHourAtOffset, snapHour, clampRange, DRAG_SNAP_MINUTES } from "@/lib/calendar-grid";
import type { CalEvent } from "./month-view";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const NEUTRAL = "#9b918a";
const LONG_PRESS_MS = 420;
const TOUCH_CANCEL_PX = 10;

type DragState =
  | { kind: "create"; dayIdx: number; startH: number; sh: number; eh: number; el: HTMLDivElement; startClientY: number; moved: boolean }
  | { kind: "move"; ev: CalEvent; dayIdx: number; grabOffH: number; dur: number; sh: number; moved: boolean; el: HTMLDivElement; origEl: HTMLElement; color: string; startClientX: number; startClientY: number }
  | { kind: "resize"; ev: CalEvent; sh: number; eh: number };

export function TimeGrid({
  days,
  events,
  categories,
  onCreate,
  onMove,
  onResize,
  onSelect,
}: {
  days: Date[];
  events: CalEvent[];
  categories: CalendarCategory[];
  onCreate: (draft: { day: Date; startH: number; endH: number }) => void;
  onMove: (id: string, day: Date, startH: number, endH: number) => void;
  onResize: (id: string, endH: number) => void;
  onSelect: (id: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const drag = useRef<DragState | null>(null);
  // Touch: long-press an empty slot to create; tap an event to edit.
  const touch = useRef<{ dayIdx: number; x: number; y: number; evId: string | null; moved: boolean; fired: boolean } | null>(null);
  const lpTimer = useRef(0);
  const clearLP = () => { if (lpTimer.current) { clearTimeout(lpTimer.current); lpTimer.current = 0; } };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
  }, []);

  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
  const hourToDate = (day: Date, h: number) => new Date(startOfDay(day).getTime() + h * 3_600_000);
  const eventHours = (e: CalEvent) => {
    const s = new Date(e.start), en = new Date(e.end);
    const sh = (s.getTime() - startOfDay(s).getTime()) / 3_600_000;
    const eh = sh + (en.getTime() - s.getTime()) / 3_600_000;
    return { sh, eh };
  };

  // RAW (unsnapped) hour under the cursor — the live drag follows the cursor smoothly.
  const offsetHour = (clientY: number, dayIdx: number) => {
    const col = colRefs.current[dayIdx];
    if (!col) return 0;
    const rect = col.getBoundingClientRect();
    return rawHourAtOffset(clientY - rect.top, HOUR_HEIGHT);
  };
  // Snap to a fine 5-min step, used only when committing on release.
  const fine = (h: number) => snapHour(h, DRAG_SNAP_MINUTES);
  const colAt = (clientX: number) => {
    for (let i = 0; i < colRefs.current.length; i++) {
      const r = colRefs.current[i]?.getBoundingClientRect();
      if (r && clientX >= r.left && clientX < r.right) return i;
    }
    return null;
  };

  const fmtH = (h: number) => {
    const hr = Math.floor(h), m = Math.round((h - hr) * 60);
    const ap = hr < 12 ? "AM" : "PM"; const hh = ((hr + 11) % 12) + 1;
    return `${hh}:${m.toString().padStart(2, "0")} ${ap}`;
  };

  const paintPreview = () => {
    const d = drag.current;
    if (!d || d.kind !== "create") return;
    Object.assign(d.el.style, {
      position: "absolute", left: "4px", right: "4px", zIndex: "15",
      top: `${d.sh * HOUR_HEIGHT}px`, height: `${Math.max((d.eh - d.sh) * HOUR_HEIGHT - 3, 16)}px`,
      borderRadius: "8px", borderLeft: `3px dashed ${NEUTRAL}`,
      background: `color-mix(in srgb, ${NEUTRAL} 14%, transparent)`,
      outline: `1.5px dashed color-mix(in srgb, ${NEUTRAL} 52%, transparent)`,
      font: "inherit", fontSize: "12px", padding: "5px 8px", color: "var(--text-primary)",
    });
    d.el.innerHTML = `<div style="font-weight:600">New event</div><div style="font-size:11px;color:var(--text-muted)">${fmtH(fine(d.sh))} – ${fmtH(fine(d.eh))}</div>`;
  };

  const onResizePreview = (d: Extract<DragState, { kind: "resize" }>) => {
    const el = document.querySelector<HTMLElement>(`[data-event-id="${d.ev.id}"]`);
    if (el) el.style.height = `${Math.max((d.eh - d.sh) * HOUR_HEIGHT - 3, 16)}px`;
  };

  // Live "ghost" that follows the cursor while moving an event.
  const paintMoveGhost = (d: Extract<DragState, { kind: "move" }>) => {
    const col = colRefs.current[d.dayIdx];
    if (col && d.el.parentElement !== col) col.appendChild(d.el);
    Object.assign(d.el.style, {
      position: "absolute", left: "4px", right: "4px", zIndex: "20",
      top: `${d.sh * HOUR_HEIGHT}px`, height: `${Math.max(d.dur * HOUR_HEIGHT - 3, 16)}px`,
      borderRadius: "8px", borderLeft: `3px solid ${d.color}`,
      background: `color-mix(in srgb, ${d.color} 22%, var(--surface-1))`,
      boxShadow: "0 12px 28px rgba(0,0,0,.22)", font: "inherit", fontSize: "12px", padding: "5px 8px",
      color: "var(--text-primary)", overflow: "hidden", cursor: "grabbing", pointerEvents: "none",
    });
    d.el.innerHTML = `<div style="font-weight:600">${d.ev.title || "Event"}</div><div style="font-size:11px;color:var(--text-muted)">${fmtH(fine(d.sh))} – ${fmtH(fine(d.sh + d.dur))}</div>`;
  };

  const onMouseDown = (e: React.MouseEvent, dayIdx: number) => {
    const target = e.target as HTMLElement;
    const evEl = target.closest<HTMLElement>("[data-event-id]");
    if (evEl) {
      const id = evEl.dataset.eventId!;
      const ev = events.find((x) => x.id === id);
      if (!ev) return;
      const { sh, eh } = eventHours(ev);
      if (target.dataset.handle === "resize") {
        drag.current = { kind: "resize", ev, sh, eh };
      } else {
        const rect = evEl.getBoundingClientRect();
        drag.current = {
          kind: "move", ev, dayIdx, grabOffH: (e.clientY - rect.top) / HOUR_HEIGHT,
          dur: eh - sh, sh, moved: false,
          el: document.createElement("div"), origEl: evEl, color: categoryColor(categories, ev.categoryKey),
          startClientX: e.clientX, startClientY: e.clientY,
        };
      }
      e.preventDefault();
      return;
    }
    const startH = offsetHour(e.clientY, dayIdx);
    const el = document.createElement("div");
    colRefs.current[dayIdx]?.appendChild(el);
    drag.current = { kind: "create", dayIdx, startH, sh: startH, eh: startH + 0.5, el, startClientY: e.clientY, moved: false };
    paintPreview();
    e.preventDefault();
  };

  const onTouchStart = (e: React.TouchEvent, dayIdx: number) => {
    const t = e.touches[0];
    if (!t) return;
    const target = e.target as HTMLElement;
    const evEl = target.closest<HTMLElement>("[data-event-id]");
    touch.current = { dayIdx, x: t.clientX, y: t.clientY, evId: evEl?.dataset.eventId ?? null, moved: false, fired: false };
    clearLP();
    if (!evEl) {
      // empty area: hold to create
      lpTimer.current = window.setTimeout(() => {
        const tt = touch.current;
        if (!tt || tt.moved) return;
        tt.fired = true;
        const startH = offsetHour(tt.y, dayIdx);
        const r = clampRange(fine(startH), fine(startH + 1));
        if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(8);
        onCreate({ day: days[dayIdx], startH: r.start, endH: r.end });
      }, LONG_PRESS_MS);
    }
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      if (d.kind === "create") {
        if (Math.abs(e.clientY - d.startClientY) > 4) d.moved = true;
        const cur = offsetHour(e.clientY, d.dayIdx);
        d.sh = Math.min(d.startH, cur); d.eh = Math.max(d.startH + 0.5, cur);
        paintPreview();
      } else if (d.kind === "resize") {
        const dayIdx = days.findIndex((day) => isSameDay(day, new Date(d.ev.start)));
        d.eh = clampRange(d.sh, offsetHour(e.clientY, dayIdx < 0 ? 0 : dayIdx)).end;
        onResizePreview(d);
      } else if (d.kind === "move") {
        // Ignore sub-threshold jitter so a click stays a click (opens the editor),
        // not a near-zero move that swallows the select.
        if (!d.moved && Math.hypot(e.clientX - d.startClientX, e.clientY - d.startClientY) <= 4) return;
        if (!d.moved) { d.moved = true; d.origEl.style.opacity = "0.35"; }
        const ci = colAt(e.clientX);
        if (ci != null) d.dayIdx = ci;
        let top = offsetHour(e.clientY - d.grabOffH * HOUR_HEIGHT, d.dayIdx);
        top = Math.min(top, 24 - d.dur);
        d.sh = Math.max(0, top);
        paintMoveGhost(d);
      }
    };
    const up = () => {
      const d = drag.current;
      if (!d) return;
      if (d.kind === "create") {
        d.el.remove();
        // Only create on an intentional drag — a plain click must not spawn an event.
        if (d.moved) {
          const r = clampRange(fine(d.sh), fine(d.eh));
          onCreate({ day: days[d.dayIdx], startH: r.start, endH: r.end });
        }
      } else if (d.kind === "move") {
        d.el.remove();
        d.origEl.style.opacity = "";
        if (!d.moved) onSelect(d.ev.id);
        else onMove(d.ev.id, days[d.dayIdx], fine(d.sh), fine(d.sh + d.dur));
      } else if (d.kind === "resize") {
        onResize(d.ev.id, fine(d.eh));
      }
      drag.current = null;
    };
    const tmove = (e: TouchEvent) => {
      const tt = touch.current; const t = e.touches[0];
      if (!tt || !t) return;
      if (Math.hypot(t.clientX - tt.x, t.clientY - tt.y) > TOUCH_CANCEL_PX) { tt.moved = true; clearLP(); }
    };
    const tend = () => {
      const tt = touch.current;
      clearLP();
      if (tt && !tt.fired && !tt.moved && tt.evId) onSelect(tt.evId);
      touch.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", tmove, { passive: true });
    window.addEventListener("touchend", tend);
    window.addEventListener("touchcancel", tend);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", tmove);
      window.removeEventListener("touchend", tend);
      window.removeEventListener("touchcancel", tend);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, days, onCreate, onMove, onResize, onSelect]);

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-scroll [scrollbar-gutter:stable]">
      <div className="grid relative" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
        <div>
          {HOURS.map((h) => (
            <div key={h} className="text-[10px] text-right pr-2 -translate-y-[7px]" style={{ height: HOUR_HEIGHT, color: "var(--text-faint, rgba(28,25,23,.34))" }}>
              {h === 0 ? "" : fmtH(h).replace(":00", "")}
            </div>
          ))}
        </div>
        {days.map((day, di) => {
          const dayEvents = events.filter((e) => !e.allDay && isSameDay(new Date(e.start), day));
          const positioned = layoutDayEvents(
            dayEvents.map((e) => { const { sh, eh } = eventHours(e); return { id: e.id, start: hourToDate(day, sh), end: hourToDate(day, eh) }; }),
            { dayStart: startOfDay(day), hourHeight: HOUR_HEIGHT, minHeight: 16 }
          );
          const byId = new Map(dayEvents.map((e) => [e.id, e]));
          const now = new Date();
          const showNow = isSameDay(day, now);
          return (
            <div key={day.toISOString()} ref={(el) => { colRefs.current[di] = el; }} data-weekend={isWeekend(day)}
              onMouseDown={(e) => onMouseDown(e, di)}
              onTouchStart={(e) => onTouchStart(e, di)}
              className="relative cursor-crosshair select-none [-webkit-touch-callout:none]"
              style={{ background: isWeekend(day) ? "rgba(63,107,140,.045)" : undefined }}>
              <div className="absolute inset-y-0 left-0 w-px" style={{ background: "var(--border-subtle)" }} />
              {HOURS.map((h) => <div key={h} style={{ height: HOUR_HEIGHT, borderTop: h === 0 ? "none" : "1px solid var(--border-subtle)" }} />)}
              {showNow && (
                <div className="absolute left-0 right-0 pointer-events-none z-[4]"
                  style={{ top: (now.getHours() + now.getMinutes() / 60) * HOUR_HEIGHT, borderTop: "2px solid var(--accent-color)" }}>
                  <span className="absolute -left-1 -top-[5px] w-2 h-2 rounded-full" style={{ background: "var(--accent-color)" }} />
                </div>
              )}
              {positioned.map((p) => {
                const ev = byId.get(p.id)!;
                const cc = categoryColor(categories, ev.categoryKey);
                const { sh, eh } = eventHours(ev);
                return (
                  <div key={p.id} data-event-id={ev.id} onClick={(e) => e.stopPropagation()}
                    className="absolute rounded-lg px-2 py-1 text-[12px] overflow-hidden cursor-grab"
                    style={{ top: p.top, height: p.height, left: `calc(${p.left * 100}% + 4px)`, width: `calc(${p.width * 100}% - 8px)`,
                      borderLeft: `3px solid ${cc}`, background: `color-mix(in srgb, ${cc} 15%, transparent)`, color: "var(--text-primary)" }}>
                    <div className="font-semibold leading-tight pointer-events-none">{ev.title || "New event"}</div>
                    <div className="text-[11px] pointer-events-none" style={{ color: "var(--text-muted)" }}>{fmtH(sh)} – {fmtH(eh)}</div>
                    <div data-handle="resize" className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize" />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

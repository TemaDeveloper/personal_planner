# Calendar Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the calendar UI to an iOS/Google-Calendar feel: borderless week-default grid, Month/Year header, tinted weekends, a slide-in right inspector that replaces all modals, and direct manipulation (drag-to-create with live preview, drag-to-move, drag-to-resize) with inline add-category and a notes field.

**Architecture:** Keep the data layer (events as `CustomEntry`, categories on `SectionTemplate`, `from/to` entries API, `layoutDayEvents` overlap engine). Add one field (`description`). Rewrite the `src/components/calendar/*` view layer: pure drag-math helpers in `src/lib/calendar-grid.ts`, a `TimeGrid` that owns pointer interactions and emits callbacks, an `EventInspector` slide-in panel replacing the modal editor + category manager, and a `CalendarView` orchestrator that owns state + persistence.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Mongoose, Zod, `date-fns`, Vitest + Testing Library. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-08-calendar-redesign-design.md`

---

## File Structure

**New:**
- `src/lib/calendar-grid.ts` — pure drag math (`snapHour`, `hourAtOffset`, `clampRange`, constants).
- `src/components/calendar/event-inspector.tsx` — slide-in right panel (replaces event-editor).

**Rewritten:**
- `src/components/calendar/time-grid.tsx` — aligned columns, weekend tint, now-line, drag create/move/resize, overlap.
- `src/components/calendar/week-view.tsx`, `day-view.tsx` — thin wrappers over `TimeGrid`.
- `src/components/calendar/calendar-header.tsx` — Month/Year, segmented switcher, no Today.
- `src/components/calendar/calendar-view.tsx` — week default, inspector state, DnD persistence, add-category.

**Restyled (visual only):**
- `src/components/calendar/month-view.tsx`, `agenda-view.tsx`, `event-chip.tsx`.

**Deleted:**
- `src/components/calendar/event-editor.tsx`, `src/components/calendar/category-manager.tsx` (+ their tests).

**Modified (data + label):**
- `src/lib/models/custom-entry.ts`, `src/lib/validations.ts`, `src/app/api/sections/[slug]/entries/route.ts`, `src/app/api/sections/[slug]/entries/[id]/route.ts` — `description` field.
- `src/app/(app)/sections/[slug]/page.tsx` — display label "Calendar".

Tests co-located in `__tests__/`. Vitest + Testing Library, `afterEach(cleanup)`.

---

## Task 1: Add `description` to events — TDD

**Files:**
- Modify: `src/lib/models/custom-entry.ts`, `src/lib/validations.ts`, `src/app/api/sections/[slug]/entries/route.ts`, `src/app/api/sections/[slug]/entries/[id]/route.ts`
- Test: `src/lib/__tests__/calendar-description.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/calendar-description.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { validateCalendarEvent } from "../validations";

const cats = [{ key: "work", label: "Work", color: "#3F6B8C" }];

describe("calendar event description", () => {
  it("accepts an event with a description and returns it", () => {
    const r = validateCalendarEvent(
      { title: "x", start: "2026-06-01T09:00:00.000Z", end: "2026-06-01T10:00:00.000Z", allDay: false, categoryKey: "work", description: "buy milk" },
      cats
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.description).toBe("buy milk");
  });

  it("defaults description to empty string when omitted", () => {
    const r = validateCalendarEvent(
      { title: "x", start: "2026-06-01T09:00:00.000Z", end: "2026-06-01T10:00:00.000Z", allDay: false, categoryKey: "work" },
      cats
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.description).toBe("");
  });

  it("rejects an over-long description", () => {
    const r = validateCalendarEvent(
      { title: "x", start: "2026-06-01T09:00:00.000Z", end: "2026-06-01T10:00:00.000Z", allDay: false, categoryKey: "work", description: "a".repeat(2001) },
      cats
    );
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- calendar-description`
Expected: FAIL — `r.value.description` undefined / no max enforced.

- [ ] **Step 3a: Update `src/lib/validations.ts`**

In `calendarEventSchema` add the field (after `categoryKey`):

```ts
  categoryKey: z.string().min(1, "Category is required").max(40),
  description: z.string().max(2000).optional(),
```

In the `ValidatedEvent` type add `description: string;`. In `validateCalendarEvent`, after destructuring, compute and return it:

```ts
  const { title, start, end, categoryKey } = parsed.data;
  const allDay = parsed.data.allDay ?? false;
  const description = parsed.data.description ?? "";
```

and in the success return:

```ts
  return { ok: true, value: { title, start: startDate, end: endDate, allDay, categoryKey, description } };
```

- [ ] **Step 3b: Update `src/lib/models/custom-entry.ts`**

Add to `ICustomEntry` (after `categoryKey?`): `description?: string;`
Add to the schema (after `categoryKey: { type: String }`): `description: { type: String },`

- [ ] **Step 3c: Persist in the entries routes**

In `src/app/api/sections/[slug]/entries/route.ts` POST calendar branch, include `description` in `CustomEntry.create({...})`:

```ts
    const { title, start, end, allDay, categoryKey, description } = result.value;
    const entry = await CustomEntry.create({
      userId,
      templateId: template._id,
      date: startOfDay(start),
      data: {},
      title, start, end, allDay, categoryKey, description,
    });
```

In `src/app/api/sections/[slug]/entries/[id]/route.ts` PATCH calendar branch, include it in the update:

```ts
    const { title, start, end, allDay, categoryKey, description } = result.value;
    const updated = await CustomEntry.findOneAndUpdate(
      { _id: id, userId },
      { title, start, end, allDay, categoryKey, description, date: startOfDay(start) },
      { new: true }
    ).lean();
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- calendar-description` → PASS (3). Then `npm test` (full green) and `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/models/custom-entry.ts src/lib/validations.ts "src/app/api/sections/[slug]/entries/route.ts" "src/app/api/sections/[slug]/entries/[id]/route.ts" src/lib/__tests__/calendar-description.test.ts
git commit -m "feat(calendar): add description/notes field to events

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Drag-math helpers (`src/lib/calendar-grid.ts`) — TDD

**Files:**
- Create: `src/lib/calendar-grid.ts`
- Test: `src/lib/__tests__/calendar-grid.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/calendar-grid.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { HOUR_HEIGHT, snapHour, hourAtOffset, clampRange } from "../calendar-grid";

describe("calendar-grid math", () => {
  it("exposes a positive hour height", () => {
    expect(HOUR_HEIGHT).toBeGreaterThan(0);
  });

  it("snaps to 30-minute increments", () => {
    expect(snapHour(9.1)).toBe(9);
    expect(snapHour(9.3)).toBe(9.5);
    expect(snapHour(9.8)).toBe(10);
  });

  it("clamps snapped hours to [0,24]", () => {
    expect(snapHour(-1)).toBe(0);
    expect(snapHour(30)).toBe(24);
  });

  it("converts a pixel offset to a snapped hour", () => {
    expect(hourAtOffset(0, 48)).toBe(0);
    expect(hourAtOffset(48, 48)).toBe(1);
    expect(hourAtOffset(60, 48)).toBe(1); // 1.25h -> snaps to 1.0... actually 1.25 -> 1.5? see note
  });

  it("clampRange enforces a minimum 30-min duration within the day", () => {
    expect(clampRange(9, 9)).toEqual({ start: 9, end: 9.5 });
    expect(clampRange(23.5, 26)).toEqual({ start: 23.5, end: 24 });
    expect(clampRange(10, 9)).toEqual({ start: 10, end: 10.5 });
  });
});
```

> Note: `hourAtOffset(60,48)` = 1.25h → `snapHour` rounds to nearest 0.5 = 1.5? `Math.round(1.25*2)/2 = Math.round(2.5)/2 = 2/2... = 1`? `Math.round(2.5)=3` in JS? No — `Math.round(2.5)=3`, so 3/2=1.5. Adjust the assertion to `toBe(1.5)` when writing, OR keep offsets on exact boundaries. Use exact-boundary offsets in the test to avoid rounding ambiguity: replace the third `hourAtOffset` assertion with `expect(hourAtOffset(72, 48)).toBe(1.5);` (72/48 = 1.5).

Fix that line before running (use `expect(hourAtOffset(72, 48)).toBe(1.5);`).

- [ ] **Step 2: Run to verify it fails** — `npm test -- calendar-grid` → FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/calendar-grid.ts`**

```ts
/** Pixels per hour in the week/day time grid. */
export const HOUR_HEIGHT = 48;
/** Minutes the grid snaps to. */
export const SNAP_MINUTES = 30;

const SNAP = SNAP_MINUTES / 60; // 0.5

/** Round an hour value to the nearest snap step, clamped to [0, 24]. */
export function snapHour(h: number): number {
  const snapped = Math.round(h / SNAP) * SNAP;
  return Math.max(0, Math.min(24, snapped));
}

/** Convert a vertical pixel offset (from grid top) to a snapped hour. */
export function hourAtOffset(offsetY: number, hourHeight: number = HOUR_HEIGHT): number {
  return snapHour(offsetY / hourHeight);
}

/** Ensure start<=end with a minimum 30-min duration, kept inside [0,24]. */
export function clampRange(start: number, end: number): { start: number; end: number } {
  let s = Math.max(0, Math.min(24, start));
  let e = Math.max(0, Math.min(24, end));
  if (e < s) e = s;
  if (e - s < SNAP) e = s + SNAP;
  if (e > 24) {
    e = 24;
    if (e - s < SNAP) s = 24 - SNAP;
  }
  return { start: s, end: e };
}
```

- [ ] **Step 4: Run to verify it passes** — `npm test -- calendar-grid` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar-grid.ts src/lib/__tests__/calendar-grid.test.ts
git commit -m "feat(calendar): pure drag-math helpers for the time grid

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `event-inspector.tsx` (slide-in panel) — TDD

**Files:**
- Create: `src/components/calendar/event-inspector.tsx`
- Test: `src/components/calendar/__tests__/event-inspector.test.tsx`

Read `src/lib/calendar.ts` (`CALENDAR_PALETTE`, `CalendarCategory`) and `src/components/ui/button.tsx` first.

- [ ] **Step 1: Write the failing tests**

Create `src/components/calendar/__tests__/event-inspector.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { EventInspector } from "../event-inspector";

afterEach(cleanup);

const categories = [
  { key: "work", label: "Work", color: "#3F6B8C" },
  { key: "home", label: "Home", color: "#C0613C" },
];

function setup(overrides = {}) {
  const onChange = vi.fn();
  const onSave = vi.fn();
  const onClose = vi.fn();
  const onAddCategory = vi.fn();
  const draft = { title: "", start: "2026-06-01T09:00", end: "2026-06-01T10:00", allDay: false, categoryKey: "work", description: "" };
  render(
    <EventInspector open draft={draft} categories={categories}
      onChange={onChange} onSave={onSave} onClose={onClose} onAddCategory={onAddCategory} {...overrides} />
  );
  return { onChange, onSave, onClose, onAddCategory };
}

describe("EventInspector", () => {
  it("renders the panel open with the title field", () => {
    setup();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it("does not save when title is empty", () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it("saves a valid event", () => {
    const { onSave } = setup({ draft: { title: "Meeting", start: "2026-06-01T09:00", end: "2026-06-01T10:00", allDay: false, categoryKey: "work", description: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("emits a category change when a chip is clicked", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: /home/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categoryKey: "home" }));
  });

  it("reveals an inline add-category form and emits onAddCategory", () => {
    const { onAddCategory } = setup();
    fireEvent.click(screen.getByRole("button", { name: /\+ new/i }));
    fireEvent.change(screen.getByPlaceholderText(/category name/i), { target: { value: "Travel" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(onAddCategory).toHaveBeenCalledWith(expect.objectContaining({ label: "Travel" }));
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test -- event-inspector` → FAIL (module missing).

- [ ] **Step 3: Implement `src/components/calendar/event-inspector.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CALENDAR_PALETTE, type CalendarCategory } from "@/lib/calendar";

export type EventDraft = {
  id?: string;
  title: string;
  start: string; // datetime-local
  end: string; // datetime-local
  allDay: boolean;
  categoryKey: string;
  description: string;
};

export function EventInspector({
  open,
  draft,
  categories,
  onChange,
  onSave,
  onClose,
  onDelete,
  onAddCategory,
}: {
  open: boolean;
  draft: EventDraft;
  categories: CalendarCategory[];
  onChange: (next: EventDraft) => void;
  onSave: (draft: EventDraft) => void;
  onClose: () => void;
  onDelete?: () => void;
  onAddCategory: (cat: CalendarCategory) => void;
}) {
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState<string>(CALENDAR_PALETTE[1]);

  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) => onChange({ ...draft, [k]: v });

  const fmtTime = (s: string) => {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const submit = () => {
    if (!draft.title.trim()) { setError("Title is required"); return; }
    if (!draft.allDay && new Date(draft.end).getTime() <= new Date(draft.start).getTime()) { setError("End must be after start"); return; }
    setError("");
    onSave(draft);
  };

  const addCat = () => {
    const name = catName.trim();
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") + "_" + (categories.length + 1);
    onAddCategory({ key, label: name, color: catColor });
    onChange({ ...draft, categoryKey: key });
    setAdding(false);
    setCatName("");
  };

  return (
    <aside
      aria-hidden={!open}
      className="absolute top-0 right-0 h-full w-[336px] flex flex-col z-20 transition-transform duration-[260ms] motion-reduce:transition-none"
      style={{
        background: "var(--surface-1)",
        boxShadow: "-12px 0 30px rgba(0,0,0,.06)",
        transform: open ? "translateX(0)" : "translateX(100%)",
      }}
    >
      <div className="flex items-center justify-between px-[18px] pt-4 pb-2.5">
        <span className="text-[11px] tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
          {draft.id ? "Edit event" : "New event"}
        </span>
        <button type="button" aria-label="Close" onClick={onClose} className="w-8 h-8 rounded-lg" style={{ color: "var(--text-muted)" }}>✕</button>
      </div>

      <div className="px-[18px] pb-[18px] flex flex-col gap-[18px] overflow-y-auto">
        <div>
          <label htmlFor="ins-title" className="sr-only">Title</label>
          <input id="ins-title" className="w-full text-[20px] font-semibold bg-transparent outline-none"
            style={{ color: "var(--text-primary)" }} placeholder="Add title"
            value={draft.title} onChange={(e) => set("title", e.target.value)} />
        </div>

        <div className="text-[13px]" style={{ color: "var(--text-muted)" }}>{fmtTime(draft.start)} – {new Date(draft.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>

        <div>
          <div className="text-[11px] tracking-wide uppercase mb-2" style={{ color: "var(--text-muted)" }}>Category</div>
          <div className="flex flex-wrap gap-2 items-center">
            {categories.map((c) => (
              <button key={c.key} type="button" onClick={() => set("categoryKey", c.key)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px]"
                style={{
                  background: draft.categoryKey === c.key ? `color-mix(in srgb, ${c.color} 12%, transparent)` : "var(--surface-1)",
                  border: `1px solid ${draft.categoryKey === c.key ? c.color : "var(--border-default)"}`,
                  color: "var(--text-primary)",
                }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
            <button type="button" onClick={() => setAdding(true)}
              className="rounded-full px-3 py-1.5 text-[12.5px] border border-dashed"
              style={{ borderColor: "var(--border-default)", color: "var(--text-muted)" }}>+ New</button>
          </div>

          {adding && (
            <div className="mt-2.5 p-3 rounded-[10px] flex flex-col gap-2.5" style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)" }}>
              <input placeholder="Category name" maxLength={24} value={catName} onChange={(e) => setCatName(e.target.value)}
                className="rounded-lg px-2.5 py-1.5 text-[13px] outline-none" style={{ background: "var(--surface-1)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
              <div className="flex flex-wrap gap-1.5">
                {CALENDAR_PALETTE.map((hex) => (
                  <button key={hex} type="button" aria-label={`color ${hex}`} onClick={() => setCatColor(hex)}
                    className="w-[22px] h-[22px] rounded-full" style={{ background: hex, outline: catColor === hex ? "2px solid var(--text-primary)" : "none" }} />
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={addCat}>Add</Button>
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] tracking-wide uppercase mb-2" style={{ color: "var(--text-muted)" }}>Notes</div>
          <textarea value={draft.description} onChange={(e) => set("description", e.target.value)}
            placeholder="Add a description for this task…"
            className="w-full min-h-[92px] rounded-[10px] p-2.5 text-[13px] outline-none resize-y"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
        </div>

        {error && <p className="text-[13px]" style={{ color: "var(--alert)" }}>{error}</p>}
      </div>

      <div className="mt-auto flex gap-2 px-[18px] py-3.5">
        {onDelete ? <Button variant="destructive" size="sm" onClick={onDelete}>Delete</Button> : <span />}
        <Button variant="primary" size="sm" className="flex-1" onClick={submit}>Save</Button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run to verify it passes** — `npm test -- event-inspector` → PASS (5). Then `npm test` + `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/event-inspector.tsx src/components/calendar/__tests__/event-inspector.test.tsx
git commit -m "feat(calendar): slide-in event inspector with inline add-category + notes

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Rewrite `time-grid.tsx` (drag create/move/resize, aligned, weekend tint) — TDD smoke

**Files:**
- Rewrite: `src/components/calendar/time-grid.tsx`
- Test: `src/components/calendar/__tests__/time-grid.test.tsx` (replace existing)

The grid covers 0–24h, scrollable, initial scroll to 7am. It owns pointer interactions and emits callbacks. Multi-day timed events render on their start day only.

- [ ] **Step 1: Replace the test**

Overwrite `src/components/calendar/__tests__/time-grid.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TimeGrid } from "../time-grid";

afterEach(cleanup);

const categories = [{ key: "work", label: "Work", color: "#3F6B8C" }];
const days = [new Date(2026, 5, 1), new Date(2026, 5, 6)]; // Mon + Sat
const events = [
  { id: "1", title: "Focus", start: "2026-06-01T09:00:00", end: "2026-06-01T10:00:00", allDay: false, categoryKey: "work", description: "" },
];

describe("TimeGrid", () => {
  it("renders a timed event with its title", () => {
    render(<TimeGrid days={days} events={events} categories={categories}
      onCreate={vi.fn()} onMove={vi.fn()} onResize={vi.fn()} onSelect={vi.fn()} />);
    expect(screen.getByText("Focus")).toBeInTheDocument();
  });

  it("marks weekend columns", () => {
    const { container } = render(<TimeGrid days={days} events={events} categories={categories}
      onCreate={vi.fn()} onMove={vi.fn()} onResize={vi.fn()} onSelect={vi.fn()} />);
    expect(container.querySelectorAll('[data-weekend="true"]').length).toBe(1); // Saturday
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test -- time-grid` → FAIL (signature/exports changed).

- [ ] **Step 3: Implement `src/components/calendar/time-grid.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { startOfDay, isSameDay } from "date-fns";
import { layoutDayEvents } from "@/lib/event-layout";
import { categoryColor, type CalendarCategory } from "@/lib/calendar";
import { HOUR_HEIGHT, hourAtOffset, clampRange } from "@/lib/calendar-grid";
import type { CalEvent } from "./month-view";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const NEUTRAL = "#9b918a";

type DragState =
  | { kind: "create"; dayIdx: number; startH: number; sh: number; eh: number; el: HTMLDivElement }
  | { kind: "move"; ev: CalEvent; dayIdx: number; grabOffH: number; dur: number; sh: number; moved: boolean }
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

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT; // ~7am
  }, []);

  const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
  const hourToDate = (day: Date, h: number) => {
    const base = startOfDay(day);
    return new Date(base.getTime() + h * 3_600_000);
  };
  const eventHours = (e: CalEvent) => {
    const s = new Date(e.start), en = new Date(e.end);
    const sh = (s.getTime() - startOfDay(s).getTime()) / 3_600_000;
    const eh = sh + (en.getTime() - s.getTime()) / 3_600_000;
    return { sh, eh };
  };

  const offsetHour = (clientY: number, dayIdx: number) => {
    const col = colRefs.current[dayIdx];
    if (!col) return 0;
    const rect = col.getBoundingClientRect();
    return hourAtOffset(clientY - rect.top, HOUR_HEIGHT);
  };
  const colAt = (clientX: number) => {
    for (let i = 0; i < colRefs.current.length; i++) {
      const r = colRefs.current[i]?.getBoundingClientRect();
      if (r && clientX >= r.left && clientX < r.right) return i;
    }
    return null;
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
        drag.current = { kind: "move", ev, dayIdx, grabOffH: (e.clientY - rect.top) / HOUR_HEIGHT, dur: eh - sh, sh, moved: false };
      }
      e.preventDefault();
      return;
    }
    // create
    const startH = offsetHour(e.clientY, dayIdx);
    const el = document.createElement("div");
    el.className = "tg-preview";
    colRefs.current[dayIdx]?.appendChild(el);
    drag.current = { kind: "create", dayIdx, startH, sh: startH, eh: startH + 0.5, el };
    paintPreview();
    e.preventDefault();
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
    const lbl = `${fmtH(d.sh)} – ${fmtH(d.eh)}`;
    d.el.innerHTML = `<div style="font-weight:600">New event</div><div style="font-size:11px;color:var(--text-muted)">${lbl}</div>`;
  };

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      if (d.kind === "create") {
        const cur = offsetHour(e.clientY, d.dayIdx);
        d.sh = Math.min(d.startH, cur); d.eh = Math.max(d.startH + 0.5, cur);
        paintPreview();
      } else if (d.kind === "resize") {
        d.eh = clampRange(d.sh, offsetHour(e.clientY, days.findIndex((day) => isSameDay(day, new Date(d.ev.start))))).end;
        onResizePreview(d);
      } else if (d.kind === "move") {
        d.moved = true;
        const ci = colAt(e.clientX);
        if (ci != null) d.dayIdx = ci;
        let top = offsetHour(e.clientY - d.grabOffH * HOUR_HEIGHT, d.dayIdx);
        top = Math.min(top, 24 - d.dur);
        d.sh = Math.max(0, top);
      }
    };
    const up = () => {
      const d = drag.current;
      if (!d) { return; }
      if (d.kind === "create") {
        d.el.remove();
        const r = clampRange(d.sh, d.eh);
        onCreate({ day: days[d.dayIdx], startH: r.start, endH: r.end });
      } else if (d.kind === "move") {
        if (!d.moved) { onSelect(d.ev.id); }
        else {
          const end = d.sh + d.dur;
          onMove(d.ev.id, days[d.dayIdx], d.sh, end);
        }
      } else if (d.kind === "resize") {
        onResize(d.ev.id, d.eh);
      }
      drag.current = null;
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, days, onCreate, onMove, onResize, onSelect]);

  // live resize preview by nudging the DOM node height
  const onResizePreview = (d: Extract<DragState, { kind: "resize" }>) => {
    const el = document.querySelector<HTMLElement>(`[data-event-id="${d.ev.id}"]`);
    if (el) el.style.height = `${Math.max((d.eh - d.sh) * HOUR_HEIGHT - 3, 16)}px`;
  };

  const fmtH = (h: number) => {
    const hr = Math.floor(h), m = Math.round((h - hr) * 60);
    const ap = hr < 12 ? "AM" : "PM"; const hh = ((hr + 11) % 12) + 1;
    return `${hh}:${m.toString().padStart(2, "0")} ${ap}`;
  };

  return (
    <div ref={scrollRef} className="overflow-y-scroll [scrollbar-gutter:stable]" style={{ maxHeight: "64vh" }}>
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
          return (
            <div key={day.toISOString()} ref={(el) => { colRefs.current[di] = el; }} data-weekend={isWeekend(day)}
              onMouseDown={(e) => onMouseDown(e, di)}
              className="relative cursor-crosshair"
              style={{ background: isWeekend(day) ? "rgba(63,107,140,.045)" : undefined }}>
              <div className="absolute inset-0 w-px" style={{ background: "var(--border-subtle)" }} />
              {HOURS.map((h) => <div key={h} style={{ height: HOUR_HEIGHT, borderTop: h === 0 ? "none" : "1px solid var(--border-subtle)" }} />)}
              {positioned.map((p) => {
                const ev = byId.get(p.id)!;
                const cc = categoryColor(categories, ev.categoryKey);
                return (
                  <div key={p.id} data-event-id={ev.id}
                    onClick={(e) => { e.stopPropagation(); }}
                    className="absolute rounded-lg px-2 py-1 text-[12px] overflow-hidden cursor-grab"
                    style={{ top: p.top, height: p.height, left: `calc(${p.left * 100}% + 4px)`, width: `calc(${p.width * 100}% - 8px)`,
                      borderLeft: `3px solid ${cc}`, background: `color-mix(in srgb, ${cc} 15%, transparent)`, color: "var(--text-primary)" }}>
                    <div className="font-semibold leading-tight pointer-events-none">{ev.title || "New event"}</div>
                    <div className="text-[11px] pointer-events-none" style={{ color: "var(--text-muted)" }}>{fmtH(eventHours(ev).sh)} – {fmtH(eventHours(ev).eh)}</div>
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
```

> Implementation note for the engineer: this component manipulates a couple of DOM nodes directly during an in-progress drag (the create preview and the live resize height) for 60fps feel, then defers the authoritative state change to the parent via callbacks on mouse-up. That is intentional. Keep the `data-event-id`/`data-handle`/`data-weekend` hooks — the tests and pointer logic rely on them. After wiring the parent (Task 6), manually verify drag-create/move/resize.

- [ ] **Step 4: Run to verify it passes** — `npm test -- time-grid` → PASS (2). Then `npm test`.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/time-grid.tsx src/components/calendar/__tests__/time-grid.test.tsx
git commit -m "feat(calendar): rewrite time-grid with drag create/move/resize + weekend tint

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Rewrite `week-view.tsx`, `day-view.tsx`, `calendar-header.tsx`

**Files:**
- Rewrite: `src/components/calendar/week-view.tsx`, `src/components/calendar/day-view.tsx`, `src/components/calendar/calendar-header.tsx`
- Test: update `src/components/calendar/__tests__/all-day-strip.test.tsx` to the new prop shape (see Step 4).

- [ ] **Step 1: `week-view.tsx`**

```tsx
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
    <div>
      <div className="grid [scrollbar-gutter:stable] overflow-y-scroll" style={{ gridTemplateColumns: "56px repeat(7,1fr)" }}>
        <div />
        {days.map((d) => (
          <div key={d.toISOString()} className="text-center pb-2" data-weekend={isWeekend(d)} style={{ background: isWeekend(d) ? "rgba(63,107,140,.045)" : undefined }}>
            <div className="text-[11px] uppercase tracking-wide" style={{ color: isWeekend(d) ? "#3F6B8C" : "var(--text-muted)" }}>{format(d, "EEE")}</div>
            <div className="text-[18px] font-medium mt-1 w-[34px] h-[34px] leading-[34px] rounded-full inline-block"
              style={isSameDay(d, new Date()) ? { background: "var(--accent-color)", color: "#fff" } : { color: "var(--text-primary)" }}>{format(d, "d")}</div>
          </div>
        ))}
      </div>
      <AllDayStrip days={days} events={events} categories={categories} onSelectEvent={onSelect} />
      <TimeGrid days={days} events={events} categories={categories} onCreate={onCreate} onMove={onMove} onResize={onResize} onSelect={onSelect} />
    </div>
  );
}
```

- [ ] **Step 2: `day-view.tsx`**

```tsx
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
    <div>
      <AllDayStrip days={[date]} events={events} categories={categories} onSelectEvent={onSelect} />
      <TimeGrid days={[date]} events={events} categories={categories} onCreate={onCreate} onMove={onMove} onResize={onResize} onSelect={onSelect} />
    </div>
  );
}
```

- [ ] **Step 3: Extract `all-day-strip.tsx`**

The all-day strip currently lives inside the old `time-grid.tsx`. Create `src/components/calendar/all-day-strip.tsx`:

```tsx
"use client";

import { startOfDay } from "date-fns";
import { categoryColor, type CalendarCategory } from "@/lib/calendar";
import { EventChip } from "./event-chip";
import type { CalEvent } from "./month-view";

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
    <div className="flex border-b" style={{ borderColor: "var(--border-subtle)" }}>
      <div className="w-14 shrink-0 text-[10px] text-right pr-2 pt-1" style={{ color: "var(--text-muted)" }}>all-day</div>
      {days.map((day) => (
        <div key={day.toISOString()} className="flex-1 border-l p-0.5 space-y-0.5 min-h-6" style={{ borderColor: "var(--border-subtle)" }}>
          {allDay.filter((e) => covers(e, day)).map((e) => (
            <EventChip key={e.id} event={{ ...e, color: categoryColor(categories, e.categoryKey) }} onClick={() => onSelectEvent(e.id)} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: `calendar-header.tsx`**

```tsx
"use client";

export type CalView = "month" | "week" | "day" | "agenda";

export function CalendarHeader({ monthLabel, yearLabel, view, onView, onPrev, onNext }: {
  monthLabel: string; yearLabel: string; view: CalView;
  onView: (v: CalView) => void; onPrev: () => void; onNext: () => void;
}) {
  const views: CalView[] = ["month", "week", "day", "agenda"];
  return (
    <div className="flex items-end justify-between px-1 pb-3.5">
      <div className="flex items-baseline gap-2 leading-none">
        <span className="text-[30px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>{monthLabel}</span>
        <span className="text-[30px] font-light tracking-tight" style={{ color: "var(--text-faint, rgba(28,25,23,.34))" }}>{yearLabel}</span>
      </div>
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-0.5">
          <button type="button" aria-label="Previous" onClick={onPrev} className="w-8 h-8 rounded-lg text-[18px]" style={{ color: "var(--text-muted)" }}>‹</button>
          <button type="button" aria-label="Next" onClick={onNext} className="w-8 h-8 rounded-lg text-[18px]" style={{ color: "var(--text-muted)" }}>›</button>
        </div>
        <div className="flex rounded-[9px] p-0.5" style={{ background: "rgba(28,25,23,.05)" }}>
          {views.map((v) => (
            <button key={v} type="button" onClick={() => onView(v)}
              className="px-3 py-1 text-[12.5px] rounded-[7px] capitalize"
              style={view === v ? { background: "var(--surface-1)", color: "var(--text-primary)", boxShadow: "0 1px 3px rgba(0,0,0,.08)" } : { color: "var(--text-muted)" }}>{v}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update the all-day-strip test** to the extracted module + `description` field. Overwrite `src/components/calendar/__tests__/all-day-strip.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AllDayStrip } from "../all-day-strip";

afterEach(cleanup);

const categories = [{ key: "work", label: "Work", color: "#3F6B8C" }];
const allDayEvent = { id: "a", title: "Holiday", start: "2026-06-01T00:00:00", end: "2026-06-01T23:59:59", allDay: true, categoryKey: "work", description: "" };

describe("AllDayStrip", () => {
  it("renders an all-day event", () => {
    render(<AllDayStrip days={[new Date(2026, 5, 1)]} events={[allDayEvent]} categories={categories} onSelectEvent={vi.fn()} />);
    expect(screen.getByText("Holiday")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Verify** — `npm test` (all green; the old time-grid all-day test is replaced) and `npm run build`.

- [ ] **Step 7: Commit**

```bash
git add src/components/calendar/week-view.tsx src/components/calendar/day-view.tsx src/components/calendar/calendar-header.tsx src/components/calendar/all-day-strip.tsx src/components/calendar/__tests__/all-day-strip.test.tsx
git commit -m "feat(calendar): week/day wrappers, month-year header, extracted all-day strip

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Rewrite `calendar-view.tsx` orchestrator (week default, inspector, DnD persistence)

**Files:**
- Rewrite: `src/components/calendar/calendar-view.tsx`
- Delete: `src/components/calendar/event-editor.tsx`, `src/components/calendar/category-manager.tsx` and their tests.

- [ ] **Step 1: Delete the superseded files**

```bash
git rm src/components/calendar/event-editor.tsx src/components/calendar/category-manager.tsx \
  src/components/calendar/__tests__/event-editor.test.tsx
```
(If `category-manager` had no test, omit it. Verify with `ls src/components/calendar/__tests__`.)

- [ ] **Step 2: Implement `src/components/calendar/calendar-view.tsx`**

```tsx
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

  // ---- create / select ----
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

  // ---- drag move / resize (persist immediately) ----
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

  // ---- add category ----
  const addCategory = async (cat: CalendarCategory) => {
    const next = [...categories, cat];
    const prev = categories;
    setCategories(next);
    const res = await fetch(`/api/sections/templates/${slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ calendarCategories: next }) });
    if (!res.ok) { setCategories(prev); const j = await res.json().catch(() => ({})); toast.error(j.error ?? "Failed to add category"); }
  };

  return (
    <div className="relative">
      <CalendarHeader monthLabel={monthLabel} yearLabel={yearLabel} view={view} onView={setView} onPrev={() => step(-1)} onNext={() => step(1)} />

      <div className="relative overflow-hidden">
        <div className="transition-[margin] duration-[260ms] motion-reduce:transition-none" style={{ marginRight: draft ? 336 : 0 }}>
          {view === "month" && <MonthView month={cursor} events={events} categories={categories} onSelectDay={(d) => { setCursor(d); setView("day"); }} onSelectEvent={openEdit} />}
          {view === "week" && <WeekView date={cursor} events={events} categories={categories} onCreate={(c) => openCreate(c.day, c.startH, c.endH)} onMove={onMove} onResize={onResize} onSelect={openEdit} />}
          {view === "day" && <DayView date={cursor} events={events} categories={categories} onCreate={(c) => openCreate(c.day, c.startH, c.endH)} onMove={onMove} onResize={onResize} onSelect={openEdit} />}
          {view === "agenda" && <AgendaView events={events} categories={categories} onSelectEvent={openEdit} />}
        </div>

        {draft && (
          <EventInspector key={draft.id ?? "new"} open draft={draft} categories={categories}
            onChange={setDraft} onSave={save} onClose={() => setDraft(null)} onDelete={draft.id ? remove : undefined} onAddCategory={addCategory} />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify** — `npm run lint` (expect no errors — note the existing `set-state-in-effect` disable comment is carried over), `npm test` (green), `npm run build` (compiles).

- [ ] **Step 4: Commit**

```bash
git add src/components/calendar/calendar-view.tsx
git commit -m "feat(calendar): week-default orchestrator with slide-in inspector + drag persistence

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Restyle `month-view.tsx`, `agenda-view.tsx`, `event-chip.tsx` + "Calendar" label

**Files:**
- Modify: `src/components/calendar/month-view.tsx` (weekend tint), `src/components/calendar/event-chip.tsx` (minor), `src/app/(app)/sections/[slug]/page.tsx` (label)

- [ ] **Step 1: Weekend tint in `month-view.tsx`**

In the day-cell render of `month-view.tsx`, compute weekend and tint the cell. Find the day-cell `<div ... style={{ background: "var(--surface-1)", opacity: ... }}>` and change the background:

```tsx
              const weekend = d.getDay() === 0 || d.getDay() === 6;
              // ...
              style={{ background: weekend ? "rgba(63,107,140,.045)" : "var(--surface-1)", opacity: isSameMonth(d, month) ? 1 : 0.45 }}
```

(Declare `const weekend = ...` just inside the `days.map((d) => {` body alongside the existing `key`/`list`/`today` consts.)

- [ ] **Step 2: "Calendar" display label**

In `src/app/(app)/sections/[slug]/page.tsx`, the calendar branch currently renders `<CalendarView slug={template.slug} categories={template.calendarCategories} />` with no header — good (no slug shown there). The leak is the nav/title. Verify the sidebar shows `template.name` ("Calendar"). If the page sets a document title or any visible heading from `slug`, replace it with `template.name`. Concretely, ensure the calendar branch returns:

```tsx
  if (template.viewType === "calendar") {
    return (
      <div className="animate-slide-up">
        <CalendarView slug={template.slug} categories={template.calendarCategories} />
      </div>
    );
  }
```

and that `template.name` is `"Calendar"` (it is, from provisioning). No raw slug is rendered. If `app-sidebar.tsx` or `(app)/layout.tsx` ever falls back to slug for the label, change that fallback to `"Calendar"` for calendar-viewType templates. (Read both; the nav maps `name`, so typically no change is needed — confirm and only edit if a slug actually leaks.)

- [ ] **Step 3: Verify** — `npm test` (green), `npm run build`, `npm run lint`.

- [ ] **Step 4: Commit**

```bash
git add src/components/calendar/month-view.tsx src/components/calendar/event-chip.tsx "src/app/(app)/sections/[slug]/page.tsx"
git commit -m "feat(calendar): weekend tint in month view + ensure Calendar display label

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Full verification

**Files:** none.

- [ ] **Step 1:** `npm run lint` → 0 errors. `npm test` → all green. `npm run build` → compiles.
- [ ] **Step 2 (manual, if dev server runs):** On a calendar section: confirm Week is default; header shows `Month Year`, no "Today"/"Calendar"; columns align; weekends tinted; drag-create shows a live-growing preview with live time and opens the slide-in inspector; assigning a category recolors the block; saving persists with notes; dragging an event moves it; bottom-edge resize works; overlaps split side-by-side; "+ New" adds a category inline; no popups appear; nav shows "Calendar".
- [ ] **Step 3 (reduced motion):** With OS reduce-motion, the panel/grid appear without slide animation and the calendar remains usable.

---

## Self-Review

**Spec coverage:**
- Week default → Task 6 (`useState<CalView>("week")`). ✓
- Borderless / edge-to-edge → Tasks 4–6 (no shell border; grid is bare). ✓
- Month/Year header, no "Calendar"/"Today" → Task 5 header. ✓
- Segmented switcher → Task 5 header. ✓
- Weekend tint (week/day/month) → Tasks 4 (grid cols), 5 (week header), 7 (month). ✓
- Now-line → Task 4 (note: the rewrite drops the explicit now-line element; ADDED BELOW). ⚠ see fix.
- Event blocks + overlap side-by-side → Task 4 (`layoutDayEvents`). ✓
- Slide-in inspector replacing modals → Tasks 3, 6 (+ deletions). ✓
- Drag-create live preview + live time → Task 4 (`paintPreview`). ✓
- Fill→assign→describe, recolor live → Tasks 3 (inspector) + 6 (draft on grid). ✓
- Drag-move / resize persisted → Tasks 4 (callbacks) + 6 (`patchTimes`). ✓
- Inline add-category persisted → Tasks 3 + 6 (`addCategory`). ✓
- `description`/notes field end-to-end → Tasks 1, 3, 6. ✓
- "Calendar" label fix → Task 7. ✓
- Column alignment (`scrollbar-gutter`) → Tasks 4, 5. ✓
- Animations + reduced motion → Tasks 3, 6 (`motion-reduce:` + transitions). ✓
- Tests: drag math, inspector, description, view smokes → Tasks 1–5. ✓

**Now-line fix (apply in Task 4):** the rewritten `time-grid.tsx` above omits the now-line. Add it inside each day column's render, after the hour cells, only for today:

```tsx
{isSameDay(day, new Date()) && (
  <div className="absolute left-0 right-0 pointer-events-none z-[4]"
    style={{ top: ((new Date().getHours() + new Date().getMinutes() / 60)) * HOUR_HEIGHT, borderTop: "2px solid var(--accent-color)" }}>
    <span className="absolute -left-1 -top-[5px] w-2 h-2 rounded-full" style={{ background: "var(--accent-color)" }} />
  </div>
)}
```

Add this block in Task 4 Step 3 inside the `days.map` column `<div>`, after the `{HOURS.map(...)}` line. (Recompute is fine on render; a minute-tick refresh is optional and out of scope.)

**Placeholder scan:** No TBD/TODO. Task 7 Step 2 says "confirm and only edit if a slug leaks" — that is a verification instruction with the exact target code shown, not a missing implementation.

**Type consistency:** `EventDraft` now defined in `event-inspector.tsx` (was in `event-editor.tsx`) — imported by `calendar-view.tsx`. `CalEvent` gains `description` via Task 1 model + the fetch mapper defaults it; ensure `month-view.tsx`'s `CalEvent` type adds `description: string`. **Add to Task 1:** in `src/components/calendar/month-view.tsx`, extend the `CalEvent` type with `description: string;`. `TimeGrid` callback names (`onCreate/onMove/onResize/onSelect`) match between Tasks 4, 5, 6. `AllDayStrip` import path updated to `./all-day-strip` in week/day views (Task 5). `HOUR_HEIGHT` imported from `@/lib/calendar-grid` in Task 4.

**Added to Task 1 (type):** Extend `CalEvent` in `month-view.tsx`:
```ts
export type CalEvent = { id: string; title: string; start: string; end: string; allDay: boolean; categoryKey: string; description: string; };
```
Update existing month-view tests/usages that build `CalEvent` literals to include `description: ""` (Task 1 Step 4 run will surface any type errors to fix).

# iOS-Style Calendar Section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `calendar` section viewType with timed + all-day events, color categories, and Month/Week/Day/Agenda views.

**Architecture:** Events are stored as existing `CustomEntry` documents extended with optional calendar fields (`title`, `start`, `end`, `allDay`, `categoryKey`), reusing the entries CRUD API. Color categories live on the `SectionTemplate`. The `sections/[slug]` page routes `viewType === "calendar"` to a new `CalendarView` orchestrator that renders one of four sub-views. The complex hour-grid overlap math is isolated in a pure, unit-tested function.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Mongoose, Zod, `date-fns`, `react-day-picker`, Vitest + Testing Library. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-06-08-calendar-section-design.md`

---

## File Structure

**New — pure logic (no React):**
- `src/lib/calendar.ts` — palette, default categories, `categoryColor()`, month-grid range helper.
- `src/lib/event-layout.ts` — `layoutDayEvents()` overlap/positioning (the risky logic).

**New — components (`src/components/calendar/`):**
- `calendar-view.tsx` — orchestrator (date + active view + categories + fetch + editor modal).
- `calendar-header.tsx` — view switcher + date navigator + "New event".
- `event-chip.tsx` — presentational colored event chip/block.
- `month-view.tsx` — month grid with chips.
- `event-layout` is consumed by `time-grid.tsx` — shared hour grid for week/day.
- `week-view.tsx`, `day-view.tsx` — wrap `time-grid`.
- `agenda-view.tsx` — grouped chronological list.
- `event-editor.tsx` — create/edit modal.
- `category-manager.tsx` — add/rename/recolor/delete categories.

**Modified:**
- `src/lib/models/custom-entry.ts`, `src/lib/models/section-template.ts`, `src/lib/validations.ts`
- `src/app/api/sections/[slug]/entries/route.ts`, `.../entries/[id]/route.ts`
- `src/app/api/sections/templates/route.ts`, `.../templates/[slug]/route.ts`
- `src/app/(app)/sections/[slug]/page.tsx`

Tests are co-located in `__tests__/` folders (repo convention), Vitest + Testing Library, `afterEach(cleanup)`.

---

## Task 1: Calendar domain library (`src/lib/calendar.ts`) — TDD

**Files:**
- Create: `src/lib/calendar.ts`
- Test: `src/lib/__tests__/calendar.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/calendar.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  CALENDAR_PALETTE,
  DEFAULT_CATEGORIES,
  categoryColor,
  monthGridRange,
} from "../calendar";

describe("calendar lib", () => {
  it("exposes a non-empty hex palette", () => {
    expect(CALENDAR_PALETTE.length).toBeGreaterThan(0);
    for (const c of CALENDAR_PALETTE) expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("seeds three default categories with palette colors", () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(3);
    for (const c of DEFAULT_CATEGORIES) {
      expect(CALENDAR_PALETTE).toContain(c.color);
      expect(c.key).toMatch(/^[a-z0-9_]+$/);
    }
  });

  it("categoryColor returns the matching category color", () => {
    const cats = [{ key: "work", label: "Work", color: "#3F6B8C" }];
    expect(categoryColor(cats, "work")).toBe("#3F6B8C");
  });

  it("categoryColor falls back to the first category for unknown keys", () => {
    const cats = [{ key: "a", label: "A", color: "#C0613C" }];
    expect(categoryColor(cats, "missing")).toBe("#C0613C");
  });

  it("categoryColor falls back to a neutral grey when there are no categories", () => {
    expect(categoryColor([], "x")).toBe("#5C5552");
  });

  it("monthGridRange spans whole weeks (Mon-start) covering the month", () => {
    // June 2026: June 1 is a Monday.
    const { start, end } = monthGridRange(new Date(2026, 5, 15));
    expect(start.getDay()).toBe(1); // Monday
    expect(start <= new Date(2026, 5, 1)).toBe(true);
    expect(end >= new Date(2026, 5, 30)).toBe(true);
    // whole number of weeks
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
    expect(days % 7).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- calendar.test`
Expected: FAIL — `../calendar` not found.

- [ ] **Step 3: Implement `src/lib/calendar.ts`**

```ts
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";

export type CalendarCategory = {
  key: string;
  label: string;
  color: string; // hex from CALENDAR_PALETTE
};

/** Fixed, theme-coherent palette (chart tokens + a few extras), stored as hex. */
export const CALENDAR_PALETTE = [
  "#C0613C", // clay
  "#3F6B8C", // ocean
  "#7A5C7E", // plum
  "#C99A3B", // amber
  "#5E8C6A", // sage
  "#C0524A", // red
  "#3F8C86", // teal
  "#5C5552", // graphite
] as const;

export const DEFAULT_CATEGORIES: CalendarCategory[] = [
  { key: "personal", label: "Personal", color: "#C0613C" },
  { key: "work", label: "Work", color: "#3F6B8C" },
  { key: "health", label: "Health", color: "#5E8C6A" },
];

const NEUTRAL_FALLBACK = "#5C5552";

/** Color for an event's category, falling back to the first category or neutral grey. */
export function categoryColor(categories: CalendarCategory[], key: string | undefined): string {
  if (!categories.length) return NEUTRAL_FALLBACK;
  const found = categories.find((c) => c.key === key);
  return (found ?? categories[0]).color;
}

/** Inclusive [start, end] range of the month grid (whole Mon-started weeks). */
export function monthGridRange(d: Date): { start: Date; end: Date } {
  const start = startOfWeek(startOfMonth(d), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(d), { weekStartsOn: 1 });
  return { start, end };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- calendar.test`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calendar.ts src/lib/__tests__/calendar.test.ts
git commit -m "feat(calendar): domain library — palette, categories, grid range

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Event layout engine (`src/lib/event-layout.ts`) — TDD

This is the riskiest logic. Pure function, heavily tested.

**Files:**
- Create: `src/lib/event-layout.ts`
- Test: `src/lib/__tests__/event-layout.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/event-layout.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { layoutDayEvents } from "../event-layout";

const day = new Date(2026, 5, 1, 0, 0, 0, 0); // 2026-06-01 00:00 local
const at = (h: number, m = 0) => new Date(2026, 5, 1, h, m, 0, 0);

describe("layoutDayEvents", () => {
  const opts = { dayStart: day, hourHeight: 48, minHeight: 12 };

  it("gives a single event full width", () => {
    const [p] = layoutDayEvents([{ id: "a", start: at(9), end: at(10) }], opts);
    expect(p.left).toBe(0);
    expect(p.width).toBe(1);
    expect(p.top).toBe(9 * 48);
    expect(p.height).toBe(48);
  });

  it("splits two overlapping events into two columns", () => {
    const res = layoutDayEvents(
      [
        { id: "a", start: at(9), end: at(10, 30) },
        { id: "b", start: at(10), end: at(11) },
      ],
      opts
    );
    const a = res.find((p) => p.id === "a")!;
    const b = res.find((p) => p.id === "b")!;
    expect(a.width).toBeCloseTo(0.5);
    expect(b.width).toBeCloseTo(0.5);
    expect(new Set([a.left, b.left])).toEqual(new Set([0, 0.5]));
  });

  it("does NOT overlap back-to-back events (end == next start)", () => {
    const res = layoutDayEvents(
      [
        { id: "a", start: at(9), end: at(10) },
        { id: "b", start: at(10), end: at(11) },
      ],
      opts
    );
    expect(res.find((p) => p.id === "a")!.width).toBe(1);
    expect(res.find((p) => p.id === "b")!.width).toBe(1);
  });

  it("splits a three-way overlap into thirds", () => {
    const res = layoutDayEvents(
      [
        { id: "a", start: at(9), end: at(12) },
        { id: "b", start: at(9, 30), end: at(11) },
        { id: "c", start: at(10), end: at(11) },
      ],
      opts
    );
    for (const p of res) expect(p.width).toBeCloseTo(1 / 3);
    expect(new Set(res.map((p) => p.left))).toEqual(new Set([0, 1 / 3, 2 / 3]));
  });

  it("enforces a minimum height for very short events", () => {
    const [p] = layoutDayEvents([{ id: "a", start: at(9), end: at(9, 5) }], opts);
    expect(p.height).toBe(12);
  });

  it("positions a full-day event from top to bottom", () => {
    const [p] = layoutDayEvents(
      [{ id: "a", start: at(0), end: new Date(2026, 5, 2, 0, 0, 0, 0) }],
      opts
    );
    expect(p.top).toBe(0);
    expect(p.height).toBe(24 * 48);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- event-layout.test`
Expected: FAIL — `../event-layout` not found.

- [ ] **Step 3: Implement `src/lib/event-layout.ts`**

```ts
export type LayoutEvent = { id: string; start: Date; end: Date };

export type LayoutOptions = {
  dayStart: Date; // 00:00 of the column's day
  hourHeight: number; // px per hour
  minHeight?: number; // px floor for very short events (default 12)
};

export type PositionedEvent = {
  id: string;
  top: number; // px from grid top
  height: number; // px
  left: number; // fraction 0..1
  width: number; // fraction 0..1
};

const HOUR_MS = 3_600_000;

/**
 * Position timed events for a single day column. Overlapping events are packed
 * into equal-width columns (interval-graph greedy packing); back-to-back events
 * (a.end === b.start) do NOT overlap.
 */
export function layoutDayEvents(
  events: LayoutEvent[],
  opts: LayoutOptions
): PositionedEvent[] {
  const minHeight = opts.minHeight ?? 12;
  const dayStartMs = opts.dayStart.getTime();

  const vertical = (ev: LayoutEvent) => {
    const top = ((ev.start.getTime() - dayStartMs) / HOUR_MS) * opts.hourHeight;
    const rawHeight =
      ((ev.end.getTime() - ev.start.getTime()) / HOUR_MS) * opts.hourHeight;
    return { top, height: Math.max(rawHeight, minHeight) };
  };

  const sorted = [...events].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime()
  );

  const result: PositionedEvent[] = [];
  let cluster: LayoutEvent[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const colEnd: number[] = []; // end time per column
    const colOf = new Map<string, number>();
    for (const ev of cluster) {
      let placed = false;
      for (let i = 0; i < colEnd.length; i++) {
        if (colEnd[i] <= ev.start.getTime()) {
          colOf.set(ev.id, i);
          colEnd[i] = ev.end.getTime();
          placed = true;
          break;
        }
      }
      if (!placed) {
        colOf.set(ev.id, colEnd.length);
        colEnd.push(ev.end.getTime());
      }
    }
    const total = colEnd.length;
    for (const ev of cluster) {
      const col = colOf.get(ev.id)!;
      result.push({ id: ev.id, ...vertical(ev), left: col / total, width: 1 / total });
    }
    cluster = [];
  };

  for (const ev of sorted) {
    if (cluster.length && ev.start.getTime() >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.end.getTime());
  }
  flush();

  return result;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- event-layout.test`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/event-layout.ts src/lib/__tests__/event-layout.test.ts
git commit -m "feat(calendar): pure event-layout engine for week/day overlap packing

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Data model + Zod validation — TDD

**Files:**
- Modify: `src/lib/models/custom-entry.ts`
- Modify: `src/lib/models/section-template.ts`
- Modify: `src/lib/validations.ts`
- Test: `src/lib/__tests__/calendar-validations.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/__tests__/calendar-validations.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { calendarEventSchema, validateCalendarEvent } from "../validations";

const cats = [
  { key: "work", label: "Work", color: "#3F6B8C" },
  { key: "home", label: "Home", color: "#C0613C" },
];

describe("calendarEventSchema (shape)", () => {
  it("accepts a valid timed event", () => {
    const r = calendarEventSchema.safeParse({
      title: "Standup",
      start: "2026-06-01T09:00:00.000Z",
      end: "2026-06-01T09:30:00.000Z",
      allDay: false,
      categoryKey: "work",
    });
    expect(r.success).toBe(true);
  });

  it("rejects a missing title", () => {
    const r = calendarEventSchema.safeParse({
      start: "2026-06-01T09:00:00.000Z",
      end: "2026-06-01T09:30:00.000Z",
      categoryKey: "work",
    });
    expect(r.success).toBe(false);
  });
});

describe("validateCalendarEvent (business rules)", () => {
  it("rejects end <= start for timed events", () => {
    const r = validateCalendarEvent(
      { title: "x", start: "2026-06-01T10:00:00.000Z", end: "2026-06-01T09:00:00.000Z", allDay: false, categoryKey: "work" },
      cats
    );
    expect(r.ok).toBe(false);
  });

  it("rejects an unknown categoryKey", () => {
    const r = validateCalendarEvent(
      { title: "x", start: "2026-06-01T09:00:00.000Z", end: "2026-06-01T10:00:00.000Z", allDay: false, categoryKey: "nope" },
      cats
    );
    expect(r.ok).toBe(false);
  });

  it("accepts a valid timed event and returns Date objects", () => {
    const r = validateCalendarEvent(
      { title: "x", start: "2026-06-01T09:00:00.000Z", end: "2026-06-01T10:00:00.000Z", allDay: false, categoryKey: "work" },
      cats
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.start).toBeInstanceOf(Date);
      expect(r.value.end.getTime()).toBeGreaterThan(r.value.start.getTime());
    }
  });

  it("accepts an all-day event without requiring end > start strictly", () => {
    const r = validateCalendarEvent(
      { title: "Holiday", start: "2026-06-01T00:00:00.000Z", end: "2026-06-01T23:59:59.999Z", allDay: true, categoryKey: "home" },
      cats
    );
    expect(r.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- calendar-validations.test`
Expected: FAIL — `calendarEventSchema` / `validateCalendarEvent` not exported.

- [ ] **Step 3a: Extend `src/lib/models/custom-entry.ts`**

Replace the interface and schema body to add the optional calendar fields (keep everything else):

```ts
import mongoose, { Schema, type Document } from "mongoose";

export interface ICustomEntry extends Document {
  userId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  date: Date;
  data: Record<string, unknown>;
  order: number;
  // Calendar fields (only set by calendar-viewType sections):
  title?: string;
  start?: Date;
  end?: Date;
  allDay?: boolean;
  categoryKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomEntrySchema = new Schema<ICustomEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    templateId: { type: Schema.Types.ObjectId, ref: "SectionTemplate", required: true },
    date: { type: Date, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    order: { type: Number, default: 0 },
    title: { type: String },
    start: { type: Date },
    end: { type: Date },
    allDay: { type: Boolean },
    categoryKey: { type: String },
  },
  { timestamps: true }
);

CustomEntrySchema.index({ userId: 1, templateId: 1, date: -1 });
CustomEntrySchema.index({ userId: 1, templateId: 1, start: 1 });

if (mongoose.models.CustomEntry) mongoose.deleteModel("CustomEntry");
export default mongoose.model<ICustomEntry>("CustomEntry", CustomEntrySchema);
```

- [ ] **Step 3b: Extend `src/lib/models/section-template.ts`**

Add the `CalendarCategory` shape, `calendar` to the viewType union/enum, and `calendarCategories`:

1. After the `IFieldDefinition` interface, add:

```ts
export interface ICalendarCategory {
  key: string;
  label: string;
  color: string;
}
```

2. In `ISectionTemplate`, change `viewType` and add the categories field:

```ts
  viewType: "weekly-cards" | "table" | "grid" | "board" | "calendar";
  calendarCategories?: ICalendarCategory[];
```

3. Add a sub-schema before `SectionTemplateSchema`:

```ts
const CalendarCategorySchema = new Schema<ICalendarCategory>(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    color: { type: String, required: true },
  },
  { _id: false }
);
```

4. In `SectionTemplateSchema`, update the `viewType` enum and add the field:

```ts
    viewType: {
      type: String,
      enum: ["weekly-cards", "table", "grid", "board", "calendar"],
      default: "weekly-cards",
    },
    calendarCategories: { type: [CalendarCategorySchema], default: undefined },
```

- [ ] **Step 3c: Add validation to `src/lib/validations.ts`**

Append at the end of the file:

```ts
// -- Calendar --
export const calendarCategorySchema = z.object({
  key: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/i, "key must be alphanumeric/underscore"),
  label: z.string().min(1).max(40),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "color must be a hex value"),
});

export const calendarCategoriesUpdateSchema = z.object({
  calendarCategories: z.array(calendarCategorySchema).min(1).max(20),
});

export const calendarEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  start: z.string().min(1, "Start is required"),
  end: z.string().min(1, "End is required"),
  allDay: z.boolean().optional(),
  categoryKey: z.string().min(1, "Category is required").max(40),
});

export type CalendarEventInput = z.infer<typeof calendarEventSchema>;

type ValidatedEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  categoryKey: string;
};

/** Business-rule validation beyond shape: dates parse, end > start (timed), known category. */
export function validateCalendarEvent(
  input: unknown,
  categories: { key: string }[]
): { ok: true; value: ValidatedEvent } | { ok: false; error: string } {
  const parsed = calendarEventSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid event" };
  }
  const { title, start, end, categoryKey } = parsed.data;
  const allDay = parsed.data.allDay ?? false;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return { ok: false, error: "Invalid date" };
  }
  if (!allDay && endDate.getTime() <= startDate.getTime()) {
    return { ok: false, error: "End must be after start" };
  }
  if (allDay && endDate.getTime() < startDate.getTime()) {
    return { ok: false, error: "End must not be before start" };
  }
  if (!categories.some((c) => c.key === categoryKey)) {
    return { ok: false, error: "Unknown category" };
  }
  return { ok: true, value: { title, start: startDate, end: endDate, allDay, categoryKey } };
}
```

Also update the existing `singleSectionUpdateSchema.viewType` enum to include `"calendar"`:

```ts
  viewType: z.enum(["weekly-cards", "table", "grid", "board", "calendar"]).default("weekly-cards"),
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- calendar-validations.test`
Expected: PASS (7 tests). Also run `npm test` to confirm no regressions in existing model/validation tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/models/custom-entry.ts src/lib/models/section-template.ts src/lib/validations.ts src/lib/__tests__/calendar-validations.test.ts
git commit -m "feat(calendar): data model + zod validation for events and categories

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Entries API — range query + calendar fields

**Files:**
- Modify: `src/app/api/sections/[slug]/entries/route.ts`
- Modify: `src/app/api/sections/[slug]/entries/[id]/route.ts`

This task wires the validated calendar fields into the existing entry routes. No new test file (covered by Task 3 validation tests + the manual verification in Task 12); verify via build + existing suite.

- [ ] **Step 1: Update GET in `entries/route.ts` to support `from`/`to`**

In `src/app/api/sections/[slug]/entries/route.ts`, locate the block that reads query params (currently `weekOf` and `all`) and the `if (all) {...} else {...}` fetch. Replace the query-handling section (lines ~28–57) with:

```ts
  const { searchParams } = new URL(req.url);
  const weekOf = searchParams.get("weekOf");
  const all = searchParams.get("all") === "1";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let entries;
  if (from && to) {
    // Calendar range: entries whose [start,end] overlap [from,to], or whose
    // date falls in range (for entries lacking explicit start/end).
    const fromDate = new Date(from);
    const toDate = new Date(to);
    entries = await CustomEntry.find({
      userId,
      templateId: template._id,
      $or: [
        { start: { $lte: toDate }, end: { $gte: fromDate } },
        { start: { $exists: false }, date: { $gte: fromDate, $lte: toDate } },
      ],
    })
      .sort({ start: 1, date: 1 })
      .lean();
  } else if (all) {
    entries = await CustomEntry.find({
      userId,
      templateId: template._id,
    })
      .sort({ order: 1, createdAt: -1 })
      .lean();
  } else {
    let start: Date, end: Date;
    if (weekOf) {
      const d = new Date(weekOf);
      start = startOfWeek(d, { weekStartsOn: 1 });
      end = endOfWeek(d, { weekStartsOn: 1 });
    } else {
      start = startOfWeek(new Date(), { weekStartsOn: 1 });
      end = endOfWeek(new Date(), { weekStartsOn: 1 });
    }
    entries = await CustomEntry.find({
      userId,
      templateId: template._id,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: -1 })
      .lean();
  }

  return NextResponse.json({ template, entries });
```

- [ ] **Step 2: Update POST in `entries/route.ts` to accept calendar events**

In the same file, add an import at the top:

```ts
import { createCustomEntrySchema, validateCalendarEvent } from "@/lib/validations";
import { startOfDay } from "date-fns";
```

(`startOfDay` is already imported — keep a single import; just ensure `validateCalendarEvent` is added to the validations import.)

Then replace the POST body-handling (from `const body = await req.json();` to the `CustomEntry.create(...)` call) with a branch on `viewType`:

```ts
  const body = await req.json();

  if (template.viewType === "calendar") {
    const result = validateCalendarEvent(body, template.calendarCategories ?? []);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const { title, start, end, allDay, categoryKey } = result.value;
    const entry = await CustomEntry.create({
      userId,
      templateId: template._id,
      date: startOfDay(start),
      data: {},
      title,
      start,
      end,
      allDay,
      categoryKey,
    });
    return NextResponse.json({ entry }, { status: 201 });
  }

  const parsed = createCustomEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { date, data } = parsed.data;

  const validKeys = new Set(template.fields.map((f) => f.key));
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (validKeys.has(key)) {
      cleanData[key] = value;
    }
  }

  const entry = await CustomEntry.create({
    userId,
    templateId: template._id,
    date: startOfDay(new Date(date)),
    data: cleanData,
  });

  return NextResponse.json({ entry }, { status: 201 });
```

- [ ] **Step 3: Update PATCH in `entries/[id]/route.ts` to accept calendar events**

Open `src/app/api/sections/[slug]/entries/[id]/route.ts`. It currently updates `data`/`order`. Add calendar handling: after loading the `template` (fetch it by slug if not already loaded) and the target entry, branch when `template.viewType === "calendar"`:

```ts
// near the top imports:
import { validateCalendarEvent } from "@/lib/validations";
import { startOfDay } from "date-fns";
```

In the PATCH handler, before the existing `data`/`order` update logic, add:

```ts
  if (template.viewType === "calendar") {
    const result = validateCalendarEvent(body, template.calendarCategories ?? []);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const { title, start, end, allDay, categoryKey } = result.value;
    const updated = await CustomEntry.findOneAndUpdate(
      { _id: id, userId },
      { title, start, end, allDay, categoryKey, date: startOfDay(start) },
      { new: true }
    ).lean();
    if (!updated) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    return NextResponse.json({ entry: updated });
  }
```

> Note: if the `[id]` route does not currently load `template`, add `const template = await SectionTemplate.findOne({ slug }).lean();` (import `SectionTemplate`) and a 404 if missing, mirroring `entries/route.ts`. Read the file first and adapt to its existing structure; keep the non-calendar path unchanged.

- [ ] **Step 4: Verify build + suite**

Run: `npm run build` → Expected: compiles, no type errors.
Run: `npm test` → Expected: all existing + Task-3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/sections/[slug]/entries/route.ts" "src/app/api/sections/[slug]/entries/[id]/route.ts"
git commit -m "feat(calendar): entries API accepts calendar events + from/to range query

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Template API — seed categories + accept category edits

**Files:**
- Modify: `src/app/api/sections/templates/route.ts` (POST create)
- Modify: `src/app/api/sections/templates/[slug]/route.ts` (PATCH)

- [ ] **Step 1: Read both files** to learn their exact current shape (validation schema used, how the template doc is created/updated). Note the existing PATCH already allows `viewType: "board"` per recent work — extend that allowance to `"calendar"`.

- [ ] **Step 2: Seed default categories on create**

In `templates/route.ts` POST, after building the template payload and before `SectionTemplate.create(...)`, add:

```ts
import { DEFAULT_CATEGORIES } from "@/lib/calendar";
// ...
// when creating, if a calendar section has no categories, seed defaults:
const calendarCategories =
  payload.viewType === "calendar"
    ? (payload.calendarCategories?.length ? payload.calendarCategories : DEFAULT_CATEGORIES)
    : undefined;
```

Include `calendarCategories` (when defined) in the `SectionTemplate.create({...})` call. Ensure the create validation schema permits `viewType: "calendar"` and an optional `calendarCategories` array (reuse `calendarCategorySchema` from validations; add it to whatever Zod object validates template creation, or accept it explicitly).

- [ ] **Step 3: Accept `calendarCategories` + `viewType: calendar` on PATCH**

In `templates/[slug]/route.ts` PATCH, where it currently whitelists fields (and allows `viewType` including `board`), add `"calendar"` to the allowed `viewType` values and allow updating `calendarCategories` validated by `calendarCategoriesUpdateSchema` (import from validations). On a categories update, set the field to the validated array (require ≥1 — the schema enforces this). Keep all other PATCH behavior unchanged.

- [ ] **Step 4: Verify build + suite**

Run: `npm run build` → Expected: compiles.
Run: `npm test` → Expected: green.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/sections/templates/route.ts" "src/app/api/sections/templates/[slug]/route.ts"
git commit -m "feat(calendar): seed default categories on create, accept category edits on PATCH

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: `event-chip.tsx` + `event-editor.tsx` — TDD on the editor

**Files:**
- Create: `src/components/calendar/event-chip.tsx`
- Create: `src/components/calendar/event-editor.tsx`
- Test: `src/components/calendar/__tests__/event-editor.test.tsx`

First read `src/components/ui/modal.tsx`, `form-input.tsx`, `button.tsx`, `confirm-dialog.tsx`, and `src/components/sections/custom-entry-form.tsx` to match prop shapes and import paths.

- [ ] **Step 1: Implement `event-chip.tsx`** (presentational, no test needed)

```tsx
"use client";

export type ChipEvent = {
  id: string;
  title: string;
  color: string;
  allDay?: boolean;
  start?: string | Date;
};

export function EventChip({
  event,
  onClick,
  variant = "chip",
}: {
  event: ChipEvent;
  onClick?: () => void;
  variant?: "chip" | "block" | "row";
}) {
  const time =
    !event.allDay && event.start
      ? new Date(event.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
      : null;

  if (variant === "block") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full h-full text-left rounded-md px-1.5 py-1 text-xs overflow-hidden"
        style={{ background: `${event.color}22`, borderLeft: `3px solid ${event.color}`, color: "var(--text-primary)" }}
      >
        <span className="font-medium">{event.title}</span>
      </button>
    );
  }

  if (variant === "row") {
    return (
      <button type="button" onClick={onClick} className="w-full flex items-center gap-2 py-1.5 text-left">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: event.color }} />
        {time && <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{time}</span>}
        <span className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{event.title}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-1 rounded px-1 py-0.5 text-[11px] truncate"
      style={{ background: `${event.color}22`, color: "var(--text-primary)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: event.color }} />
      <span className="truncate">{event.title}</span>
    </button>
  );
}
```

- [ ] **Step 2: Write the failing editor tests**

Create `src/components/calendar/__tests__/event-editor.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { EventEditor } from "../event-editor";

afterEach(cleanup);

const categories = [
  { key: "work", label: "Work", color: "#3F6B8C" },
  { key: "home", label: "Home", color: "#C0613C" },
];

function renderEditor(overrides = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <EventEditor
      open
      categories={categories}
      initial={{ start: "2026-06-01T09:00", end: "2026-06-01T10:00", allDay: false, categoryKey: "work", title: "" }}
      onSave={onSave}
      onClose={onClose}
      {...overrides}
    />
  );
  return { onSave, onClose };
}

describe("EventEditor", () => {
  it("disables time inputs when all-day is on", () => {
    renderEditor({ initial: { start: "2026-06-01T09:00", end: "2026-06-01T10:00", allDay: true, categoryKey: "work", title: "X" } });
    const start = screen.getByLabelText(/start/i) as HTMLInputElement;
    expect(start.disabled).toBe(true);
  });

  it("does not save when end <= start", () => {
    const { onSave } = renderEditor();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Meeting" } });
    fireEvent.change(screen.getByLabelText(/^end/i), { target: { value: "2026-06-01T08:00" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/after start/i)).toBeInTheDocument();
  });

  it("saves a valid event with the selected category", () => {
    const { onSave } = renderEditor();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Meeting" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0];
    expect(payload.title).toBe("Meeting");
    expect(payload.categoryKey).toBe("work");
    expect(payload.allDay).toBe(false);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test -- event-editor.test`
Expected: FAIL — `../event-editor` not found.

- [ ] **Step 4: Implement `event-editor.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { CalendarCategory } from "@/lib/calendar";

export type EventDraft = {
  id?: string;
  title: string;
  start: string; // datetime-local string
  end: string; // datetime-local string
  allDay: boolean;
  categoryKey: string;
};

export function EventEditor({
  open,
  categories,
  initial,
  onSave,
  onClose,
  onDelete,
}: {
  open: boolean;
  categories: CalendarCategory[];
  initial: EventDraft;
  onSave: (draft: EventDraft) => void;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<EventDraft>(initial);
  const [error, setError] = useState("");

  const set = <K extends keyof EventDraft>(k: K, v: EventDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const submit = () => {
    if (!draft.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!draft.allDay && new Date(draft.end).getTime() <= new Date(draft.start).getTime()) {
      setError("End must be after start");
      return;
    }
    setError("");
    onSave(draft);
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={initial.id ? "Edit event" : "New event"}>
      <div className="space-y-4">
        <div>
          <label htmlFor="ev-title" className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>Title</label>
          <input
            id="ev-title"
            className="w-full rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>

        <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
          <input type="checkbox" checked={draft.allDay} onChange={(e) => set("allDay", e.target.checked)} />
          All day
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ev-start" className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>Start</label>
            <input
              id="ev-start"
              type="datetime-local"
              disabled={draft.allDay}
              className="w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              value={draft.start}
              onChange={(e) => set("start", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="ev-end" className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>End</label>
            <input
              id="ev-end"
              type="datetime-local"
              disabled={draft.allDay}
              className="w-full rounded-lg px-3 py-2 text-sm disabled:opacity-50"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              value={draft.end}
              onChange={(e) => set("end", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => set("categoryKey", c.key)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                style={{
                  background: draft.categoryKey === c.key ? `${c.color}22` : "var(--surface-raised)",
                  border: `1px solid ${draft.categoryKey === c.key ? c.color : "var(--border-default)"}`,
                  color: "var(--text-primary)",
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm" style={{ color: "var(--alert)" }}>{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {onDelete ? (
            <Button variant="destructive" size="sm" onClick={onDelete}>Delete</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={submit}>Save</Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

> If `Modal`'s prop is named differently (e.g. `open` instead of `isOpen`, or `onClose` vs `onDismiss`), adjust to match the actual `modal.tsx` you read in Step 0. Keep the `aria`/label text (`Title`, `Start`, `End`, `Save`) so the tests resolve.

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- event-editor.test`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/calendar/event-chip.tsx src/components/calendar/event-editor.tsx src/components/calendar/__tests__/event-editor.test.tsx
git commit -m "feat(calendar): event chip + create/edit event editor modal

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `month-view.tsx` — TDD smoke

**Files:**
- Create: `src/components/calendar/month-view.tsx`
- Test: `src/components/calendar/__tests__/month-view.test.tsx`

Read `src/components/dashboard/dashboard-calendar.tsx` first to mirror the `react-day-picker` setup.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MonthView } from "../month-view";

afterEach(cleanup);

const categories = [{ key: "work", label: "Work", color: "#3F6B8C" }];
const events = [
  { id: "1", title: "Standup", start: "2026-06-01T09:00:00.000Z", end: "2026-06-01T09:30:00.000Z", allDay: false, categoryKey: "work" },
];

describe("MonthView", () => {
  it("renders event titles in the grid", () => {
    render(
      <MonthView
        month={new Date(2026, 5, 1)}
        events={events}
        categories={categories}
        onSelectDay={vi.fn()}
        onSelectEvent={vi.fn()}
      />
    );
    expect(screen.getByText("Standup")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test -- month-view.test` → FAIL (module missing).

- [ ] **Step 3: Implement `month-view.tsx`**

```tsx
"use client";

import { useMemo } from "react";
import { addDays, format, isSameDay, isSameMonth } from "date-fns";
import { monthGridRange, categoryColor, type CalendarCategory } from "@/lib/calendar";
import { EventChip } from "./event-chip";

export type CalEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  categoryKey: string;
};

const MAX_CHIPS = 3;

export function MonthView({
  month,
  events,
  categories,
  onSelectDay,
  onSelectEvent,
}: {
  month: Date;
  events: CalEvent[];
  categories: CalendarCategory[];
  onSelectDay: (d: Date) => void;
  onSelectEvent: (id: string) => void;
}) {
  const { start, end } = monthGridRange(month);
  const days = useMemo(() => {
    const out: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
    return out;
  }, [start, end]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of events) {
      const key = format(new Date(ev.start), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
    }
    return map;
  }, [events]);

  return (
    <div>
      <div className="grid grid-cols-7 text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px" style={{ background: "var(--border-subtle)" }}>
        {days.map((d) => {
          const key = format(d, "yyyy-MM-dd");
          const list = byDay.get(key) ?? [];
          const today = isSameDay(d, new Date());
          return (
            <div
              key={key}
              className="min-h-24 p-1.5 cursor-pointer"
              style={{ background: "var(--surface-1)", opacity: isSameMonth(d, month) ? 1 : 0.45 }}
              onClick={() => onSelectDay(d)}
            >
              <div
                className="text-xs mb-1 inline-flex items-center justify-center w-5 h-5 rounded-full"
                style={today ? { background: "var(--accent-color)", color: "#fff" } : { color: "var(--text-primary)" }}
              >
                {format(d, "d")}
              </div>
              <div className="space-y-0.5">
                {list.slice(0, MAX_CHIPS).map((ev) => (
                  <div key={ev.id} onClick={(e) => { e.stopPropagation(); onSelectEvent(ev.id); }}>
                    <EventChip event={{ ...ev, color: categoryColor(categories, ev.categoryKey) }} />
                  </div>
                ))}
                {list.length > MAX_CHIPS && (
                  <div className="text-[10px] px-1" style={{ color: "var(--text-muted)" }}>
                    +{list.length - MAX_CHIPS} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes** — `npm test -- month-view.test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/month-view.tsx src/components/calendar/__tests__/month-view.test.tsx
git commit -m "feat(calendar): month view with colored event chips

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `time-grid.tsx` + `week-view.tsx` + `day-view.tsx` — TDD smoke

**Files:**
- Create: `src/components/calendar/time-grid.tsx`
- Create: `src/components/calendar/week-view.tsx`
- Create: `src/components/calendar/day-view.tsx`
- Test: `src/components/calendar/__tests__/time-grid.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DayView } from "../day-view";

afterEach(cleanup);

const categories = [{ key: "work", label: "Work", color: "#3F6B8C" }];
const events = [
  { id: "1", title: "Focus", start: "2026-06-01T09:00:00", end: "2026-06-01T10:00:00", allDay: false, categoryKey: "work" },
];

describe("DayView", () => {
  it("renders a timed event block with its title", () => {
    render(
      <DayView date={new Date(2026, 5, 1)} events={events} categories={categories}
        onSelectSlot={vi.fn()} onSelectEvent={vi.fn()} />
    );
    expect(screen.getByText("Focus")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test -- time-grid.test` → FAIL.

- [ ] **Step 3: Implement `time-grid.tsx`**

```tsx
"use client";

import { startOfDay, isSameDay, format } from "date-fns";
import { layoutDayEvents } from "@/lib/event-layout";
import { categoryColor, type CalendarCategory } from "@/lib/calendar";
import { EventChip } from "./event-chip";
import type { CalEvent } from "./month-view";

const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayColumn({
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
  const dayStart = startOfDay(date);
  const timed = events.filter((e) => !e.allDay && isSameDay(new Date(e.start), date));
  const positioned = layoutDayEvents(
    timed.map((e) => ({ id: e.id, start: new Date(e.start), end: new Date(e.end) })),
    { dayStart, hourHeight: HOUR_HEIGHT, minHeight: 14 }
  );
  const byId = new Map(timed.map((e) => [e.id, e]));

  return (
    <div className="relative flex-1 border-l" style={{ borderColor: "var(--border-subtle)", height: 24 * HOUR_HEIGHT }}>
      {HOURS.map((h) => (
        <div
          key={h}
          className="absolute left-0 right-0 cursor-pointer"
          style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT, borderTop: "1px solid var(--border-subtle)" }}
          onClick={() => onSelectSlot(date, h)}
        />
      ))}
      {positioned.map((p) => {
        const ev = byId.get(p.id)!;
        return (
          <div
            key={p.id}
            className="absolute px-0.5"
            style={{ top: p.top, height: p.height, left: `${p.left * 100}%`, width: `${p.width * 100}%` }}
          >
            <EventChip
              variant="block"
              event={{ ...ev, color: categoryColor(categories, ev.categoryKey) }}
              onClick={() => onSelectEvent(ev.id)}
            />
          </div>
        );
      })}
    </div>
  );
}

export function HourGutter() {
  return (
    <div className="w-12 shrink-0" style={{ height: 24 * HOUR_HEIGHT }}>
      {HOURS.map((h) => (
        <div key={h} className="text-[10px] text-right pr-1 -translate-y-1.5" style={{ height: HOUR_HEIGHT, color: "var(--text-muted)" }}>
          {h === 0 ? "" : format(new Date(2026, 0, 1, h), "h a")}
        </div>
      ))}
    </div>
  );
}

export { HOUR_HEIGHT };
```

- [ ] **Step 4: Implement `day-view.tsx`**

```tsx
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
```

- [ ] **Step 5: Implement `week-view.tsx`**

```tsx
"use client";

import { startOfWeek, addDays, format, isSameDay } from "date-fns";
import { DayColumn, HourGutter } from "./time-grid";
import type { CalEvent } from "./month-view";
import type { CalendarCategory } from "@/lib/calendar";

export function WeekView({
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
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="overflow-auto max-h-[70vh]">
      <div className="flex sticky top-0 z-10" style={{ background: "var(--surface-1)" }}>
        <div className="w-12 shrink-0" />
        {days.map((d) => (
          <div key={d.toISOString()} className="flex-1 text-center text-xs py-1"
            style={{ color: isSameDay(d, new Date()) ? "var(--accent-color)" : "var(--text-muted)" }}>
            {format(d, "EEE d")}
          </div>
        ))}
      </div>
      <div className="flex">
        <HourGutter />
        {days.map((d) => (
          <DayColumn key={d.toISOString()} date={d} events={events} categories={categories}
            onSelectSlot={onSelectSlot} onSelectEvent={onSelectEvent} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run to verify it passes** — `npm test -- time-grid.test` → PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/calendar/time-grid.tsx src/components/calendar/day-view.tsx src/components/calendar/week-view.tsx src/components/calendar/__tests__/time-grid.test.tsx
git commit -m "feat(calendar): shared time-grid with week and day views

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: `agenda-view.tsx` — TDD smoke

**Files:**
- Create: `src/components/calendar/agenda-view.tsx`
- Test: `src/components/calendar/__tests__/agenda-view.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AgendaView } from "../agenda-view";

afterEach(cleanup);

const categories = [{ key: "work", label: "Work", color: "#3F6B8C" }];

describe("AgendaView", () => {
  it("shows an empty state when there are no events", () => {
    render(<AgendaView events={[]} categories={categories} onSelectEvent={vi.fn()} />);
    expect(screen.getByText(/no upcoming/i)).toBeInTheDocument();
  });

  it("lists event titles when present", () => {
    const events = [
      { id: "1", title: "Review", start: "2026-06-02T14:00:00.000Z", end: "2026-06-02T15:00:00.000Z", allDay: false, categoryKey: "work" },
    ];
    render(<AgendaView events={events} categories={categories} onSelectEvent={vi.fn()} />);
    expect(screen.getByText("Review")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npm test -- agenda-view.test` → FAIL.

- [ ] **Step 3: Implement `agenda-view.tsx`**

```tsx
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
            {format(new Date(day), "EEEE, MMM d")}
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
```

- [ ] **Step 4: Run to verify it passes** — `npm test -- agenda-view.test` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/agenda-view.tsx src/components/calendar/__tests__/agenda-view.test.tsx
git commit -m "feat(calendar): agenda list view grouped by day

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: `calendar-header.tsx` + `category-manager.tsx`

**Files:**
- Create: `src/components/calendar/calendar-header.tsx`
- Create: `src/components/calendar/category-manager.tsx`

No new tests (presentational; covered by the view smoke tests + manual verification). Read `src/components/ui/button.tsx` and `modal.tsx` first.

- [ ] **Step 1: Implement `calendar-header.tsx`**

```tsx
"use client";

import { Button } from "@/components/ui/button";

export type CalView = "month" | "week" | "day" | "agenda";

export function CalendarHeader({
  view,
  label,
  onView,
  onPrev,
  onNext,
  onToday,
  onNew,
  onManageCategories,
}: {
  view: CalView;
  label: string;
  onView: (v: CalView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNew: () => void;
  onManageCategories: () => void;
}) {
  const views: CalView[] = ["month", "week", "day", "agenda"];
  return (
    <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={onPrev} aria-label="Previous">‹</Button>
        <Button variant="secondary" size="sm" onClick={onToday}>Today</Button>
        <Button variant="secondary" size="sm" onClick={onNext} aria-label="Next">›</Button>
        <span className="text-sm font-medium ml-2" style={{ color: "var(--text-primary)" }}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
          {views.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onView(v)}
              className="px-3 py-1 text-xs capitalize"
              style={{
                background: view === v ? "var(--accent-color)" : "var(--surface-raised)",
                color: view === v ? "#fff" : "var(--text-primary)",
              }}
            >
              {v}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={onManageCategories}>Categories</Button>
        <Button variant="primary" size="sm" onClick={onNew}>New event</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `category-manager.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CALENDAR_PALETTE, type CalendarCategory } from "@/lib/calendar";

export function CategoryManager({
  open,
  categories,
  onClose,
  onSave,
}: {
  open: boolean;
  categories: CalendarCategory[];
  onClose: () => void;
  onSave: (next: CalendarCategory[]) => void;
}) {
  const [list, setList] = useState<CalendarCategory[]>(categories);

  const update = (i: number, patch: Partial<CalendarCategory>) =>
    setList((l) => l.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => setList((l) => (l.length > 1 ? l.filter((_, idx) => idx !== i) : l));
  const add = () =>
    setList((l) => [...l, { key: `cat_${l.length + 1}`, label: "New", color: CALENDAR_PALETTE[l.length % CALENDAR_PALETTE.length] }]);

  return (
    <Modal isOpen={open} onClose={onClose} title="Categories">
      <div className="space-y-3">
        {list.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex gap-1">
              {CALENDAR_PALETTE.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  aria-label={`color ${hex}`}
                  onClick={() => update(i, { color: hex })}
                  className="w-5 h-5 rounded-full"
                  style={{ background: hex, outline: c.color === hex ? "2px solid var(--text-primary)" : "none" }}
                />
              ))}
            </div>
            <input
              className="flex-1 rounded-lg px-2 py-1 text-sm"
              style={{ background: "var(--surface-raised)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              value={c.label}
              onChange={(e) => update(i, { label: e.target.value })}
            />
            <Button variant="ghost" size="sm" onClick={() => remove(i)} disabled={list.length <= 1}>✕</Button>
          </div>
        ))}
        <Button variant="secondary" size="sm" onClick={add}>+ Add category</Button>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={() => onSave(list)}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 3: Verify build** — `npm run build` → compiles.

- [ ] **Step 4: Commit**

```bash
git add src/components/calendar/calendar-header.tsx src/components/calendar/category-manager.tsx
git commit -m "feat(calendar): header (view switcher + nav) and category manager

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: `calendar-view.tsx` orchestrator + route wiring

**Files:**
- Create: `src/components/calendar/calendar-view.tsx`
- Modify: `src/app/(app)/sections/[slug]/page.tsx`

Read `src/app/(app)/sections/[slug]/page.tsx` first to see how `BoardView`/`TableView` are imported, what props they get (slug, template), and the exact routing branch.

- [ ] **Step 1: Implement `calendar-view.tsx`**

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
    const qs = `from=${range.start.toISOString()}&to=${range.end.toISOString()}`;
    const res = await fetch(`/api/sections/${slug}/entries?${qs}`);
    if (!res.ok) { toast.error("Failed to load events"); return; }
    const json = await res.json();
    if (json.template?.calendarCategories?.length) setCategories(json.template.calendarCategories);
    setEvents(
      (json.entries ?? [])
        .filter((e: CalEvent) => e.start)
        .map((e: CalEvent & { _id?: string }) => ({ ...e, id: (e as { _id?: string })._id ?? e.id }))
    );
  }, [slug, range.start, range.end]);

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
```

- [ ] **Step 2: Wire the route**

In `src/app/(app)/sections/[slug]/page.tsx`, add the import and a routing branch alongside the existing `board`/`table` branches:

```tsx
import { CalendarView } from "@/components/calendar/calendar-view";
// ...
// in the view routing (mirror the existing board branch):
if (template.viewType === "calendar") {
  return <CalendarView slug={template.slug} categories={template.calendarCategories} />;
}
```

> Match the exact place/shape of the existing `if (template.viewType === "board")` branch you read. Pass `template.slug` (string) and `template.calendarCategories`. Keep the page's existing header/layout wrappers consistent with how `BoardView` is rendered.

- [ ] **Step 3: Verify build + suite**

Run: `npm run build` → Expected: compiles, no type errors.
Run: `npm test` → Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/calendar/calendar-view.tsx "src/app/(app)/sections/[slug]/page.tsx"
git commit -m "feat(calendar): orchestrator wiring all views + section route branch

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Manual verification

**Files:** none.

> NOTE: `npm run dev` currently fails to boot due to a PRE-EXISTING, unrelated route conflict (`src/app/api/sections/[sectionKey]` vs `[slug]`). If it still exists, either resolve it separately first or verify via a production build preview (`npm run build && npm run start`). Calendar work does not introduce this.

- [ ] **Step 1: Create a calendar section** — via the app's section-creation flow, create a section with `viewType: "calendar"` (or update an existing custom section's viewType to `calendar` through the template PATCH). Confirm it seeds Personal/Work/Health categories.

- [ ] **Step 2: Month view** — open the section. Confirm the month grid renders, "New event" opens the editor, creating a timed event shows a colored chip on the right day, and clicking a chip opens edit.

- [ ] **Step 3: Week/Day** — switch to Week and Day. Confirm timed events render as positioned colored blocks; create two overlapping events and confirm they sit side-by-side without overlapping; clicking an empty hour slot opens the editor pre-filled with that hour.

- [ ] **Step 4: Agenda** — switch to Agenda; confirm events are grouped by day and the empty state appears when the window has none.

- [ ] **Step 5: Categories** — open Categories, add/rename/recolor one, save; confirm existing events recolor and the new category appears in the editor.

- [ ] **Step 6: Validation** — try saving an event with no title and with end ≤ start; confirm it's blocked with a message.

- [ ] **Step 7: No regressions** — open a non-calendar section (e.g. a board or table section) and confirm it still works unchanged.

---

## Self-Review

**Spec coverage:**
- `calendar` viewType registered (model + validations + routing) → Tasks 3, 5, 11. ✓
- `CustomEntry` extended with `title/start/end/allDay/categoryKey`, `date` kept for compat → Task 3. ✓
- Categories on template + fixed palette + default seed → Tasks 1, 3, 5. ✓
- `from`/`to` range query; POST/PATCH accept + validate calendar events; reuse routes → Task 4. ✓
- Category management API (PATCH) + client orchestration → Tasks 5, 11. ✓
- Month / Week / Day (shared time-grid) / Agenda → Tasks 7, 8, 9. ✓
- Event editor (title, all-day toggle gating time inputs, category picker, end>start, delete) → Task 6. ✓
- Pure overlap-layout engine, heavily tested → Task 2. ✓
- `categoryColor` + month-grid range helpers, tested → Task 1. ✓
- Error handling (400 + toast, empty states, skip invalid-date events) → Tasks 4, 6, 9, 11. ✓
- Tests: layout, calendar lib, validation, editor, each view smoke → Tasks 1,2,3,6,7,8,9. ✓
- Out-of-scope items not implemented → confirmed (no recurrence/drag/share/sync). ✓
- No new dependencies → confirmed. ✓

**Placeholder scan:** No TBD/TODO. Two tasks (4, 5) intentionally say "read the file first and adapt" for routes whose exact current shape must be confirmed at edit time — each still gives the complete code to insert and the exact branch logic; this is guidance for safe integration, not a placeholder for missing content.

**Type consistency:** `CalEvent` (defined in `month-view.tsx`) is imported by time-grid/week/day/agenda/calendar-view. `CalendarCategory` from `@/lib/calendar` used consistently. `EventDraft` defined in `event-editor.tsx`, imported by `calendar-view.tsx`. `categoryColor`, `monthGridRange`, `layoutDayEvents`, `validateCalendarEvent`, `calendarEventSchema`, `calendarCategoriesUpdateSchema`, `DEFAULT_CATEGORIES`, `CALENDAR_PALETTE` names match across definitions and uses. `Modal` prop `isOpen`/`onClose` flagged in Task 6 to confirm against the real component. ✓

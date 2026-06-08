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

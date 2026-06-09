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

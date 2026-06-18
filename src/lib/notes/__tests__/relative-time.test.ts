import { describe, it, expect } from "vitest";
import { relativeTime } from "@/lib/notes/relative-time";

const NOW = new Date("2026-06-18T12:00:00Z").getTime();

describe("relativeTime", () => {
  it("returns empty for missing input", () => {
    expect(relativeTime(null, NOW)).toBe("");
    expect(relativeTime(undefined, NOW)).toBe("");
    expect(relativeTime("not-a-date", NOW)).toBe("");
  });

  it("collapses sub-minute and future to 'just now'", () => {
    expect(relativeTime("2026-06-18T11:59:30Z", NOW)).toBe("just now");
    expect(relativeTime("2026-06-18T12:05:00Z", NOW)).toBe("just now");
  });

  it("formats minutes, hours, and days", () => {
    expect(relativeTime("2026-06-18T11:55:00Z", NOW)).toBe("5m ago");
    expect(relativeTime("2026-06-18T09:00:00Z", NOW)).toBe("3h ago");
    expect(relativeTime("2026-06-16T12:00:00Z", NOW)).toBe("2d ago");
  });

  it("falls back to an absolute date beyond a week", () => {
    const out = relativeTime("2026-05-01T12:00:00Z", NOW);
    expect(out).not.toMatch(/ago|just now/);
    expect(out.length).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from "vitest";
import { toUtcMidnight, attendanceDateKey } from "@/lib/gym-date";

// These keys are timezone-independent by construction: they never touch local
// time, so the round-trip is stable regardless of the user's or server's TZ.
describe("gym attendance date keys (timezone-independent)", () => {
  it("toUtcMidnight builds UTC midnight of the calendar date", () => {
    expect(toUtcMidnight("2026-06-05").toISOString()).toBe("2026-06-05T00:00:00.000Z");
  });

  it("toUtcMidnight tolerates a full ISO string and keeps the calendar date", () => {
    expect(toUtcMidnight("2026-06-05T17:30:00.000Z").toISOString()).toBe(
      "2026-06-05T00:00:00.000Z"
    );
  });

  it("attendanceDateKey reads the UTC calendar date from an ISO string", () => {
    expect(attendanceDateKey("2026-06-05T00:00:00.000Z")).toBe("2026-06-05");
  });

  it("attendanceDateKey reads the UTC calendar date from a Date", () => {
    expect(attendanceDateKey(new Date("2026-06-05T00:00:00.000Z"))).toBe("2026-06-05");
  });

  it("round-trips write -> store -> read with no day shift", () => {
    const key = "2026-06-05";
    const stored = toUtcMidnight(key); // server stores this
    const readBack = attendanceDateKey(stored.toISOString()); // client reads this
    expect(readBack).toBe(key);
  });
});

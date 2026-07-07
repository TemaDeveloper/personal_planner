import { describe, it, expect, afterEach } from "vitest";
import { toDateKey, utcMonthRange } from "../date-key";

describe("toDateKey", () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("returns the intended calendar day regardless of the server process's local timezone", () => {
    // Date-only fields are stored as UTC midnight of the intended day (e.g.
    // "2026-01-15" parses to 2026-01-15T00:00:00.000Z). A server running in a
    // negative-UTC-offset timezone must not read this back as the prior day.
    const utcMidnight = new Date("2026-01-15T00:00:00.000Z");

    process.env.TZ = "America/New_York"; // UTC-5 in January
    expect(toDateKey(utcMidnight)).toBe("2026-01-15");

    process.env.TZ = "Pacific/Kiritimati"; // UTC+14 — the other extreme
    expect(toDateKey(utcMidnight)).toBe("2026-01-15");

    process.env.TZ = "UTC";
    expect(toDateKey(utcMidnight)).toBe("2026-01-15");
  });
});

describe("utcMonthRange", () => {
  const originalTz = process.env.TZ;

  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("spans the intended UTC month regardless of the server process's local timezone", () => {
    // "2026-01-01" parses to UTC midnight Jan 1. date-fns' startOfMonth/
    // endOfMonth (local-timezone-based) would shift this range onto December
    // on a server running in a negative-UTC-offset timezone like EST.
    const anchor = new Date("2026-01-01T00:00:00.000Z");

    process.env.TZ = "America/New_York";
    let { start, end } = utcMonthRange(anchor);
    expect(start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-01-31T23:59:59.999Z");

    process.env.TZ = "Pacific/Kiritimati";
    ({ start, end } = utcMonthRange(anchor));
    expect(start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-01-31T23:59:59.999Z");
  });
});

import { describe, it, expect } from "vitest";
import { pickDefaultCalendarView } from "@/lib/default-calendar-view";

describe("pickDefaultCalendarView", () => {
  it("returns day on mobile", () => {
    expect(pickDefaultCalendarView(true)).toBe("day");
  });
  it("returns week on desktop", () => {
    expect(pickDefaultCalendarView(false)).toBe("week");
  });
});

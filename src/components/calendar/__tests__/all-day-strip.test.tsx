import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DayView } from "../day-view";
import { WeekView } from "../week-view";

afterEach(cleanup);

const categories = [{ key: "work", label: "Work", color: "#3F6B8C" }];
const allDayEvent = {
  id: "a",
  title: "Holiday",
  start: "2026-06-01T00:00:00",
  end: "2026-06-01T23:59:59",
  allDay: true,
  categoryKey: "work",
  description: "",
};

describe("all-day strip", () => {
  it("DayView renders an all-day event in the strip", () => {
    render(
      <DayView date={new Date(2026, 5, 1)} events={[allDayEvent]} categories={categories}
        onSelectSlot={vi.fn()} onSelectEvent={vi.fn()} />
    );
    expect(screen.getByText("Holiday")).toBeInTheDocument();
  });

  it("WeekView renders an all-day event in the strip", () => {
    render(
      <WeekView date={new Date(2026, 5, 1)} events={[allDayEvent]} categories={categories}
        onSelectSlot={vi.fn()} onSelectEvent={vi.fn()} />
    );
    expect(screen.getByText("Holiday")).toBeInTheDocument();
  });
});

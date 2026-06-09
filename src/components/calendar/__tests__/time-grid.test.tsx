import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { DayView } from "../day-view";

afterEach(cleanup);

const categories = [{ key: "work", label: "Work", color: "#3F6B8C" }];
const events = [
  { id: "1", title: "Focus", start: "2026-06-01T09:00:00", end: "2026-06-01T10:00:00", allDay: false, categoryKey: "work", description: "" },
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

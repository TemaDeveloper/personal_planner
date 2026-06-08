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

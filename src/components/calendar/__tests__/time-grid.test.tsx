import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TimeGrid } from "../time-grid";

afterEach(cleanup);

const categories = [{ key: "work", label: "Work", color: "#3F6B8C" }];
const days = [new Date(2026, 5, 1), new Date(2026, 5, 6)]; // Mon + Sat
const events = [
  { id: "1", title: "Focus", start: "2026-06-01T09:00:00", end: "2026-06-01T10:00:00", allDay: false, categoryKey: "work", description: "" },
];

describe("TimeGrid", () => {
  it("renders a timed event with its title", () => {
    render(<TimeGrid days={days} events={events} categories={categories}
      onCreate={vi.fn()} onMove={vi.fn()} onResize={vi.fn()} onSelect={vi.fn()} />);
    expect(screen.getByText("Focus")).toBeInTheDocument();
  });

  it("marks weekend columns", () => {
    const { container } = render(<TimeGrid days={days} events={events} categories={categories}
      onCreate={vi.fn()} onMove={vi.fn()} onResize={vi.fn()} onSelect={vi.fn()} />);
    expect(container.querySelectorAll('[data-weekend="true"]').length).toBe(1); // Saturday
  });
});

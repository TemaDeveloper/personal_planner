import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
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

  it("dragging an existing event fires onMove (not onSelect)", () => {
    const onMove = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(<TimeGrid days={days} events={events} categories={categories}
      onCreate={vi.fn()} onMove={onMove} onResize={vi.fn()} onSelect={onSelect} />);
    const evEl = container.querySelector('[data-event-id="1"]') as HTMLElement;
    fireEvent.mouseDown(evEl, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: 160 });
    fireEvent.mouseUp(window);
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("clicking an existing event (no move) fires onSelect", () => {
    const onMove = vi.fn();
    const onSelect = vi.fn();
    const { container } = render(<TimeGrid days={days} events={events} categories={categories}
      onCreate={vi.fn()} onMove={onMove} onResize={vi.fn()} onSelect={onSelect} />);
    const evEl = container.querySelector('[data-event-id="1"]') as HTMLElement;
    fireEvent.mouseDown(evEl, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(window);
    expect(onSelect).toHaveBeenCalledWith("1");
    expect(onMove).not.toHaveBeenCalled();
  });

  it("a plain click on empty grid does NOT create an event", () => {
    const onCreate = vi.fn();
    const { container } = render(<TimeGrid days={days} events={events} categories={categories}
      onCreate={onCreate} onMove={vi.fn()} onResize={vi.fn()} onSelect={vi.fn()} />);
    const col = container.querySelector('[data-weekend="false"]') as HTMLElement;
    fireEvent.mouseDown(col, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(window);
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("dragging on empty grid DOES create an event", () => {
    const onCreate = vi.fn();
    const { container } = render(<TimeGrid days={days} events={events} categories={categories}
      onCreate={onCreate} onMove={vi.fn()} onResize={vi.fn()} onSelect={vi.fn()} />);
    const col = container.querySelector('[data-weekend="false"]') as HTMLElement;
    fireEvent.mouseDown(col, { clientX: 100, clientY: 100 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: 180 });
    fireEvent.mouseUp(window);
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AgendaView } from "../agenda-view";

afterEach(cleanup);

const categories = [{ key: "work", label: "Work", color: "#3F6B8C" }];

describe("AgendaView", () => {
  it("shows an empty state when there are no events", () => {
    render(<AgendaView events={[]} categories={categories} onSelectEvent={vi.fn()} />);
    expect(screen.getByText(/no upcoming/i)).toBeInTheDocument();
  });

  it("lists event titles when present", () => {
    const events = [
      { id: "1", title: "Review", start: "2026-06-02T14:00:00.000Z", end: "2026-06-02T15:00:00.000Z", allDay: false, categoryKey: "work", description: "" },
    ];
    render(<AgendaView events={events} categories={categories} onSelectEvent={vi.fn()} />);
    expect(screen.getByText("Review")).toBeInTheDocument();
  });
});

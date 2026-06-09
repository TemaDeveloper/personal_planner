import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AllDayStrip } from "../all-day-strip";

afterEach(cleanup);

const categories = [{ key: "work", label: "Work", color: "#3F6B8C" }];
const allDayEvent = { id: "a", title: "Holiday", start: "2026-06-01T00:00:00", end: "2026-06-01T23:59:59", allDay: true, categoryKey: "work", description: "" };

describe("AllDayStrip", () => {
  it("renders an all-day event", () => {
    render(<AllDayStrip days={[new Date(2026, 5, 1)]} events={[allDayEvent]} categories={categories} onSelectEvent={vi.fn()} />);
    expect(screen.getByText("Holiday")).toBeInTheDocument();
  });
});

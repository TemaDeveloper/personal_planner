import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { EventEditor } from "../event-editor";

afterEach(cleanup);

const categories = [
  { key: "work", label: "Work", color: "#3F6B8C" },
  { key: "home", label: "Home", color: "#C0613C" },
];

function renderEditor(overrides = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <EventEditor
      open
      categories={categories}
      initial={{ start: "2026-06-01T09:00", end: "2026-06-01T10:00", allDay: false, categoryKey: "work", title: "" }}
      onSave={onSave}
      onClose={onClose}
      {...overrides}
    />
  );
  return { onSave, onClose };
}

describe("EventEditor", () => {
  it("disables time inputs when all-day is on", () => {
    renderEditor({ initial: { start: "2026-06-01T09:00", end: "2026-06-01T10:00", allDay: true, categoryKey: "work", title: "X" } });
    const start = screen.getByLabelText(/start/i) as HTMLInputElement;
    expect(start.disabled).toBe(true);
  });

  it("does not save when end <= start", () => {
    const { onSave } = renderEditor();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Meeting" } });
    fireEvent.change(screen.getByLabelText(/^end/i), { target: { value: "2026-06-01T08:00" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/after start/i)).toBeInTheDocument();
  });

  it("saves a valid event with the selected category", () => {
    const { onSave } = renderEditor();
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: "Meeting" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const payload = onSave.mock.calls[0][0];
    expect(payload.title).toBe("Meeting");
    expect(payload.categoryKey).toBe("work");
    expect(payload.allDay).toBe(false);
  });
});

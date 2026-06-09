import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { EventInspector } from "../event-inspector";

afterEach(cleanup);

const categories = [
  { key: "work", label: "Work", color: "#3F6B8C" },
  { key: "home", label: "Home", color: "#C0613C" },
];

function setup(overrides = {}) {
  const onChange = vi.fn();
  const onSave = vi.fn();
  const onClose = vi.fn();
  const onAddCategory = vi.fn();
  const draft = { title: "", start: "2026-06-01T09:00", end: "2026-06-01T10:00", allDay: false, categoryKey: "work", description: "" };
  render(
    <EventInspector open draft={draft} categories={categories}
      onChange={onChange} onSave={onSave} onClose={onClose} onAddCategory={onAddCategory} {...overrides} />
  );
  return { onChange, onSave, onClose, onAddCategory };
}

describe("EventInspector", () => {
  it("renders the panel open with the title field", () => {
    setup();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it("does not save when title is empty", () => {
    const { onSave } = setup();
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/title is required/i)).toBeInTheDocument();
  });

  it("saves a valid event", () => {
    const { onSave } = setup({ draft: { title: "Meeting", start: "2026-06-01T09:00", end: "2026-06-01T10:00", allDay: false, categoryKey: "work", description: "" } });
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("emits a category change when a chip is clicked", () => {
    const { onChange } = setup();
    fireEvent.click(screen.getByRole("button", { name: /home/i }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categoryKey: "home" }));
  });

  it("reveals an inline add-category form and emits onAddCategory", () => {
    const { onAddCategory } = setup();
    fireEvent.click(screen.getByRole("button", { name: /\+ new/i }));
    fireEvent.change(screen.getByPlaceholderText(/category name/i), { target: { value: "Travel" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(onAddCategory).toHaveBeenCalledWith(expect.objectContaining({ label: "Travel" }));
  });
});

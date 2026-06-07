// src/components/sections/__tests__/board-view.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { BoardView } from "../board-view";

afterEach(cleanup);

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// dnd-kit needs pointer events — mock the heavy sensors/context
vi.mock("@dnd-kit/core", async () => {
  const actual = await vi.importActual<typeof import("@dnd-kit/core")>("@dnd-kit/core");
  return {
    ...actual,
    DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    PointerSensor: actual.PointerSensor,
    KeyboardSensor: actual.KeyboardSensor,
    useSensor: vi.fn().mockReturnValue({}),
    useSensors: vi.fn().mockReturnValue([]),
  };
});

vi.mock("@dnd-kit/sortable", async () => {
  const actual = await vi.importActual<typeof import("@dnd-kit/sortable")>("@dnd-kit/sortable");
  return {
    ...actual,
    SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSortable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      transition: undefined,
      isDragging: false,
    }),
  };
});

const TEMPLATE_WITH_STATUS = {
  _id: "t1",
  name: "Tasks",
  slug: "tasks",
  icon: "Star",
  description: "Task board",
  viewType: "board" as const,
  fields: [
    { key: "title", label: "Title", type: "text" as const },
    { key: "status", label: "Status", type: "select" as const, options: ["To Do", "In Progress", "Done"] },
    { key: "priority", label: "Priority", type: "select" as const, options: ["low", "medium", "high"] },
  ],
};

const TEMPLATE_NO_STATUS = {
  _id: "t2",
  name: "Notes",
  slug: "notes",
  icon: "Star",
  description: "",
  viewType: "board" as const,
  fields: [
    { key: "title", label: "Title", type: "text" as const },
  ],
};

const ENTRIES = [
  { _id: "e1", date: new Date().toISOString(), order: 0, data: { title: "Task A", status: "To Do", priority: "high" } },
  { _id: "e2", date: new Date().toISOString(), order: 1, data: { title: "Task B", status: "In Progress", priority: "low" } },
  { _id: "e3", date: new Date().toISOString(), order: 0, data: { title: "Task C", status: "Done", priority: "medium" } },
];

function mockFetch(data: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  });
}

describe("BoardView", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a column for each status option", async () => {
    global.fetch = mockFetch({ template: TEMPLATE_WITH_STATUS, entries: ENTRIES });
    render(<BoardView slug="tasks" template={TEMPLATE_WITH_STATUS} />);
    await screen.findByText("To Do");
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
  });

  it("places cards in the correct columns", async () => {
    global.fetch = mockFetch({ template: TEMPLATE_WITH_STATUS, entries: ENTRIES });
    render(<BoardView slug="tasks" template={TEMPLATE_WITH_STATUS} />);
    await screen.findByText("Task A");
    expect(screen.getByText("Task B")).toBeInTheDocument();
    expect(screen.getByText("Task C")).toBeInTheDocument();
  });

  it("shows high priority badge with alert color", async () => {
    global.fetch = mockFetch({ template: TEMPLATE_WITH_STATUS, entries: ENTRIES });
    render(<BoardView slug="tasks" template={TEMPLATE_WITH_STATUS} />);
    const badge = await screen.findByText("high");
    expect(badge.className).toContain("priority-high");
  });

  it("shows medium priority badge with warn color", async () => {
    global.fetch = mockFetch({ template: TEMPLATE_WITH_STATUS, entries: ENTRIES });
    render(<BoardView slug="tasks" template={TEMPLATE_WITH_STATUS} />);
    const badge = await screen.findByText("medium");
    expect(badge.className).toContain("priority-medium");
  });

  it("shows low priority badge with good color", async () => {
    global.fetch = mockFetch({ template: TEMPLATE_WITH_STATUS, entries: ENTRIES });
    render(<BoardView slug="tasks" template={TEMPLATE_WITH_STATUS} />);
    const badge = await screen.findByText("low");
    expect(badge.className).toContain("priority-low");
  });

  it("renders fallback message when no status field exists", async () => {
    // No fetch needed — template is passed directly and has no status field
    render(<BoardView slug="notes" template={TEMPLATE_NO_STATUS} />);
    expect(screen.getByText(/needs a 'status' select field/i)).toBeInTheDocument();
  });

  it("deletes a card when × is clicked", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ template: TEMPLATE_WITH_STATUS, entries: ENTRIES }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });
    global.fetch = fetchMock;

    render(<BoardView slug="tasks" template={TEMPLATE_WITH_STATUS} />);
    await screen.findByText("Task A");

    // Hover shows delete buttons — in tests they're always visible
    const deleteButtons = screen.getAllByRole("button", { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [, del] = fetchMock.mock.calls;
      expect(del[1]?.method).toBe("DELETE");
    });
  });

  it("posts a new card when inline form is submitted", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ template: TEMPLATE_WITH_STATUS, entries: [] }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ entry: { _id: "new1", date: new Date().toISOString(), order: 0, data: { title: "New Task", status: "To Do", priority: "" } } }) });
    global.fetch = fetchMock;

    render(<BoardView slug="tasks" template={TEMPLATE_WITH_STATUS} />);
    await screen.findByText("To Do");

    // Click "+ Add" in the first column
    const addButtons = screen.getAllByRole("button", { name: /add/i });
    fireEvent.click(addButtons[0]);

    // Type title
    const input = screen.getByPlaceholderText(/task title/i);
    fireEvent.change(input, { target: { value: "New Task" } });

    // Submit
    const confirmBtn = screen.getByRole("button", { name: /confirm/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [, post] = fetchMock.mock.calls;
      expect(post[1]?.method).toBe("POST");
      const body = JSON.parse(post[1]?.body as string);
      expect(body.data.title).toBe("New Task");
      expect(body.data.status).toBe("To Do");
    });
  });
});

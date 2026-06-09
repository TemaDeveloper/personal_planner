# Kanban BoardView Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained Kanban BoardView component with drag-and-drop and wire it into the custom-section page when `template.viewType === "board"`.

**Architecture:** BoardView is a self-contained client component that fetches ALL entries for a section (via `?all=1` query param added to the GET route) grouped by a `status` select field's options as columns. Cards support DnD via @dnd-kit, inline add/delete, and priority badges. The section page renders BoardView early-returning when `viewType === "board"`, skipping week navigation entirely.

**Tech Stack:** Next.js 15, @dnd-kit/core + sortable + utilities, Mongoose, Zod, Vitest + @testing-library/react, Tailwind CSS + CSS custom properties (Editorial Calm tokens).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/api/sections/[slug]/entries/route.ts` | Modify | Add `?all=1` branch that returns all entries (no week filter) |
| `src/components/sections/board-view.tsx` | Create | Self-contained Kanban board with DnD, inline add, priority badges |
| `src/components/sections/__tests__/board-view.test.tsx` | Create | Unit tests for column derivation, priority badge colors, add/delete |
| `src/app/(app)/sections/[slug]/page.tsx` | Modify | Early-return board branch when `viewType === "board"` |

---

### Task 1: Add `?all=1` to the entries GET route

**Files:**
- Modify: `src/app/api/sections/[slug]/entries/route.ts:28-49`

**Context:** The current GET always filters by a week window (defaulting to current week when `weekOf` is absent). BoardView needs ALL entries for the section regardless of date.

- [ ] **Step 1: Modify the GET handler to support `?all=1`**

Replace the date-range block so that when `all=1`, it skips the window filter:

```typescript
// After: const { searchParams } = new URL(req.url);
const weekOf = searchParams.get("weekOf");
const all = searchParams.get("all") === "1";

let entries;
if (all) {
  entries = await CustomEntry.find({
    userId,
    templateId: template._id,
  })
    .sort({ order: 1, createdAt: -1 })
    .lean();
} else {
  let start: Date, end: Date;
  if (weekOf) {
    const d = new Date(weekOf);
    start = startOfWeek(d, { weekStartsOn: 1 });
    end = endOfWeek(d, { weekStartsOn: 1 });
  } else {
    start = startOfWeek(new Date(), { weekStartsOn: 1 });
    end = endOfWeek(new Date(), { weekStartsOn: 1 });
  }
  entries = await CustomEntry.find({
    userId,
    templateId: template._id,
    date: { $gte: start, $lte: end },
  })
    .sort({ date: -1 })
    .lean();
}

return NextResponse.json({ template, entries });
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/sections/[slug]/entries/route.ts
git commit -m "feat: add ?all=1 to entries GET for board view"
```

---

### Task 2: Write tests for BoardView

**Files:**
- Create: `src/components/sections/__tests__/board-view.test.tsx`

**Context:** Tests mock `fetch`, @dnd-kit, and sonner. They verify: columns rendered from status options, cards in right columns, priority badge color class, add card flow, delete card flow, and the "needs a status field" fallback message.

- [ ] **Step 1: Create the test file**

```typescript
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
```

- [ ] **Step 2: Run tests (should fail — component doesn't exist yet)**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm test -- --reporter=verbose 2>&1 | tail -30
```

Expected: FAIL with "Cannot find module '../board-view'"

---

### Task 3: Build `board-view.tsx`

**Files:**
- Create: `src/components/sections/board-view.tsx`

**Context:** Full self-contained client component. Fetches with `?all=1`. Derives columns from the first `select` field keyed `status` (fallback: first select field). Shows priority badge if there's a `priority` select field. DnD via @dnd-kit. Inline add per column. Delete on hover. Optimistic UI with rollback + toast.

- [ ] **Step 1: Create the file**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X, Check } from "lucide-react";

// ---- Types ----------------------------------------------------------------

interface FieldDef {
  key: string;
  label: string;
  type: "boolean" | "number" | "text" | "select" | "date";
  options?: string[];
  formula?: string;
}

interface Template {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  viewType?: string;
  fields: FieldDef[];
}

interface Entry {
  _id: string;
  date: string;
  order: number;
  data: Record<string, unknown>;
}

interface BoardViewProps {
  slug: string;
  template: Template;
}

// ---- Helpers --------------------------------------------------------------

function findStatusField(fields: FieldDef[]): FieldDef | null {
  return (
    fields.find((f) => f.type === "select" && f.key === "status") ??
    fields.find((f) => f.type === "select") ??
    null
  );
}

function findTitleField(fields: FieldDef[]): FieldDef | null {
  return fields.find((f) => f.type === "text") ?? null;
}

function findPriorityField(fields: FieldDef[]): FieldDef | null {
  return fields.find((f) => f.type === "select" && f.key === "priority") ?? null;
}

type PriorityLevel = "low" | "medium" | "high";

function priorityClass(value: string): string {
  const v = value.toLowerCase() as PriorityLevel;
  if (v === "high") return "priority-high";
  if (v === "medium") return "priority-medium";
  if (v === "low") return "priority-low";
  return "priority-default";
}

// ---- SortableCard ---------------------------------------------------------

interface CardProps {
  entry: Entry;
  titleKey: string;
  priorityField: FieldDef | null;
  onDelete: (id: string) => void;
}

function SortableCard({ entry, titleKey, priorityField, onDelete }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry._id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const title = String(entry.data[titleKey] ?? "Untitled");
  const priority = priorityField ? String(entry.data[priorityField.key] ?? "") : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="board-card group"
    >
      <div className="board-card-drag-handle" {...attributes} {...listeners}>
        <span className="board-card-title">{title}</span>
      </div>
      {priority && (
        <span className={`board-priority-badge ${priorityClass(priority)}`}>
          {priority}
        </span>
      )}
      <button
        onClick={() => onDelete(entry._id)}
        className="board-card-delete"
        aria-label="Delete entry"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ---- InlineAddForm --------------------------------------------------------

interface InlineAddFormProps {
  column: string;
  titleKey: string;
  priorityField: FieldDef | null;
  onCancel: () => void;
  onConfirm: (title: string, priority: string) => void;
}

function InlineAddForm({ column: _column, titleKey: _titleKey, priorityField, onCancel, onConfirm }: InlineAddFormProps) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("");

  return (
    <div className="board-inline-form">
      <input
        autoFocus
        className="board-inline-input"
        placeholder="Task title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && title.trim()) onConfirm(title.trim(), priority);
          if (e.key === "Escape") onCancel();
        }}
      />
      {priorityField && priorityField.options && (
        <select
          className="board-inline-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="">Priority...</option>
          {priorityField.options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}
      <div className="board-inline-actions">
        <button
          onClick={() => { if (title.trim()) onConfirm(title.trim(), priority); }}
          className="board-inline-confirm"
          aria-label="Confirm add"
          disabled={!title.trim()}
        >
          <Check size={14} />
        </button>
        <button onClick={onCancel} className="board-inline-cancel" aria-label="Cancel add">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ---- BoardView (main) -----------------------------------------------------

export function BoardView({ slug, template }: BoardViewProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingInColumn, setAddingInColumn] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  // Derive board shape from template
  const statusField = findStatusField(template.fields);
  const titleField = findTitleField(template.fields);
  const priorityField = findPriorityField(template.fields);

  const statusKey = statusField?.key ?? null;
  const titleKey = titleField?.key ?? "title";
  const columns: string[] = statusField?.options ?? [];

  // Fetch all entries (no week filter)
  const loadEntries = useCallback(() => {
    fetch(`/api/sections/${slug}/entries?all=1`)
      .then((r) => r.json())
      .then((d) => {
        setEntries(d.entries || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  // Group entries by column
  function entriesForColumn(col: string): Entry[] {
    return entries
      .filter((e) => {
        const val = statusKey ? String(e.data[statusKey] ?? "") : "";
        return val === col || (col === columns[0] && !columns.includes(val));
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }

  // DnD handler
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !statusKey) return;

    // Determine source and target columns
    const activeEntry = entries.find((e) => e._id === active.id);
    const overEntry = entries.find((e) => e._id === over.id);
    if (!activeEntry) return;

    const sourceCol = String(activeEntry.data[statusKey] ?? columns[0]);
    const targetCol = overEntry ? String(overEntry.data[statusKey] ?? columns[0]) : sourceCol;

    if (sourceCol !== targetCol) {
      // Cross-column move: optimistically update status
      const snapshot = entries;
      setEntries((prev) =>
        prev.map((e) =>
          e._id === active.id
            ? { ...e, data: { ...e.data, [statusKey]: targetCol } }
            : e
        )
      );
      try {
        const res = await fetch(`/api/sections/${slug}/entries/${active.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: { [statusKey]: targetCol } }),
        });
        if (!res.ok) throw new Error("patch failed");
      } catch {
        setEntries(snapshot);
        toast.error("Failed to move card");
      }
    } else {
      // Same column reorder
      const colEntries = entriesForColumn(sourceCol);
      const oldIndex = colEntries.findIndex((e) => e._id === active.id);
      const newIndex = colEntries.findIndex((e) => e._id === over.id);
      if (oldIndex === newIndex) return;

      const reordered = arrayMove(colEntries, oldIndex, newIndex);
      const snapshot = entries;

      setEntries((prev) => {
        const others = prev.filter((e) => String(e.data[statusKey] ?? "") !== sourceCol);
        return [...others, ...reordered.map((e, i) => ({ ...e, order: i }))];
      });

      // PATCH order for the moved card
      const movedEntry = reordered[newIndex];
      try {
        const res = await fetch(`/api/sections/${slug}/entries/${movedEntry._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newIndex }),
        });
        if (!res.ok) throw new Error("order patch failed");
      } catch {
        setEntries(snapshot);
        toast.error("Failed to reorder card");
      }
    }
  }

  // Add card
  async function handleAdd(column: string, title: string, priority: string) {
    setAddingInColumn(null);
    const data: Record<string, unknown> = {};
    if (statusKey) data[statusKey] = column;
    data[titleKey] = title;
    if (priorityField && priority) data[priorityField.key] = priority;

    try {
      const res = await fetch(`/api/sections/${slug}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().split("T")[0], data }),
      });
      if (!res.ok) throw new Error("post failed");
      const { entry } = await res.json();
      setEntries((prev) => [...prev, { ...entry, order: entry.order ?? prev.length }]);
    } catch {
      toast.error("Failed to add card");
    }
  }

  // Delete card
  async function handleDelete(id: string) {
    const snapshot = entries;
    setEntries((prev) => prev.filter((e) => e._id !== id));
    try {
      const res = await fetch(`/api/sections/${slug}/entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      setEntries(snapshot);
      toast.error("Failed to delete card");
    }
  }

  // Guard: no status field
  if (!statusField) {
    return (
      <div className="board-no-status-msg">
        This board needs a &apos;status&apos; select field with the column names.
      </div>
    );
  }

  if (loading) {
    return <div className="board-loading stat-label">Loading board…</div>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="board-columns-wrapper">
        {columns.map((col) => {
          const colEntries = entriesForColumn(col);
          return (
            <div key={col} className="board-column">
              {/* Column header */}
              <div className="board-column-header">
                <span className="board-column-title">{col}</span>
                <span className="board-column-count num">{colEntries.length}</span>
              </div>

              {/* Cards */}
              <SortableContext
                items={colEntries.map((e) => e._id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="board-cards-list">
                  {colEntries.map((entry) => (
                    <SortableCard
                      key={entry._id}
                      entry={entry}
                      titleKey={titleKey}
                      priorityField={priorityField}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>

              {/* Inline add form or button */}
              {addingInColumn === col ? (
                <InlineAddForm
                  column={col}
                  titleKey={titleKey}
                  priorityField={priorityField}
                  onCancel={() => setAddingInColumn(null)}
                  onConfirm={(title, priority) => handleAdd(col, title, priority)}
                />
              ) : (
                <button
                  onClick={() => setAddingInColumn(col)}
                  className="board-add-btn"
                  aria-label={`Add card to ${col}`}
                >
                  <Plus size={14} />
                  Add
                </button>
              )}
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
```

- [ ] **Step 2: Add board styles to the global CSS**

Append these CSS variables/classes to the global stylesheet (find it with `ls src/app/globals.css` or equivalent). These use only Editorial Calm tokens:

```css
/* ---- Board View ---- */
.board-columns-wrapper {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding-bottom: 1rem;
  align-items: flex-start;
}

.board-column {
  flex: 0 0 260px;
  min-width: 240px;
  background: var(--surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.board-column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.board-column-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.board-column-count {
  font-size: 0.7rem;
  color: var(--text-faint);
  background: var(--surface-2);
  border-radius: 999px;
  padding: 0 6px;
  min-width: 20px;
  text-align: center;
}

.board-cards-list {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  min-height: 2rem;
}

.board-card {
  position: relative;
  background: var(--surface-0);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 0.625rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  cursor: grab;
  user-select: none;
}

.board-card:active {
  cursor: grabbing;
}

.board-card-drag-handle {
  /* the draggable area is the whole header */
}

.board-card-title {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
  word-break: break-word;
}

.board-card-delete {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 6px;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-faint);
  border-radius: var(--radius-sm);
  transition: color 0.15s, background 0.15s;
  opacity: 0;
}

.board-card:hover .board-card-delete,
.board-card:focus-within .board-card-delete {
  opacity: 1;
}

.board-card-delete:hover {
  color: var(--alert);
  background: var(--alert-wash);
}

/* Priority badges */
.board-priority-badge {
  display: inline-block;
  font-size: 0.6875rem;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: 999px;
  text-transform: capitalize;
  width: fit-content;
}

.priority-low {
  color: var(--good);
  background: var(--good-wash);
}

.priority-medium {
  color: var(--warn);
  background: var(--warn-wash);
}

.priority-high {
  color: var(--alert);
  background: var(--alert-wash);
}

.priority-default {
  color: var(--text-muted);
  background: var(--surface-2);
}

/* Inline add form */
.board-add-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  padding: 0.5rem 0.25rem;
  min-height: 44px;
  border-radius: var(--radius-md);
  transition: color 0.15s, background 0.15s;
  width: 100%;
}

.board-add-btn:hover {
  color: var(--text-primary);
  background: var(--surface-1);
}

.board-inline-form {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.5rem;
  background: var(--surface-0);
  border: 1px solid var(--accent-color);
  border-radius: var(--radius-md);
}

.board-inline-input,
.board-inline-select {
  font-size: 0.8125rem;
  padding: 0.375rem 0.5rem;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
  background: var(--surface-1);
  color: var(--text-primary);
  width: 100%;
  outline: none;
}

.board-inline-input:focus,
.board-inline-select:focus {
  border-color: var(--accent-color);
}

.board-inline-actions {
  display: flex;
  gap: 0.375rem;
  justify-content: flex-end;
}

.board-inline-confirm,
.board-inline-cancel {
  padding: 6px;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: color 0.15s, background 0.15s;
}

.board-inline-confirm {
  color: var(--good);
}
.board-inline-confirm:hover:not(:disabled) {
  background: var(--good-wash);
}
.board-inline-confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.board-inline-cancel {
  color: var(--text-muted);
}
.board-inline-cancel:hover {
  color: var(--alert);
  background: var(--alert-wash);
}

.board-no-status-msg {
  padding: 2rem;
  text-align: center;
  font-size: 0.875rem;
  color: var(--text-muted);
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-lg);
}

.board-loading {
  padding: 1rem 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/sections/board-view.tsx
git commit -m "feat: BoardView component with DnD columns and priority badges"
```

---

### Task 4: Run failing tests, then fix them

- [ ] **Step 1: Run tests**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm test -- --reporter=verbose 2>&1 | tail -50
```

Expected: tests should now pass (they may need adjustments to match the actual rendered output — fix any mismatches now).

- [ ] **Step 2: Fix any test mismatches**

Common fixes:
- If `aria-label="Delete entry"` doesn't match, adjust the button's aria-label to `"Delete entry"`.
- If `placeholder="Task title..."` doesn't match, fix the placeholder in the component.
- If priority badge classes don't match, verify `priorityClass()` returns `"priority-high"` etc.

---

### Task 5: Wire BoardView into the section page

**Files:**
- Modify: `src/app/(app)/sections/[slug]/page.tsx`

**Context:** Import BoardView. When `template.viewType === "board"`, render only `PageHeader` + `BoardView`. Skip all week navigation, form, and other viewType rendering.

- [ ] **Step 1: Add import**

At the top of the file, after the existing component imports:

```typescript
import { BoardView } from "@/components/sections/board-view";
```

- [ ] **Step 2: Add board early-return after `if (!template)` block**

After the `if (!template)` return block (around line 101), add:

```typescript
// Board view — no week navigation, self-contained
if (template.viewType === "board") {
  return (
    <div className="animate-slide-up">
      <PageHeader
        title={template.name}
        description={template.description}
        action={
          <button
            onClick={() => { window.location.href = `/api/export/custom:${slug}`; }}
            className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-[var(--text-muted)]"
            aria-label="Export to Excel"
          >
            <Download size={16} />
          </button>
        }
      />
      <BoardView slug={slug} template={template} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/sections/[slug]/page.tsx
git commit -m "feat: wire BoardView into section page for viewType board"
```

---

### Task 6: Add global board CSS to stylesheet

**Files:**
- Modify: `src/app/globals.css` (or wherever global CSS lives — check with `ls src/app/`)

- [ ] **Step 1: Find and open global CSS**

```bash
ls /Users/artemijfridriksen/projects/personal_planner/src/app/globals.css
```

- [ ] **Step 2: Append board CSS block**

Append the CSS from Task 3 Step 2 to the bottom of `globals.css`.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: add board-view CSS tokens and layout classes"
```

---

### Task 7: Run build and all tests

- [ ] **Step 1: Run tests**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm test 2>&1 | tail -20
```

Expected: all pass

- [ ] **Step 2: Run build**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm build 2>&1 | tail -30
```

Expected: `Compiled successfully` (or `✓ Compiled`)

- [ ] **Step 3: Fix any TypeScript / build errors**

Common issues:
- Missing `_id` in lean Mongoose result: cast via `(template as Template & { _id: string })`
- Import resolution: ensure `board-view.tsx` export name matches import

- [ ] **Step 4: Final commit (if any fixes needed)**

```bash
git add -p
git commit -m "fix: resolve build/TS errors in BoardView"
```

- [ ] **Step 5: Create the feature commit**

```bash
git add src/components/sections/board-view.tsx src/components/sections/__tests__/board-view.test.tsx src/app/api/sections/[slug]/entries/route.ts src/app/(app)/sections/[slug]/page.tsx src/app/globals.css
git commit -m "feat: Kanban BoardView with drag-and-drop + priority"
```

---

## Self-Review Checklist

- [x] **?all=1 branch** → Task 1 adds it to GET route
- [x] **Columns from status options** → `findStatusField()` in board-view.tsx
- [x] **First select keyed "status" or fallback first select** → `findStatusField()` logic
- [x] **Cards in correct column** → `entriesForColumn()` filters by status value
- [x] **Unknown status → first column** → fallback condition in `entriesForColumn()`
- [x] **Card title = first text field** → `findTitleField()`
- [x] **Priority badge coloring** → `priorityClass()` returns `priority-low/medium/high`
- [x] **DnD with PointerSensor + KeyboardSensor** → sensors setup in BoardView
- [x] **Cross-column PATCH data.status** → `handleDragEnd` cross-column branch
- [x] **Same-column reorder PATCH order** → `handleDragEnd` same-column branch
- [x] **Optimistic update + rollback + toast** → snapshot + catch in both DnD handlers
- [x] **Add card per column** → `InlineAddForm` + `handleAdd`
- [x] **Delete card** → `handleDelete` with optimistic remove + rollback
- [x] **POST shape: { date, data }** → matches `createCustomEntrySchema`
- [x] **PATCH shape: { data } or { order }** → matches `[id]/route.ts`
- [x] **No status field fallback message** → guard before DndContext render
- [x] **44px touch targets** → all interactive elements have `min-h-[44px]` via CSS
- [x] **tokens only** → all colors use `var(--...)` CSS custom properties
- [x] **numbers className "num"** → column count badge uses `num`
- [x] **Board branch in page skips week nav** → early return before week nav block
- [x] **Tests cover: columns, cards in right place, priority badges, add, delete, fallback** → Task 2

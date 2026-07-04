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
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, X, Check } from "lucide-react";
import { format } from "date-fns";

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

function priorityClass(value: string): string {
  const v = value.toLowerCase();
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
    <div ref={setNodeRef} style={style} className="board-card group">
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

// ---- DroppableColumn ------------------------------------------------------

function DroppableColumn({ col, children }: { col: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${col}` });
  return (
    <div ref={setNodeRef} className={`board-column${isOver ? " board-column-over" : ""}`}>
      {children}
    </div>
  );
}

// ---- InlineAddForm --------------------------------------------------------

interface InlineAddFormProps {
  column: string;
  priorityField: FieldDef | null;
  onCancel: () => void;
  onConfirm: (title: string, priority: string) => void;
}

function InlineAddForm({ column: _column, priorityField, onCancel, onConfirm }: InlineAddFormProps) {
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
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
      <div className="board-inline-actions">
        <button
          onClick={() => {
            if (title.trim()) onConfirm(title.trim(), priority);
          }}
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
    if (!over || !statusKey) return;

    const activeEntry = entries.find((e) => e._id === active.id);
    if (!activeEntry) return;

    const overId = String(over.id);
    let targetCol: string | null = null;

    if (overId.startsWith("col:")) {
      // Dropped onto a DroppableColumn — extract column name
      targetCol = overId.slice(4);
    } else {
      // Dropped onto a card — resolve that card's column
      const overEntry = entries.find((e) => e._id === over.id);
      targetCol = overEntry ? String(overEntry.data[statusKey] ?? columns[0]) : null;
    }

    if (!targetCol) return;

    const sourceCol = String(activeEntry.data[statusKey] ?? columns[0]);

    // Build the desired order for every entry in the affected column(s) and
    // persist all of them — persisting only the dragged card leaves the rest
    // with colliding default orders that scramble on reload.
    const updates = new Map<string, { order: number; data?: Record<string, unknown> }>();

    if (sourceCol !== targetCol) {
      // Cross-column move: append to target column, re-index source column
      const sourceEntries = entriesForColumn(sourceCol).filter((e) => e._id !== active.id);
      const targetEntries = [...entriesForColumn(targetCol), activeEntry];
      sourceEntries.forEach((e, i) => updates.set(e._id, { order: i }));
      targetEntries.forEach((e, i) => {
        if (e._id === active.id) updates.set(e._id, { order: i, data: { [statusKey]: targetCol } });
        else updates.set(e._id, { order: i });
      });
    } else if (overId !== `col:${sourceCol}` && active.id !== over.id) {
      // Same-column reorder over a card (not dropping on column droppable, not same card)
      const colEntries = entriesForColumn(sourceCol);
      const oldIndex = colEntries.findIndex((e) => e._id === active.id);
      const newIndex = colEntries.findIndex((e) => e._id === over.id);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      arrayMove(colEntries, oldIndex, newIndex).forEach((e, i) =>
        updates.set(e._id, { order: i })
      );
    } else {
      return;
    }

    const snapshot = entries;
    setEntries((prev) =>
      prev.map((e) => {
        const u = updates.get(e._id);
        if (!u) return e;
        return { ...e, order: u.order, data: u.data ? { ...e.data, ...u.data } : e.data };
      })
    );

    try {
      const results = await Promise.all(
        Array.from(updates.entries()).map(([id, u]) =>
          fetch(`/api/sections/${slug}/entries/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(u.data ? { data: u.data, order: u.order } : { order: u.order }),
          })
        )
      );
      if (results.some((r) => !r.ok)) throw new Error("patch failed");
    } catch {
      setEntries(snapshot);
      toast.error("Failed to move card");
    }
  }

  // Add card
  async function handleAdd(column: string, title: string, priority: string) {
    setAddingInColumn(null);
    const data: Record<string, unknown> = {};
    if (statusKey) data[statusKey] = column;
    data[titleKey] = title;
    if (priorityField && priority) data[priorityField.key] = priority;

    // New cards go to the bottom of their column, not order 0 (the model
    // default), which would sort them to the top after reload.
    const colEntries = entriesForColumn(column);
    const order = colEntries.length
      ? Math.max(...colEntries.map((e) => e.order ?? 0)) + 1
      : 0;

    try {
      const res = await fetch(`/api/sections/${slug}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: format(new Date(), "yyyy-MM-dd"), data, order }),
      });
      if (!res.ok) throw new Error("post failed");
      const { entry } = await res.json();
      setEntries((prev) => [...prev, { ...entry, order: entry.order ?? order }]);
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
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="board-columns-wrapper">
        {columns.map((col) => {
          const colEntries = entriesForColumn(col);
          return (
            <DroppableColumn key={col} col={col}>
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
            </DroppableColumn>
          );
        })}
      </div>
    </DndContext>
  );
}

"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  Home,
  X,
  RotateCcw,
  Settings2,
} from "lucide-react";
import { format, addDays } from "date-fns";

interface ChecklistItem {
  _id: string | null;
  choreName: string;
  isRecurring: boolean;
  completed: boolean;
  frequency: string | null;
}

interface ChoreConfig {
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  active: boolean;
}

export default function HouseworkPage() {
  const [date, setDate] = useState(new Date());
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [chores, setChores] = useState<ChoreConfig[]>([]);
  const [newChoreName, setNewChoreName] = useState("");
  const [newChoreFreq, setNewChoreFreq] = useState<"daily" | "weekly" | "monthly">("daily");

  // Load chore config
  useEffect(() => {
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((data) => {
        setChores(data.houseworkConfig?.chores || []);
      });
  }, []);

  const addChore = async () => {
    if (!newChoreName.trim()) return;
    if (chores.some((c) => c.name.toLowerCase() === newChoreName.trim().toLowerCase())) {
      toast.error("Chore already exists");
      return;
    }
    const updated = [...chores, { name: newChoreName.trim(), frequency: newChoreFreq, active: true }];
    const res = await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ houseworkConfig: { chores: updated } }),
    });
    if (res.ok) {
      setChores(updated);
      setNewChoreName("");
      toast.success("Chore added");
      fetchChecklist(date);
    }
  };

  const removeChore = async (name: string) => {
    const updated = chores.filter((c) => c.name !== name);
    const res = await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ houseworkConfig: { chores: updated } }),
    });
    if (res.ok) {
      setChores(updated);
      toast.success("Chore removed");
      fetchChecklist(date);
    }
  };

  const fetchChecklist = (d: Date) => {
    setLoading(true);
    fetch(`/api/housework?date=${d.toISOString()}`)
      .then((r) => r.json())
      .then((data) => {
        setChecklist(data.checklist || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchChecklist(date);
  }, [date]);

  const toggleItem = async (item: ChecklistItem) => {
    if (item._id) {
      // Update existing log
      const res = await fetch(`/api/housework/${item._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !item.completed }),
      });
      if (res.ok) {
        setChecklist((prev) =>
          prev.map((c) =>
            c._id === item._id ? { ...c, completed: !c.completed } : c
          )
        );
      }
    } else {
      // Create new log for recurring chore
      const res = await fetch("/api/housework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          choreName: item.choreName,
          date: date.toISOString(),
          isRecurring: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Now toggle it to completed
        const res2 = await fetch(`/api/housework/${data.log._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: true }),
        });
        if (res2.ok) {
          setChecklist((prev) =>
            prev.map((c) =>
              c.choreName === item.choreName && c.isRecurring
                ? { ...c, _id: data.log._id, completed: true }
                : c
            )
          );
        }
      }
    }
  };

  const completedCount = checklist.filter((c) => c.completed).length;
  const totalCount = checklist.length;

  const FREQ_LABELS: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Housework"
        description="Chores & recurring tasks"
        action={
          <button
            onClick={() => setShowManage((v) => !v)}
            className="p-2 rounded-lg transition-all"
            style={{
              background: showManage ? "var(--accent-glow)" : "var(--surface-1)",
              border: `1px solid ${showManage ? "var(--accent-color)" : "var(--border-subtle)"}`,
              color: showManage ? "var(--accent-color)" : "var(--text-muted)",
            }}
          >
            <Settings2 size={16} />
          </button>
        }
      />

      {/* Manage recurring chores panel */}
      {showManage && (
        <div className="planner-surface p-4 mb-6 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recurring Chores</h3>
          {chores.map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-3 p-2 rounded-lg"
              style={{ background: "var(--surface-2)" }}
            >
              <RotateCcw size={12} className="text-muted-foreground flex-shrink-0" />
              <span className="flex-1 text-sm font-medium">{c.name}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "var(--accent-glow)", color: "var(--accent-color)" }}
              >
                {c.frequency}
              </span>
              <button
                onClick={() => removeChore(c.name)}
                className="p-1.5 min-w-[28px] min-h-[28px] text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {chores.length === 0 && (
            <p className="text-xs text-muted-foreground">No recurring chores yet. Add one below.</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Chore name"
              value={newChoreName}
              onChange={(e) => setNewChoreName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addChore()}
              className="flex-1 px-3 py-2 rounded-lg text-sm min-w-0"
              style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
            <select
              value={newChoreFreq}
              onChange={(e) => setNewChoreFreq(e.target.value as ChoreConfig["frequency"])}
              className="px-2 py-2 rounded-lg text-xs flex-shrink-0"
              style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button
              onClick={addChore}
              disabled={!newChoreName.trim()}
              className="px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50 flex-shrink-0"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setDate((d) => addDays(d, -1))}
          className="p-2 rounded-lg transition-all hover:-translate-y-0.5"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="text-center">
          <span className="text-sm font-medium">{format(date, "EEEE, MMM d, yyyy")}</span>
          {format(date, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd") && (
            <button
              onClick={() => setDate(new Date())}
              className="block mx-auto text-[10px] mt-0.5 hover:underline"
              style={{ color: "var(--accent-color)" }}
            >
              Go to today
            </button>
          )}
        </div>
        <button
          onClick={() => setDate((d) => addDays(d, 1))}
          className="p-2 rounded-lg transition-all hover:-translate-y-0.5"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Progress */}
      {totalCount > 0 && (
        <div className="planner-surface p-4 mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">
              {completedCount}/{totalCount} done
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                background: "var(--accent-color)",
              }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="planner-surface p-4 h-14 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Uncompleted items first, then completed */}
          {checklist
            .sort((a, b) => Number(a.completed) - Number(b.completed))
            .map((item, idx) => (
              <div
                key={item._id || `recurring-${idx}`}
                className="planner-surface p-4 flex items-center gap-3 transition-all"
                style={{ opacity: item.completed ? 0.5 : 1 }}
              >
                <button
                  onClick={() => toggleItem(item)}
                  className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: item.completed ? "var(--accent-color)" : "transparent",
                    border: `2px solid ${item.completed ? "var(--accent-color)" : "var(--border-subtle)"}`,
                  }}
                >
                  {item.completed && <Check size={14} style={{ color: "var(--background)" }} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium"
                    style={{ textDecoration: item.completed ? "line-through" : "none" }}
                  >
                    {item.choreName}
                  </p>
                  {item.isRecurring && item.frequency && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <RotateCcw size={10} className="text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">
                        {FREQ_LABELS[item.frequency] || item.frequency}
                      </span>
                    </div>
                  )}
                </div>
                {!item.isRecurring && item._id && (
                  <button
                    onClick={async () => {
                      await fetch(`/api/housework/${item._id}`, { method: "DELETE" });
                      setChecklist((prev) => prev.filter((c) => c._id !== item._id));
                      toast.success("Removed");
                    }}
                    className="p-1.5 min-w-[28px] min-h-[28px] text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}

          {checklist.length === 0 && (
            <div className="planner-surface p-8 text-center">
              <Home size={32} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">
                No tasks for this day.
              </p>
              {chores.length === 0 && (
                <button
                  onClick={() => setShowManage(true)}
                  className="text-sm font-medium px-4 py-2 rounded-lg"
                  style={{ background: "var(--accent-glow)", color: "var(--accent-color)", border: "1px solid var(--accent-color)" }}
                >
                  Set up recurring chores
                </button>
              )}
            </div>
          )}

          {/* Add one-off task */}
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--surface-1)",
              border: "1px dashed var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            <Plus size={14} />
            Add task
          </button>
        </div>
      )}

      {/* Add task modal */}
      {showAddForm && (
        <AddTaskModal
          date={date}
          onClose={() => setShowAddForm(false)}
          onSuccess={(item) => {
            setChecklist((prev) => [...prev, item]);
            setShowAddForm(false);
          }}
        />
      )}
    </div>
  );
}

function AddTaskModal({
  date,
  onClose,
  onSuccess,
}: {
  date: Date;
  onClose: () => void;
  onSuccess: (item: ChecklistItem) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    const res = await fetch("/api/housework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choreName: name, date: date.toISOString(), isRecurring: false }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("Task added");
      onSuccess({
        _id: data.log._id,
        choreName: data.log.choreName,
        isRecurring: false,
        completed: false,
        frequency: null,
      });
    } else {
      toast.error("Failed to add task");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-sm rounded-xl p-6 animate-slide-up"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Add Task</h3>
          <button onClick={onClose}>
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Task name</label>
            <input
              type="text"
              placeholder="e.g. Clean garage"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

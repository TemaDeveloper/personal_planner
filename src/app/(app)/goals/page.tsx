"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import {
  Plus,
  Trash2,
  Check,
  Target,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { format } from "date-fns";

interface Milestone {
  title: string;
  completed: boolean;
}

interface Goal {
  _id: string;
  title: string;
  description?: string;
  targetDate?: string;
  category: string;
  status: string;
  milestones: Milestone[];
}

const CATEGORIES = ["personal", "career", "health", "financial"] as const;
const STATUSES = ["active", "completed", "paused"] as const;

const CAT_COLORS: Record<string, string> = {
  personal: "#9B72F0",
  career: "#D4A853",
  health: "#22c55e",
  financial: "#5B9BD5",
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d) => {
        setGoals(d.goals || []);
        setLoading(false);
      });
  }, []);

  const filtered = goals.filter((g) => {
    if (filterStatus && g.status !== filterStatus) return false;
    if (filterCategory && g.category !== filterCategory) return false;
    return true;
  });

  const toggleMilestone = async (goal: Goal, msIdx: number) => {
    const updated = [...goal.milestones];
    updated[msIdx] = { ...updated[msIdx], completed: !updated[msIdx].completed };

    const res = await fetch(`/api/goals/${goal._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ milestones: updated }),
    });

    if (res.ok) {
      setGoals((prev) =>
        prev.map((g) =>
          g._id === goal._id ? { ...g, milestones: updated } : g
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Goals" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="planner-surface p-6 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Goals"
        description="Goals & milestones"
        action={
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-all hover:-translate-y-0.5"
          >
            <Plus size={14} />
            New Goal
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["", ...STATUSES].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setFilterStatus(s)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filterStatus === s ? "var(--accent-glow)" : "var(--surface-1)",
              border: `1px solid ${filterStatus === s ? "var(--accent-color)" : "var(--border-subtle)"}`,
              color: filterStatus === s ? "var(--accent-color)" : "var(--text-muted)",
            }}
          >
            {s || "All"}
          </button>
        ))}
        <span className="text-muted-foreground self-center">|</span>
        {["", ...CATEGORIES].map((c) => (
          <button
            key={c || "all-cat"}
            onClick={() => setFilterCategory(c)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filterCategory === c ? "var(--accent-glow)" : "var(--surface-1)",
              border: `1px solid ${filterCategory === c ? "var(--accent-color)" : "var(--border-subtle)"}`,
              color: filterCategory === c ? "var(--accent-color)" : "var(--text-muted)",
            }}
          >
            {c ? c.charAt(0).toUpperCase() + c.slice(1) : "All"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="planner-surface p-8 text-center">
          <Target size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {goals.length === 0 ? "No goals yet. Create your first goal!" : "No goals match filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((goal) => {
            const doneMs = goal.milestones.filter((m) => m.completed).length;
            const totalMs = goal.milestones.length;
            const pct = totalMs > 0 ? (doneMs / totalMs) * 100 : 0;
            const expanded = expandedGoal === goal._id;

            return (
              <div key={goal._id} className="planner-surface p-5">
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
                    style={{ background: CAT_COLORS[goal.category] || "var(--accent-color)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold">{goal.title}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{
                          background: goal.status === "active" ? "var(--accent-glow)" : "var(--surface-2)",
                          color: goal.status === "active" ? "var(--accent-color)" : "var(--text-muted)",
                        }}
                      >
                        {goal.status}
                      </span>
                    </div>
                    {goal.description && (
                      <p className="text-xs text-muted-foreground mb-2">{goal.description}</p>
                    )}
                    {goal.targetDate && (
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}
                      </p>
                    )}

                    {/* Progress bar */}
                    {totalMs > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span>{doneMs}/{totalMs} milestones</span>
                          <span>{Math.round(pct)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: "var(--accent-color)" }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Milestones */}
                    {expanded && totalMs > 0 && (
                      <div className="space-y-1.5 mt-3">
                        {goal.milestones.map((ms, i) => (
                          <button
                            key={i}
                            onClick={() => toggleMilestone(goal, i)}
                            className="w-full flex items-center gap-2 text-left text-xs p-2 rounded-md transition-all"
                            style={{ background: "var(--surface-2)" }}
                          >
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                              style={{
                                background: ms.completed ? "var(--accent-color)" : "transparent",
                                border: `1.5px solid ${ms.completed ? "var(--accent-color)" : "var(--border-subtle)"}`,
                              }}
                            >
                              {ms.completed && <Check size={10} style={{ color: "var(--background)" }} />}
                            </div>
                            <span style={{ textDecoration: ms.completed ? "line-through" : "none", opacity: ms.completed ? 0.5 : 1 }}>
                              {ms.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {totalMs > 0 && (
                      <button
                        onClick={() => setExpandedGoal(expanded ? null : goal._id)}
                        className="p-1.5 text-muted-foreground"
                      >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                    <select
                      value={goal.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        const res = await fetch(`/api/goals/${goal._id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status: newStatus }),
                        });
                        if (res.ok) {
                          setGoals((prev) =>
                            prev.map((g) =>
                              g._id === goal._id ? { ...g, status: newStatus } : g
                            )
                          );
                        }
                      }}
                      className="text-xs rounded px-1 py-1"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="paused">Paused</option>
                    </select>
                    <button
                      onClick={async () => {
                        await fetch(`/api/goals/${goal._id}`, { method: "DELETE" });
                        setGoals((prev) => prev.filter((g) => g._id !== goal._id));
                        toast.success("Goal deleted");
                      }}
                      className="p-1.5 min-w-[28px] min-h-[28px] text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <GoalModal
          onClose={() => setShowForm(false)}
          onSuccess={(g) => {
            setGoals((prev) => [g, ...prev]);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function GoalModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (g: Goal) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [category, setCategory] = useState("personal");
  const [milestones, setMilestones] = useState<string[]>([""]);
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
    if (!title.trim()) return;
    setSaving(true);

    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        targetDate: targetDate || undefined,
        category,
        milestones: milestones
          .filter((m) => m.trim())
          .map((m) => ({ title: m, completed: false })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("Goal created");
      onSuccess(data.goal);
    } else {
      toast.error("Failed to create goal");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">New Goal</h3>
          <button onClick={onClose}>
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title</label>
            <input
              type="text"
              placeholder="What do you want to achieve?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description (optional)</label>
            <textarea
              placeholder="More details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Target date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Milestones</label>
            <div className="space-y-2">
              {milestones.map((ms, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={`Milestone ${i + 1}`}
                    value={ms}
                    onChange={(e) => {
                      const updated = [...milestones];
                      updated[i] = e.target.value;
                      setMilestones(updated);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg text-sm"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  />
                  {milestones.length > 1 && (
                    <button type="button" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))}>
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMilestones([...milestones, ""])}
                className="text-xs hover:underline"
                style={{ color: "var(--accent-color)" }}
              >
                + Add milestone
              </button>
            </div>
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
              disabled={saving || !title.trim()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

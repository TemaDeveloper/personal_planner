"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-input";
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
import { EmptyState } from "@/components/ui/empty-state";
import { PageTransition } from "@/components/ui/page-transition";

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
            <Card key={i} className="h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Goals"
        description="Goals & milestones"
        action={
          <Button onClick={() => setShowForm(true)} size="md">
            <Plus size={14} />
            New Goal
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["", ...STATUSES].map((s) => (
          <Button
            key={s || "all"}
            onClick={() => setFilterStatus(s)}
            variant={filterStatus === s ? "primary" : "outline"}
            size="sm"
            className={filterStatus === s ? "" : "text-[var(--text-muted)] border-[var(--border-subtle)]"}
          >
            {s || "All"}
          </Button>
        ))}
        <span className="text-[var(--text-muted)] self-center">|</span>
        {["", ...CATEGORIES].map((c) => (
          <Button
            key={c || "all-cat"}
            onClick={() => setFilterCategory(c)}
            variant={filterCategory === c ? "primary" : "outline"}
            size="sm"
            className={filterCategory === c ? "" : "text-[var(--text-muted)] border-[var(--border-subtle)]"}
          >
            {c ? c.charAt(0).toUpperCase() + c.slice(1) : "All"}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Set your first goal and track progress with milestones."
            actionLabel="Add Goal"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <Card className="text-center" padding="lg">
            <Target size={32} className="mx-auto mb-3 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">No goals match filters.</p>
          </Card>
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((goal) => {
            const doneMs = goal.milestones.filter((m) => m.completed).length;
            const totalMs = goal.milestones.length;
            const pct = totalMs > 0 ? (doneMs / totalMs) * 100 : 0;
            const expanded = expandedGoal === goal._id;

            return (
              <Card key={goal._id} padding="md">
                <div className="flex items-start gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1.5"
                    style={{ background: CAT_COLORS[goal.category] || "var(--accent-color)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{goal.title}</span>
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
                      <p className="text-xs text-[var(--text-muted)] mb-2">{goal.description}</p>
                    )}
                    {goal.targetDate && (
                      <p className="text-[10px] text-[var(--text-muted)] mb-2">
                        Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}
                      </p>
                    )}

                    {/* Progress bar */}
                    {totalMs > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1">
                          <span>{doneMs}/{totalMs} milestones</span>
                        </div>
                        <Progress value={pct} size="sm" showLabel />
                      </div>
                    )}

                    {/* Milestones */}
                    {expanded && totalMs > 0 && (
                      <div className="space-y-1.5 mt-3">
                        {goal.milestones.map((ms, i) => (
                          <button
                            key={i}
                            onClick={() => toggleMilestone(goal, i)}
                            className="w-full flex items-center gap-2 text-left text-xs p-2 rounded-md transition-all bg-[var(--surface-2)]"
                          >
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                              style={{
                                background: ms.completed ? "var(--accent-color)" : "transparent",
                                border: `1.5px solid ${ms.completed ? "var(--accent-color)" : "var(--border-subtle)"}`,
                              }}
                            >
                              {ms.completed && <Check size={10} className="text-[var(--background)]" />}
                            </div>
                            <span
                              className="text-[var(--text-primary)]"
                              style={{ textDecoration: ms.completed ? "line-through" : "none", opacity: ms.completed ? 0.5 : 1 }}
                            >
                              {ms.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {totalMs > 0 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedGoal(expanded ? null : goal._id)}
                      >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                    )}
                    <FormSelect
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
                      className="text-xs !py-1 !px-1"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="paused">Paused</option>
                    </FormSelect>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        await fetch(`/api/goals/${goal._id}`, { method: "DELETE" });
                        setGoals((prev) => prev.filter((g) => g._id !== goal._id));
                        toast.success("Goal deleted");
                      }}
                      className="hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <GoalModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={(g) => {
          setGoals((prev) => [g, ...prev]);
          setShowForm(false);
        }}
      />
    </PageTransition>
  );
}

function GoalModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (g: Goal) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [category, setCategory] = useState("personal");
  const [milestones, setMilestones] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);

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
    <Modal open={open} onClose={onClose} title="New Goal" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Title"
          type="text"
          placeholder="What do you want to achieve?"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <FormTextarea
          label="Description (optional)"
          placeholder="More details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormSelect
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </FormSelect>

          <FormInput
            label="Target date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Milestones</label>
          <div className="space-y-2">
            {milestones.map((ms, i) => (
              <div key={i} className="flex items-center gap-2">
                <FormInput
                  placeholder={`Milestone ${i + 1}`}
                  value={ms}
                  onChange={(e) => {
                    const updated = [...milestones];
                    updated[i] = e.target.value;
                    setMilestones(updated);
                  }}
                  className="flex-1"
                />
                {milestones.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setMilestones(milestones.filter((_, j) => j !== i))}
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setMilestones([...milestones, ""])}
              className="text-xs text-[var(--accent-color)] hover:underline"
            >
              + Add milestone
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving || !title.trim()}
            className="flex-1"
          >
            {saving ? "Creating..." : "Create goal"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

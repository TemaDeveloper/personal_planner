"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-input";
import { StatBlock } from "@/components/ui/stat-block";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  Check,
  Target,
  ChevronDown,
  ChevronUp,
  X,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageTransition } from "@/components/ui/page-transition";
import { SectionCustomFields } from "@/components/sections/custom-fields";

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

/** Map category → CSS token (chart-1..5) — no hardcoded hex. */
const CAT_TOKEN: Record<string, string> = {
  personal: "var(--chart-3)",  // plum
  career:   "var(--chart-4)",  // amber
  health:   "var(--chart-5)",  // sage green
  financial: "var(--chart-2)", // ocean blue
};

/** Status pill tokens */
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  active:    { bg: "var(--good-wash)",  color: "var(--good)" },
  completed: { bg: "var(--good-wash)",  color: "var(--good)" },
  paused:    { bg: "var(--warn-wash)",  color: "var(--warn)" },
};

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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

    try {
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
      } else {
        toast.error("Failed to update milestone");
      }
    } catch {
      toast.error("Failed to update milestone");
    }
  };

  if (loading) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Goals" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  /* Hero summary stats */
  const activeCount = goals.filter((g) => g.status === "active").length;
  const completedCount = goals.filter((g) => g.status === "completed").length;
  const allMilestones = goals.flatMap((g) => g.milestones);
  const doneMilestonesTotal = allMilestones.filter((m) => m.completed).length;

  return (
    <PageTransition>
      <PageHeader
        title="Goals"
        description="Goals & milestones"
        action={
          <>
            <button
              onClick={() => { window.location.href = "/api/export/goals"; }}
              className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-[var(--text-muted)]"
              aria-label="Export to Excel"
            >
              <Download size={16} />
            </button>
            <Button onClick={() => setShowForm(true)} size="md">
              <Plus size={14} />
              New Goal
            </Button>
          </>
        }
      />

      {/* Hero summary — only when there are goals */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatBlock
            label="Active goals"
            value={String(activeCount)}
            size="lg"
          />
          <StatBlock
            label="Completed"
            value={String(completedCount)}
            size="lg"
          />
          <StatBlock
            label="Milestones done"
            value={`${doneMilestonesTotal}/${allMilestones.length}`}
            size="lg"
          />
        </div>
      )}

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
        <span className="text-[var(--text-faint)] self-center select-none">|</span>
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
          <EmptyState
            icon={Target}
            title="No goals match filters"
            description="Try adjusting your filters to see more goals."
          />
        )
      ) : (
        <div className="space-y-3">
          {filtered.map((goal) => {
            const doneMs = goal.milestones.filter((m) => m.completed).length;
            const totalMs = goal.milestones.length;
            const pct = totalMs > 0 ? (doneMs / totalMs) * 100 : 0;
            const expanded = expandedGoal === goal._id;
            const statusStyle = STATUS_STYLE[goal.status] ?? { bg: "var(--surface-2)", color: "var(--text-muted)" };

            return (
              <Card key={goal._id} padding="md">
                <div className="flex items-start gap-3">
                  {/* Category dot using chart token, no hardcoded hex */}
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-2"
                    style={{ background: CAT_TOKEN[goal.category] ?? "var(--accent-color)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-[var(--text-primary)] truncate max-w-[200px] sm:max-w-none">
                        {goal.title}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{
                          background: statusStyle.bg,
                          color: statusStyle.color,
                        }}
                      >
                        {goal.status}
                      </span>
                    </div>

                    {goal.description && (
                      <p className="text-xs text-[var(--text-muted)] mb-2">{goal.description}</p>
                    )}
                    {goal.targetDate && (
                      <p className="text-[10px] text-[var(--text-faint)] mb-2">
                        Target: {format(new Date(goal.targetDate), "MMM d, yyyy")}
                      </p>
                    )}

                    {/* Progress bar */}
                    {totalMs > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-[var(--text-muted)] num">
                            {doneMs}/{totalMs} milestones
                          </span>
                        </div>
                        <Progress value={pct} size="sm" showLabel />
                      </div>
                    )}

                    {/* Milestones (expanded) */}
                    {expanded && totalMs > 0 && (
                      <div className="space-y-1.5 mt-3">
                        {goal.milestones.map((ms, i) => (
                          <button
                            key={i}
                            onClick={() => toggleMilestone(goal, i)}
                            className="w-full flex items-center gap-2 text-left text-xs p-2 rounded-md transition-colors bg-[var(--surface-2)] hover:bg-[var(--surface-1)] min-h-[44px]"
                          >
                            <div
                              className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors"
                              style={{
                                background: ms.completed ? "var(--accent-color)" : "transparent",
                                border: `1.5px solid ${ms.completed ? "var(--accent-color)" : "var(--border-subtle)"}`,
                              }}
                            >
                              {ms.completed && <Check size={10} className="text-[var(--background)]" />}
                            </div>
                            <span
                              className="text-[var(--text-primary)]"
                              style={{
                                textDecoration: ms.completed ? "line-through" : "none",
                                opacity: ms.completed ? 0.5 : 1,
                              }}
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
                        aria-label={expanded ? "Collapse milestones" : "Expand milestones"}
                      >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </Button>
                    )}
                    <FormSelect
                      value={goal.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        try {
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
                          } else {
                            toast.error("Failed to update status");
                          }
                        } catch {
                          toast.error("Failed to update status");
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
                      onClick={() => setDeleteTarget(goal._id)}
                      className="hover:text-destructive"
                      aria-label="Delete goal"
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

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            const res = await fetch(`/api/goals/${deleteTarget}`, { method: "DELETE" });
            if (res.ok) {
              setGoals((prev) => prev.filter((g) => g._id !== deleteTarget));
              toast.success("Goal deleted");
            } else {
              toast.error("Failed to delete goal");
            }
          } catch {
            toast.error("Failed to delete goal");
          } finally {
            setDeleting(false);
            setDeleteTarget(null);
          }
        }}
        title="Delete goal?"
        message="This will permanently delete this goal and all its milestones."
        confirmLabel="Delete"
        loading={deleting}
      />

      <GoalModal
        open={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={(g) => {
          setGoals((prev) => [g, ...prev]);
          setShowForm(false);
        }}
      />
      <SectionCustomFields sectionKey="goals" />
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
          <label className="stat-label mb-1.5 block">Milestones</label>
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
                    aria-label="Remove milestone"
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
              className="text-xs text-[var(--accent-text)] hover:underline"
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

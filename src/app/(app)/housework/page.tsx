"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect } from "@/components/ui/form-input";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  Home,
  RotateCcw,
  Settings2,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTransition } from "@/components/ui/page-transition";

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
    <PageTransition>
      <PageHeader
        title="Housework"
        description="Chores & recurring tasks"
        action={
          <Button
            onClick={() => setShowManage((v) => !v)}
            variant={showManage ? "primary" : "outline"}
            size="icon"
          >
            <Settings2 size={16} />
          </Button>
        }
      />

      {/* Manage recurring chores panel */}
      {showManage && (
        <Card padding="md" className="mb-6 space-y-3">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide">Recurring Chores</h3>
          {chores.map((c) => (
            <Card
              key={c.name}
              variant="inset"
              padding="sm"
              className="flex items-center gap-3"
            >
              <RotateCcw size={12} className="text-[var(--text-muted)] flex-shrink-0" />
              <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{c.name}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "var(--accent-glow)", color: "var(--accent-color)" }}
              >
                {c.frequency}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeChore(c.name)}
                className="hover:text-destructive"
              >
                <Trash2 size={14} />
              </Button>
            </Card>
          ))}
          {chores.length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">No recurring chores yet. Add one below.</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <FormInput
              type="text"
              placeholder="Chore name"
              value={newChoreName}
              onChange={(e) => setNewChoreName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addChore()}
              className="flex-1 min-w-0"
            />
            <FormSelect
              value={newChoreFreq}
              onChange={(e) => setNewChoreFreq(e.target.value as ChoreConfig["frequency"])}
              className="flex-shrink-0 text-xs"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </FormSelect>
            <Button
              onClick={addChore}
              disabled={!newChoreName.trim()}
              size="md"
            >
              Add
            </Button>
          </div>
        </Card>
      )}

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDate((d) => addDays(d, -1))}
        >
          <ChevronLeft size={16} />
        </Button>
        <div className="text-center">
          <span className="text-sm font-medium text-[var(--text-primary)]">{format(date, "EEEE, MMM d, yyyy")}</span>
          {format(date, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd") && (
            <button
              onClick={() => setDate(new Date())}
              className="block mx-auto text-[10px] mt-0.5 text-[var(--accent-color)] hover:underline"
            >
              Go to today
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDate((d) => addDays(d, 1))}
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Progress */}
      {totalCount > 0 && (
        <Card padding="md" className="mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-[var(--text-primary)]">Progress</span>
            <span className="text-[var(--text-muted)]">
              {completedCount}/{totalCount} done
            </span>
          </div>
          <Progress value={totalCount > 0 ? (completedCount / totalCount) * 100 : 0} size="md" />
        </Card>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="md" className="h-14 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Uncompleted items first, then completed */}
          {checklist
            .sort((a, b) => Number(a.completed) - Number(b.completed))
            .map((item, idx) => (
              <Card
                key={item._id || `recurring-${idx}`}
                padding="md"
                className="flex items-center gap-3 transition-all"
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
                  {item.completed && <Check size={14} className="text-[var(--background)]" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium text-[var(--text-primary)]"
                    style={{ textDecoration: item.completed ? "line-through" : "none" }}
                  >
                    {item.choreName}
                  </p>
                  {item.isRecurring && item.frequency && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <RotateCcw size={10} className="text-[var(--text-muted)]" />
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {FREQ_LABELS[item.frequency] || item.frequency}
                      </span>
                    </div>
                  )}
                </div>
                {!item.isRecurring && item._id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={async () => {
                      await fetch(`/api/housework/${item._id}`, { method: "DELETE" });
                      setChecklist((prev) => prev.filter((c) => c._id !== item._id));
                      toast.success("Removed");
                    }}
                    className="hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </Button>
                )}
              </Card>
            ))}

          {checklist.length === 0 && (
            <EmptyState
              icon={Home}
              title="Nothing logged today"
              description="Add your chores and tasks for today."
              actionLabel="Add Task"
              onAction={() => setShowAddForm(true)}
            />
          )}

          {/* Add one-off task */}
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 bg-[var(--surface-1)] border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)]"
          >
            <Plus size={14} />
            Add task
          </button>
        </div>
      )}

      {/* Add task modal */}
      <AddTaskModal
        open={showAddForm}
        date={date}
        onClose={() => setShowAddForm(false)}
        onSuccess={(item) => {
          setChecklist((prev) => [...prev, item]);
          setShowAddForm(false);
        }}
      />
    </PageTransition>
  );
}

function AddTaskModal({
  open,
  date,
  onClose,
  onSuccess,
}: {
  open: boolean;
  date: Date;
  onClose: () => void;
  onSuccess: (item: ChecklistItem) => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

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
    <Modal open={open} onClose={onClose} title="Add Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Task name"
          type="text"
          placeholder="e.g. Clean garage"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

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
            disabled={saving || !name.trim()}
            className="flex-1"
          >
            {saving ? "Adding..." : "Add"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

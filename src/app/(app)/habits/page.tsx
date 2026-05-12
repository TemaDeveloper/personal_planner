"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Check, Flame, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormInput } from "@/components/ui/form-input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Habit {
  _id: string;
  name: string;
  emoji: string;
  color: string;
  active: boolean;
}

interface HabitWithLogs extends Habit {
  completedToday: boolean;
  streak: number;
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitWithLogs[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchHabits = async () => {
    const res = await fetch("/api/habits");
    const data = await res.json();
    setHabits(data.habits || []);
    setLoading(false);
  };

  useEffect(() => {
    fetch("/api/habits")
      .then((r) => r.json())
      .then((data) => {
        setHabits(data.habits || []);
        setLoading(false);
      });
  }, []);

  const toggleHabit = async (habitId: string) => {
    const today = new Date().toISOString().split("T")[0];
    await fetch(`/api/habits/${habitId}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today }),
    });
    fetchHabits();
  };

  const deleteHabit = async (habitId: string) => {
    await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
    toast.success("Habit removed");
    fetchHabits();
  };

  const completedCount = habits.filter((h) => h.completedToday).length;

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Habits"
        description={`${completedCount}/${habits.length} completed today`}
        action={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} />
            Add
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="md" className="h-16 animate-pulse" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <Card padding="lg" className="text-center">
          <Flame size={32} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No habits yet. Add one to start tracking.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {habits.map((habit) => (
            <Card
              key={habit._id}
              padding="md"
              className="flex items-center gap-4"
            >
              <button
                onClick={() => toggleHabit(habit._id)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0"
                style={{
                  background: habit.completedToday
                    ? habit.color
                    : "var(--surface-2)",
                  border: `1px solid ${habit.completedToday ? habit.color : "var(--border-subtle)"}`,
                }}
              >
                {habit.completedToday && (
                  <Check size={14} className="text-[var(--background)]" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${habit.completedToday ? "line-through opacity-60" : ""}`}
                >
                  {habit.emoji} {habit.name}
                </p>
                {habit.streak > 0 && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Flame size={10} style={{ color: habit.color }} />
                    {habit.streak} day streak
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteHabit(habit._id)}
                className="flex-shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </Button>
            </Card>
          ))}
        </div>
      )}

      {showAdd && (
        <AddHabitModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            fetchHabits();
          }}
        />
      )}
    </div>
  );
}

function AddHabitModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [loading, setLoading] = useState(false);

  const colors = ["#D4A853", "#00C9A7", "#9B72F0", "#F07070", "#7EC8A0"];
  const [color, setColor] = useState(colors[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, emoji, color }),
    });

    if (res.ok) {
      toast.success("Habit created");
      onSuccess();
    } else {
      toast.error("Failed to create habit");
    }
    setLoading(false);
  };

  return (
    <Modal open onClose={onClose} title="New Habit">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Name"
          placeholder="e.g. Read 30 min"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Emoji"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={2}
            className="text-center text-xl"
          />
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Color
            </label>
            <div className="flex gap-2 pt-1">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-lg transition-all hover:scale-110"
                  style={{
                    background: c,
                    opacity: color === c ? 1 : 0.4,
                    boxShadow:
                      color === c ? `0 0 0 2px var(--background), 0 0 0 3px ${c}` : "none",
                  }}
                />
              ))}
            </div>
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
            variant="primary"
            disabled={loading}
            className="flex-1"
          >
            {loading ? "Creating..." : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

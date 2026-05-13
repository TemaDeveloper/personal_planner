"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Plus, Flame, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { FormInput } from "@/components/ui/form-input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressPie } from "@/components/ui/progress-pie";
import { addMonths, format, getDaysInMonth } from "date-fns";

interface HabitGrid {
  _id: string;
  name: string;
  emoji: string;
  color: string;
  dates: string[]; // ["2026-05-01", "2026-05-03", ...]
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<HabitGrid[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);

  const currentMonth = addMonths(new Date(), monthOffset);
  const daysInMonth = getDaysInMonth(currentMonth);
  const monthStr = format(currentMonth, "yyyy-MM");

  useEffect(() => {
    fetch(`/api/habits/grid?month=${monthStr}`)
      .then((r) => r.json())
      .then((d) => {
        setHabits(d.habits || []);
        setLoading(false);
      });
  }, [monthStr]);

  const refetchGrid = () => {
    fetch(`/api/habits/grid?month=${monthStr}`)
      .then((r) => r.json())
      .then((d) => setHabits(d.habits || []));
  };

  const toggleHabit = async (habitId: string, day: number) => {
    const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;

    // Optimistic update
    setHabits((prev) =>
      prev.map((h) => {
        if (h._id !== habitId) return h;
        const has = h.dates.includes(dateStr);
        return {
          ...h,
          dates: has ? h.dates.filter((d) => d !== dateStr) : [...h.dates, dateStr],
        };
      })
    );

    await fetch(`/api/habits/${habitId}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr }),
    });
  };

  const deleteHabit = async (habitId: string) => {
    await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
    toast.success("Habit removed");
    setHabits((prev) => prev.filter((h) => h._id !== habitId));
  };

  // Stats
  const totalPossible = habits.length * daysInMonth;
  const totalCompleted = habits.reduce((sum, h) => sum + h.dates.length, 0);

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Habits"
        description={`${totalCompleted} completions this month`}
        action={
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} />
            Add
          </Button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Grid */}
        <Card className="flex-1 overflow-x-auto">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="secondary" size="icon" className="w-7 h-7" onClick={() => setMonthOffset((p) => p - 1)}>
              <ChevronLeft size={14} />
            </Button>
            <span className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</span>
            <Button variant="secondary" size="icon" className="w-7 h-7" onClick={() => setMonthOffset((p) => p + 1)}>
              <ChevronRight size={14} />
            </Button>
          </div>

          {loading ? (
            <div className="h-40 animate-pulse rounded-lg" style={{ background: "var(--surface-1)" }} />
          ) : habits.length === 0 ? (
            <div className="text-center py-12">
              <Flame size={32} className="mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No habits yet. Add one to start tracking.</p>
            </div>
          ) : (
            <div className="min-w-[700px]">
              {/* Day number headers */}
              <div className="flex">
                <div className="w-36 flex-shrink-0" />
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const isToday = format(new Date(), "yyyy-MM-dd") === `${monthStr}-${String(day).padStart(2, "0")}`;
                  return (
                    <div
                      key={day}
                      className="flex-1 text-center text-[10px] font-semibold py-1 min-w-[22px]"
                      style={{
                        color: isToday ? "var(--accent-color)" : "var(--text-muted)",
                      }}
                    >
                      {day}
                    </div>
                  );
                })}
                <div className="w-16 flex-shrink-0 text-center text-[10px] font-semibold py-1" style={{ color: "var(--text-muted)" }}>
                  %
                </div>
              </div>

              {/* Habit rows */}
              {habits.map((habit) => {
                const completedDays = habit.dates.length;
                const pct = Math.round((completedDays / daysInMonth) * 100);

                return (
                  <div key={habit._id} className="flex items-center group border-t" style={{ borderColor: "var(--border-subtle)" }}>
                    {/* Habit name */}
                    <div className="w-36 flex-shrink-0 flex items-center gap-2 py-2 pr-2">
                      <span className="text-sm">{habit.emoji}</span>
                      <span className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{habit.name}</span>
                      <button
                        onClick={() => deleteHabit(habit._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto cursor-pointer"
                      >
                        <Trash2 size={10} className="text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>

                    {/* Day cells */}
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      const dateStr = `${monthStr}-${String(day).padStart(2, "0")}`;
                      const done = habit.dates.includes(dateStr);

                      return (
                        <button
                          key={day}
                          onClick={() => toggleHabit(habit._id, day)}
                          className="flex-1 flex items-center justify-center py-2 min-w-[22px] cursor-pointer transition-all hover:scale-125"
                        >
                          <div
                            className="w-3.5 h-3.5 rounded-sm transition-all"
                            style={{
                              background: done ? habit.color : "var(--surface-1)",
                              border: done ? "none" : "1px solid var(--border-subtle)",
                              opacity: done ? 1 : 0.4,
                            }}
                          />
                        </button>
                      );
                    })}

                    {/* Percentage */}
                    <div className="w-16 flex-shrink-0 text-center">
                      <span
                        className="text-xs font-bold"
                        style={{ color: pct >= 80 ? "var(--accent-color)" : "var(--text-muted)" }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Stats sidebar */}
        <div className="lg:w-56 flex flex-col gap-4">
          <Card className="flex items-center justify-center py-6">
            <ProgressPie
              completed={totalCompleted}
              target={totalPossible}
              label="completion"
            />
          </Card>

          <Card>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Habits</span>
                <span className="text-sm font-bold">{habits.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Completed</span>
                <span className="text-sm font-bold">{totalCompleted}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Possible</span>
                <span className="text-sm font-bold">{totalPossible}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {showAdd && (
        <AddHabitModal
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            refetchGrid();
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
  const colors = ["#22C55E", "#14B8A6", "#A78BFA", "#FB7185", "#60A5FA"];
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
        <FormInput label="Name" placeholder="e.g. Read 30 min" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} className="text-center text-xl" />
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Color</label>
            <div className="flex gap-2 pt-1">
              {colors.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-lg transition-all hover:scale-110 cursor-pointer"
                  style={{ background: c, opacity: color === c ? 1 : 0.4, boxShadow: color === c ? `0 0 0 2px var(--background), 0 0 0 3px ${c}` : "none" }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={loading} className="flex-1">{loading ? "Creating..." : "Create"}</Button>
        </div>
      </form>
    </Modal>
  );
}

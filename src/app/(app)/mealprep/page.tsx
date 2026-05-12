"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { startOfWeek, addWeeks, addDays, format } from "date-fns";

interface Meal {
  type: "breakfast" | "lunch" | "dinner" | "snack";
  name: string;
  notes?: string;
}

interface MealPlan {
  _id: string;
  date: string;
  dayOfWeek: number;
  meals: Meal[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export default function MealPrepPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDay, setEditDay] = useState<number | null>(null);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  useEffect(() => {
    let cancelled = false;
    const ws = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
    fetch(`/api/mealprep?weekOf=${ws.toISOString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setPlans(d.plans || []);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [weekOffset]);

  const getPlanForDay = (dayIndex: number) =>
    plans.find((p) => p.dayOfWeek === dayIndex + 1);

  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;

  return (
    <div className="animate-slide-up">
      <PageHeader title="Meal Prep" description="Weekly meal planning" />

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setWeekOffset((p) => p - 1)}
          className="p-2 rounded-lg transition-all hover:-translate-y-0.5"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium">{weekLabel}</span>
        <button
          onClick={() => setWeekOffset((p) => p + 1)}
          className="p-2 rounded-lg transition-all hover:-translate-y-0.5"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {DAYS.map((day, idx) => {
          const plan = getPlanForDay(idx);
          const dayDate = addDays(weekStart, idx);

          return (
            <div key={day} className="planner-surface p-4 min-h-[160px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--accent-color)" }}>
                    {day.slice(0, 3)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(dayDate, "MMM d")}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditDay(idx);
                    setShowForm(true);
                  }}
                  className="p-2 rounded-md hover:bg-muted transition-colors"
                >
                  <Plus size={14} className="text-muted-foreground" />
                </button>
              </div>

              {plan && plan.meals.length > 0 ? (
                <div className="flex-1 space-y-2">
                  {MEAL_TYPES.map((type) => {
                    const meals = plan.meals.filter((m) => m.type === type);
                    if (meals.length === 0) return null;
                    return (
                      <div key={type}>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                          {MEAL_LABELS[type]}
                        </p>
                        {meals.map((m, i) => (
                          <p key={i} className="text-xs truncate">{m.name}</p>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">No meals</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showForm && editDay !== null && (
        <MealForm
          date={addDays(weekStart, editDay)}
          dayOfWeek={editDay + 1}
          existing={getPlanForDay(editDay)}
          onClose={() => { setShowForm(false); setEditDay(null); }}
          onSuccess={(plan) => {
            setPlans((prev) => {
              const filtered = prev.filter((p) => p.dayOfWeek !== plan.dayOfWeek || p.date !== plan.date);
              return [...filtered, plan];
            });
            setShowForm(false);
            setEditDay(null);
          }}
        />
      )}
    </div>
  );
}

function MealForm({
  date,
  dayOfWeek,
  existing,
  onClose,
  onSuccess,
}: {
  date: Date;
  dayOfWeek: number;
  existing?: MealPlan;
  onClose: () => void;
  onSuccess: (plan: MealPlan) => void;
}) {
  const [meals, setMeals] = useState<{ type: string; name: string; notes: string }[]>(
    existing?.meals?.map((m) => ({ type: m.type, name: m.name, notes: m.notes || "" })) || [
      { type: "breakfast", name: "", notes: "" },
    ]
  );
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
    setSaving(true);

    const payload = {
      date: date.toISOString(),
      dayOfWeek,
      meals: meals
        .filter((m) => m.name.trim())
        .map((m) => ({ type: m.type, name: m.name, notes: m.notes || undefined })),
    };

    const res = await fetch("/api/mealprep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("Meals saved");
      onSuccess(data.plan);
    } else {
      toast.error("Failed to save");
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
          <h3 className="text-lg font-semibold">{format(date, "EEEE, MMM d")}</h3>
          <button onClick={onClose}>
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {meals.map((meal, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={meal.type}
                  onChange={(e) => {
                    const updated = [...meals];
                    updated[idx].type = e.target.value;
                    setMeals(updated);
                  }}
                  className="px-2 py-1.5 rounded text-xs"
                  style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  {MEAL_TYPES.map((t) => (
                    <option key={t} value={t}>{MEAL_LABELS[t]}</option>
                  ))}
                </select>
                {meals.length > 1 && (
                  <button type="button" onClick={() => setMeals(meals.filter((_, i) => i !== idx))} className="ml-auto">
                    <Trash2 size={12} className="text-muted-foreground" />
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder="Meal name"
                value={meal.name}
                onChange={(e) => {
                  const updated = [...meals];
                  updated[idx].name = e.target.value;
                  setMeals(updated);
                }}
                className="w-full px-2 py-1.5 rounded text-sm mb-1"
                style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
              <input
                type="text"
                placeholder="Notes (optional)"
                value={meal.notes}
                onChange={(e) => {
                  const updated = [...meals];
                  updated[idx].notes = e.target.value;
                  setMeals(updated);
                }}
                className="w-full px-2 py-1.5 rounded text-xs"
                style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
              />
            </div>
          ))}

          <button
            type="button"
            onClick={() => setMeals([...meals, { type: "lunch", name: "", notes: "" }])}
            className="w-full py-2 rounded-lg text-xs font-medium"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}
          >
            + Add meal
          </button>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">{saving ? "Saving..." : "Save meals"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

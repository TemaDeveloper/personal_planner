"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { FormInput, FormSelect } from "@/components/ui/form-input";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Download,
} from "lucide-react";
import { startOfWeek, addWeeks, addDays, format } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTransition } from "@/components/ui/page-transition";

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
  const [loading, setLoading] = useState(true);
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

  const hasAnyMeals = plans.some((p) => p.meals.length > 0);

  return (
    <PageTransition>
      <PageHeader
        title="Meal Prep"
        description="Weekly meal planning"
        action={
          <button
            onClick={() => { window.location.href = "/api/export/mealprep"; }}
            className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-[var(--text-muted)]"
            aria-label="Export to Excel"
          >
            <Download size={16} />
          </button>
        }
      />

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((p) => p - 1)}
          aria-label="Previous week"
        >
          <ChevronLeft size={16} />
        </Button>
        <span className="text-sm font-medium">{weekLabel}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((p) => p + 1)}
          aria-label="Next week"
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Empty state when no meals */}
      {!loading && !hasAnyMeals && (
        <EmptyState
          icon={UtensilsCrossed}
          title="No meal plans this week"
          description="Plan your meals for the week ahead."
          actionLabel="Plan Meals"
          onAction={() => { setEditDay(0); setShowForm(true); }}
        />
      )}

      {/* Weekly grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {DAYS.map((day, idx) => {
          const plan = getPlanForDay(idx);
          const dayDate = addDays(weekStart, idx);

          return (
            <Card key={day} padding="sm" className="min-h-[160px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-[var(--accent-color)]">
                    {day.slice(0, 3)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(dayDate, "MMM d")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  aria-label="Edit meal plan"
                  onClick={() => {
                    setEditDay(idx);
                    setShowForm(true);
                  }}
                >
                  <Plus size={14} />
                </Button>
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
            </Card>
          );
        })}
      </div>

      <Modal
        open={showForm && editDay !== null}
        onClose={() => { setShowForm(false); setEditDay(null); }}
        title={editDay !== null ? format(addDays(weekStart, editDay), "EEEE, MMM d") : ""}
        maxWidth="max-w-md"
      >
        {editDay !== null && (
          <MealFormContent
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
      </Modal>
    </PageTransition>
  );
}

function MealFormContent({
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
    <form onSubmit={handleSubmit} className="space-y-3">
      {meals.map((meal, idx) => (
        <Card key={idx} variant="inset" padding="sm">
          <div className="flex items-center gap-2 mb-2">
            <FormSelect
              value={meal.type}
              onChange={(e) => {
                const updated = [...meals];
                updated[idx].type = e.target.value;
                setMeals(updated);
              }}
              className="text-xs !py-1.5 !px-2"
            >
              {MEAL_TYPES.map((t) => (
                <option key={t} value={t}>{MEAL_LABELS[t]}</option>
              ))}
            </FormSelect>
            {meals.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto h-6 w-6"
                aria-label="Remove meal"
                onClick={() => setMeals(meals.filter((_, i) => i !== idx))}
              >
                <Trash2 size={12} />
              </Button>
            )}
          </div>
          <FormInput
            type="text"
            placeholder="Meal name"
            value={meal.name}
            onChange={(e) => {
              const updated = [...meals];
              updated[idx].name = e.target.value;
              setMeals(updated);
            }}
            className="mb-1 text-sm"
          />
          <FormInput
            type="text"
            placeholder="Notes (optional)"
            value={meal.notes}
            onChange={(e) => {
              const updated = [...meals];
              updated[idx].notes = e.target.value;
              setMeals(updated);
            }}
            className="text-xs"
          />
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        size="sm"
        onClick={() => setMeals([...meals, { type: "lunch", name: "", notes: "" }])}
      >
        + Add meal
      </Button>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? "Saving..." : "Save meals"}
        </Button>
      </div>
    </form>
  );
}

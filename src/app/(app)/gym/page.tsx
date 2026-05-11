"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  X,
} from "lucide-react";
import { startOfWeek, addWeeks, addDays, format } from "date-fns";

interface ExerciseSet {
  reps: number;
  weight: number;
}

interface Exercise {
  name: string;
  sets: ExerciseSet[];
}

interface Workout {
  _id: string;
  date: string;
  dayOfWeek: number;
  exercises: Exercise[];
  note?: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function GymPage() {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(0);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editDay, setEditDay] = useState<number | null>(null);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), {
    weekStartsOn: 1,
  });

  useEffect(() => {
    setLoading(true);
    fetch(`/api/gym/workouts?weekOf=${weekStart.toISOString()}`)
      .then((r) => r.json())
      .then((d) => {
        setWorkouts(d.workouts || []);
        setLoading(false);
      });
  }, [weekOffset]);

  const getWorkoutForDay = (dayIndex: number) =>
    workouts.find((w) => w.dayOfWeek === dayIndex + 1);

  const weekEnd = addDays(weekStart, 4); // Friday
  const weekLabel = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;

  return (
    <div className="animate-slide-up">
      <PageHeader title="Gym" description="Mon-Fri workout tracker" />

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setWeekOffset((p) => p - 1)}
          className="p-2 rounded-lg transition-all hover:-translate-y-0.5"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-medium">{weekLabel}</span>
        <button
          onClick={() => setWeekOffset((p) => p + 1)}
          className="p-2 rounded-lg transition-all hover:-translate-y-0.5"
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {DAYS.map((day, idx) => {
          const workout = getWorkoutForDay(idx);
          const dayDate = addDays(weekStart, idx);

          return (
            <div key={day} className="planner-surface p-4 min-h-[180px] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold" style={{ color: "var(--accent-color)" }}>
                    {day}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(dayDate, "MMM d")}
                  </p>
                </div>
                {!workout && (
                  <button
                    onClick={() => {
                      setEditDay(idx);
                      setShowForm(true);
                    }}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <Plus size={14} className="text-muted-foreground" />
                  </button>
                )}
              </div>

              {workout ? (
                <div className="flex-1 space-y-2">
                  {workout.exercises.map((ex, i) => (
                    <div key={i} className="text-xs">
                      <p className="font-medium">{ex.name}</p>
                      <p className="text-muted-foreground">
                        {ex.sets.map((s) => `${s.reps}x${s.weight}kg`).join(", ")}
                      </p>
                    </div>
                  ))}
                  <button
                    onClick={async () => {
                      await fetch(`/api/gym/workouts/${workout._id}`, {
                        method: "DELETE",
                      });
                      toast.success("Workout deleted");
                      setWorkouts((prev) =>
                        prev.filter((w) => w._id !== workout._id)
                      );
                    }}
                    className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 mt-2 p-1.5 min-w-[28px] min-h-[28px]"
                  >
                    <Trash2 size={10} />
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">Rest day</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add workout form */}
      {showForm && editDay !== null && (
        <WorkoutForm
          date={addDays(weekStart, editDay)}
          onClose={() => {
            setShowForm(false);
            setEditDay(null);
          }}
          onSuccess={(workout: Workout) => {
            setWorkouts((prev) => [...prev, workout]);
            setShowForm(false);
            setEditDay(null);
          }}
        />
      )}
    </div>
  );
}

function WorkoutForm({
  date,
  onClose,
  onSuccess,
}: {
  date: Date;
  onClose: () => void;
  onSuccess: (workout: Workout) => void;
}) {
  const [exercises, setExercises] = useState<
    { name: string; sets: { reps: string; weight: string }[] }[]
  >([{ name: "", sets: [{ reps: "", weight: "" }] }]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const addExercise = () => {
    setExercises([...exercises, { name: "", sets: [{ reps: "", weight: "" }] }]);
  };

  const addSet = (exIdx: number) => {
    const updated = [...exercises];
    updated[exIdx].sets.push({ reps: "", weight: "" });
    setExercises(updated);
  };

  const removeExercise = (exIdx: number) => {
    setExercises(exercises.filter((_, i) => i !== exIdx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      date: date.toISOString(),
      note,
      exercises: exercises
        .filter((ex) => ex.name.trim())
        .map((ex) => ({
          name: ex.name,
          sets: ex.sets
            .filter((s) => s.reps && s.weight)
            .map((s) => ({
              reps: Number(s.reps),
              weight: Number(s.weight),
            })),
        })),
    };

    const res = await fetch("/api/gym/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("Workout saved");
      onSuccess(data.workout);
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to save");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-lg rounded-xl p-6 animate-slide-up max-h-[80vh] overflow-y-auto"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {format(date, "EEEE, MMM d")}
          </h3>
          <button onClick={onClose}>
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {exercises.map((ex, exIdx) => (
            <div
              key={exIdx}
              className="p-4 rounded-lg"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Dumbbell size={14} style={{ color: "var(--accent-color)" }} />
                <input
                  type="text"
                  placeholder="Exercise name"
                  value={ex.name}
                  onChange={(e) => {
                    const updated = [...exercises];
                    updated[exIdx].name = e.target.value;
                    setExercises(updated);
                  }}
                  className="flex-1 bg-transparent text-sm font-medium focus:outline-none"
                  style={{ color: "var(--text-primary)" }}
                />
                {exercises.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExercise(exIdx)}
                  >
                    <X size={14} className="text-muted-foreground" />
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {ex.sets.map((set, setIdx) => (
                  <div key={setIdx} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-4">
                      {setIdx + 1}
                    </span>
                    <input
                      type="number"
                      placeholder="Reps"
                      value={set.reps}
                      onChange={(e) => {
                        const updated = [...exercises];
                        updated[exIdx].sets[setIdx].reps = e.target.value;
                        setExercises(updated);
                      }}
                      className="w-20 px-2 py-1.5 rounded text-xs text-center"
                      style={{
                        background: "var(--surface-1)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <span className="text-xs text-muted-foreground">x</span>
                    <input
                      type="number"
                      placeholder="kg"
                      value={set.weight}
                      onChange={(e) => {
                        const updated = [...exercises];
                        updated[exIdx].sets[setIdx].weight = e.target.value;
                        setExercises(updated);
                      }}
                      className="w-20 px-2 py-1.5 rounded text-xs text-center"
                      style={{
                        background: "var(--surface-1)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <span className="text-xs text-muted-foreground">kg</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addSet(exIdx)}
                  className="text-xs text-primary hover:underline"
                >
                  + Add set
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addExercise}
            className="w-full py-2 rounded-lg text-xs font-medium transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            + Add exercise
          </button>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Note (optional)
            </label>
            <input
              type="text"
              placeholder="How was the session?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-muted)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save workout"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

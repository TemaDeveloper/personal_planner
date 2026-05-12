"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Check, ChevronLeft, ChevronRight, Dumbbell } from "lucide-react";
import { startOfWeek, addWeeks, addDays, format, startOfDay } from "date-fns";

interface AttendanceRecord {
  _id: string;
  date: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function GymPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [targetDays, setTargetDays] = useState(5);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), {
    weekStartsOn: 1,
  });

  useEffect(() => {
    setLoading(true);
    fetch(`/api/gym/workouts?weekOf=${weekStart.toISOString()}`)
      .then((r) => r.json())
      .then((d) => {
        setAttendance(d.attendance || []);
        setTargetDays(d.targetDaysPerWeek ?? 5);
        setLoading(false);
      });
  }, [weekOffset]);

  const isAttended = (dayDate: Date) => {
    const dayStr = format(dayDate, "yyyy-MM-dd");
    return attendance.some((a) => format(new Date(a.date), "yyyy-MM-dd") === dayStr);
  };

  const toggleDay = async (dayDate: Date, idx: number) => {
    if (toggling !== null) return;
    setToggling(idx);

    const dateStr = startOfDay(dayDate).toISOString();
    const wasAttended = isAttended(dayDate);

    // Optimistic update
    if (wasAttended) {
      setAttendance((prev) =>
        prev.filter((a) => format(new Date(a.date), "yyyy-MM-dd") !== format(dayDate, "yyyy-MM-dd"))
      );
    } else {
      setAttendance((prev) => [...prev, { _id: "temp", date: dateStr }]);
    }

    try {
      const res = await fetch("/api/gym/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      });

      if (!res.ok) {
        // Revert on failure
        if (wasAttended) {
          setAttendance((prev) => [...prev, { _id: "temp", date: dateStr }]);
        } else {
          setAttendance((prev) =>
            prev.filter((a) => format(new Date(a.date), "yyyy-MM-dd") !== format(dayDate, "yyyy-MM-dd"))
          );
        }
        toast.error("Failed to update");
      }
    } catch {
      toast.error("Network error");
    }

    setToggling(null);
  };

  const attendedCount = attendance.length;
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Gym"
        description={`${attendedCount}/${targetDays} days this week`}
      />

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
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {DAYS.map((day) => (
            <div key={day} className="planner-surface p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {DAYS.map((day, idx) => {
            const dayDate = addDays(weekStart, idx);
            const attended = isAttended(dayDate);
            const isToggling = toggling === idx;

            return (
              <button
                key={day}
                onClick={() => toggleDay(dayDate, idx)}
                disabled={isToggling}
                className="planner-surface p-4 flex flex-col items-center gap-2 transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{
                  background: attended ? "var(--accent-glow)" : undefined,
                  border: attended
                    ? "1px solid var(--accent-color)"
                    : undefined,
                }}
              >
                <p
                  className="text-xs font-semibold"
                  style={{ color: attended ? "var(--accent-color)" : "var(--text-muted)" }}
                >
                  {day.slice(0, 3)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {format(dayDate, "MMM d")}
                </p>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: attended ? "var(--accent-color)" : "var(--surface-2)",
                    border: attended ? "none" : "1px solid var(--border-subtle)",
                  }}
                >
                  {attended ? (
                    <Check size={16} style={{ color: "var(--background)" }} />
                  ) : (
                    <Dumbbell size={14} className="text-muted-foreground" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

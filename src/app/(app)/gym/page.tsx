"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Check, ChevronLeft, ChevronRight, Dumbbell, Download } from "lucide-react";
import {
  startOfMonth, endOfMonth, addMonths, startOfWeek, addDays,
  format, startOfDay, isSameMonth, isToday, isBefore, isAfter,
  getDaysInMonth,
} from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressPie } from "@/components/ui/progress-pie";
import { PageTransition } from "@/components/ui/page-transition";

interface AttendanceRecord {
  _id: string;
  date: string;
}

const DAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function GymPage() {
  const [monthOffset, setMonthOffset] = useState(0);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [targetDays, setTargetDays] = useState(5);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const currentMonth = addMonths(new Date(), monthOffset);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);

  useEffect(() => {
    let cancelled = false;
    const ms = startOfMonth(addMonths(new Date(), monthOffset));
    const me = endOfMonth(ms);
    fetch(`/api/gym/workouts?weekOf=${ms.toISOString()}&monthEnd=${me.toISOString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setAttendance(d.attendance || []);
        setTargetDays(d.targetDaysPerWeek ?? 5);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [monthOffset]);

  const attendedDates = new Set(attendance.map((a) => format(new Date(a.date), "yyyy-MM-dd")));

  const isAttended = (date: Date) => attendedDates.has(format(date, "yyyy-MM-dd"));

  const toggleDay = async (dayDate: Date) => {
    const key = format(dayDate, "yyyy-MM-dd");
    if (toggling) return;
    setToggling(key);

    const dateStr = startOfDay(dayDate).toISOString();
    const wasAttended = isAttended(dayDate);

    // Optimistic update
    if (wasAttended) {
      setAttendance((prev) =>
        prev.filter((a) => format(new Date(a.date), "yyyy-MM-dd") !== key)
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
        if (wasAttended) {
          setAttendance((prev) => [...prev, { _id: "temp", date: dateStr }]);
        } else {
          setAttendance((prev) => prev.filter((a) => format(new Date(a.date), "yyyy-MM-dd") !== key));
        }
        toast.error("Failed to update");
      }
    } catch {
      toast.error("Network error");
    }
    setToggling(null);
  };

  // Build calendar grid: weeks × 7 days
  const calendarWeeks: (Date | null)[][] = [];
  {
    const firstDay = startOfWeek(monthStart, { weekStartsOn: 1 });
    let current = firstDay;
    while (isBefore(current, monthEnd) || calendarWeeks.length === 0) {
      const week: (Date | null)[] = [];
      for (let i = 0; i < 7; i++) {
        const day = addDays(current, i);
        week.push(isSameMonth(day, monthStart) ? day : null);
      }
      calendarWeeks.push(week);
      current = addDays(current, 7);
    }
  }

  const attendedCount = attendedDates.size;
  // Target for the month = targetDays * ~4.3 weeks
  const weeksInMonth = Math.ceil(getDaysInMonth(currentMonth) / 7);
  const monthlyTarget = targetDays * weeksInMonth;

  return (
    <PageTransition>
      <PageHeader
        title="Gym"
        description={`${attendedCount} days this month`}
        action={
          <button
            onClick={() => { window.location.href = "/api/export/gym"; }}
            className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-[var(--text-muted)]"
            aria-label="Export to Excel"
          >
            <Download size={16} />
          </button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6">
          {/* Monthly grid */}
          <Card className="flex-1">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="secondary" size="icon" className="w-7 h-7" aria-label="Previous month" onClick={() => setMonthOffset((p) => p - 1)}>
                <ChevronLeft size={14} />
              </Button>
              <span className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</span>
              <Button variant="secondary" size="icon" className="w-7 h-7" aria-label="Next month" onClick={() => setMonthOffset((p) => p + 1)}>
                <ChevronRight size={14} />
              </Button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_HEADERS.map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider py-1" style={{ color: "var(--text-muted)" }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            {loading ? (
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg animate-pulse" style={{ background: "var(--surface-1)" }} />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {calendarWeeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-1">
                    {week.map((day, di) => {
                      if (!day) {
                        return <div key={di} className="aspect-square" />;
                      }

                      const attended = isAttended(day);
                      const today = isToday(day);
                      const future = isAfter(startOfDay(day), startOfDay(new Date()));
                      const key = format(day, "yyyy-MM-dd");
                      const isDisabled = toggling === key || future;

                      return (
                        <button
                          key={di}
                          onClick={() => !future && toggleDay(day)}
                          disabled={isDisabled}
                          className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all ${future ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:scale-105"} disabled:opacity-30`}
                          style={{
                            background: attended ? "var(--accent-color)" : today ? "var(--surface-2)" : "var(--surface-1)",
                            border: today && !attended ? "1px solid var(--accent-color)" : "1px solid transparent",
                          }}
                          aria-label={`${attended ? "Remove" : "Mark"} gym attendance for ${format(day, "MMM d")}`}
                          aria-pressed={attended}
                        >
                          <span
                            className="text-xs font-semibold"
                            style={{ color: attended ? "var(--primary-foreground)" : "var(--text-primary)" }}
                          >
                            {day.getDate()}
                          </span>
                          {attended && <Check size={10} style={{ color: "var(--primary-foreground)" }} />}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Stats sidebar */}
          <div className="lg:w-56 flex flex-col gap-4">
            <Card className="flex items-center justify-center py-6">
              <ProgressPie
                completed={attendedCount}
                target={monthlyTarget}
                label="monthly"
              />
            </Card>

            <Card>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>This month</span>
                  <span className="text-sm font-bold">{attendedCount} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Target / week</span>
                  <span className="text-sm font-bold">{targetDays} days</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Monthly target</span>
                  <span className="text-sm font-bold">{monthlyTarget} days</span>
                </div>
              </div>
            </Card>

            <Card className="text-center py-4">
              <Dumbbell size={24} className="mx-auto mb-2" style={{ color: "var(--accent-color)" }} />
              <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                Click any day to toggle attendance
              </p>
            </Card>
          </div>
        </div>
    </PageTransition>
  );
}

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
import { StatBlock } from "@/components/ui/stat-block";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/ui/page-transition";
import { attendanceDateKey } from "@/lib/gym-date";

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
    fetch(`/api/gym/workouts?weekOf=${format(ms, "yyyy-MM-dd")}&monthEnd=${format(me, "yyyy-MM-dd")}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setAttendance(d.attendance || []);
        setTargetDays(d.targetDaysPerWeek ?? 5);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [monthOffset]);

  const attendedDates = new Set(attendance.map((a) => attendanceDateKey(a.date)));

  const isAttended = (date: Date) => attendedDates.has(format(date, "yyyy-MM-dd"));

  const toggleDay = async (dayDate: Date) => {
    const key = format(dayDate, "yyyy-MM-dd");
    if (toggling) return;
    setToggling(key);

    // `key` is the calendar day (yyyy-MM-dd) shown in the grid. We send it as-is
    // and store the optimistic record at UTC midnight so reads round-trip without
    // a timezone shift (see src/lib/gym-date.ts).
    const tempDate = `${key}T00:00:00.000Z`;
    const wasAttended = isAttended(dayDate);

    // Optimistic update
    if (wasAttended) {
      setAttendance((prev) =>
        prev.filter((a) => attendanceDateKey(a.date) !== key)
      );
    } else {
      setAttendance((prev) => [...prev, { _id: "temp", date: tempDate }]);
    }

    try {
      const res = await fetch("/api/gym/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: key }),
      });
      if (!res.ok) {
        if (wasAttended) {
          setAttendance((prev) => [...prev, { _id: "temp", date: tempDate }]);
        } else {
          setAttendance((prev) => prev.filter((a) => attendanceDateKey(a.date) !== key));
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

  // Days attended this week (Mon–Sun)
  const todayDate = new Date();
  const weekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
  const weekDaysAttended = Array.from({ length: 7 }, (_, i) =>
    addDays(weekStart, i)
  ).filter((d) => isAttended(d)).length;

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
        {/* Monthly attendance grid */}
        <Card className="flex-1">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <Button
              variant="secondary"
              size="icon"
              className="w-8 h-8"
              aria-label="Previous month"
              onClick={() => setMonthOffset((p) => p - 1)}
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button
              variant="secondary"
              size="icon"
              className="w-8 h-8"
              aria-label="Next month"
              onClick={() => setMonthOffset((p) => p + 1)}
            >
              <ChevronRight size={14} />
            </Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAY_HEADERS.map((d) => (
              <div
                key={d}
                className="stat-label text-center py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar cells */}
          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square" />
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
                        className={[
                          "aspect-square rounded-md flex flex-col items-center justify-center gap-0.5 transition-colors min-h-[44px]",
                          future ? "opacity-30 cursor-not-allowed" : "cursor-pointer hover:border-[var(--accent-color)]",
                          "disabled:opacity-30",
                        ].join(" ")}
                        style={{
                          background: attended
                            ? "var(--accent-color)"
                            : today
                            ? "var(--surface-2)"
                            : "var(--surface-1)",
                          border: today && !attended
                            ? "1px solid var(--accent-color)"
                            : "1px solid var(--border-hairline, var(--border))",
                        }}
                        aria-label={`${attended ? "Remove" : "Mark"} gym attendance for ${format(day, "MMM d")}`}
                        aria-pressed={attended}
                      >
                        <span
                          className="text-xs font-semibold num"
                          style={{
                            color: attended
                              ? "var(--primary-foreground)"
                              : "var(--text-primary)",
                          }}
                        >
                          {day.getDate()}
                        </span>
                        {attended && (
                          <Check size={10} style={{ color: "var(--primary-foreground)" }} />
                        )}
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
          {/* Hero: days this week vs target */}
          <Card>
            <StatBlock
              label="This week"
              value={`${weekDaysAttended} / ${targetDays}`}
              sub={weekDaysAttended >= targetDays ? "Target reached" : `${targetDays - weekDaysAttended} to go`}
              size="hero"
            />
          </Card>

          {/* Supporting stats */}
          <Card>
            <div className="space-y-4">
              <StatBlock
                label="This month"
                value={String(attendedCount)}
                sub="days attended"
                size="lg"
              />
              <div
                className="border-t"
                style={{ borderColor: "var(--border)" }}
              />
              <div className="grid grid-cols-2 gap-3">
                <StatBlock
                  label="Target / week"
                  value={String(targetDays)}
                  size="sm"
                />
                <StatBlock
                  label="Monthly target"
                  value={String(monthlyTarget)}
                  size="sm"
                />
              </div>
            </div>
          </Card>

          {/* Hint */}
          <div className="flex items-start gap-2 px-1">
            <Dumbbell
              size={14}
              className="mt-0.5 shrink-0"
              style={{ color: "var(--accent-color)" }}
            />
            <p className="text-xs text-[var(--text-faint)]">
              Tap any past day to toggle attendance.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}

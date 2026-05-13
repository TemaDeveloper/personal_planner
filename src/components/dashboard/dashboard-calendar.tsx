"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SECTION_META, type SectionId } from "@/lib/constants";
import { ICON_MAP } from "@/lib/icon-map";

interface DashboardCalendarProps {
  enabledSections: SectionId[];
  weekStart: "monday" | "sunday";
}

const SECTION_COLORS: Record<string, string> = {
  work: "var(--chart-1)",
  gym: "var(--chart-2)",
  finances: "var(--chart-3)",
  habits: "var(--chart-5)",
  study: "var(--chart-2)",
  hobbies: "var(--chart-1)",
  housework: "var(--chart-4)",
  health: "var(--chart-5)",
  goals: "var(--chart-4)",
  reading: "var(--chart-2)",
  journal: "var(--chart-3)",
  shopping: "var(--chart-1)",
  mealprep: "var(--chart-4)",
};

export function DashboardCalendar({ weekStart }: DashboardCalendarProps) {
  const [month, setMonth] = useState(new Date());
  const [activity, setActivity] = useState<Record<string, string[]>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    const monthStr = format(month, "yyyy-MM");
    fetch(`/api/dashboard/activity?month=${monthStr}`)
      .then((r) => r.json())
      .then((d) => setActivity(d.activity || {}));
  }, [month]);

  const activeDays = Object.keys(activity).map((d) => new Date(d + "T00:00:00"));

  return (
    <Card padding="lg" className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold">Activity Calendar</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setMonth(subMonths(month, 1))}
            className="w-7 h-7"
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="text-xs font-medium w-28 text-center">
            {format(month, "MMMM yyyy")}
          </span>
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setMonth(addMonths(month, 1))}
            className="w-7 h-7"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      <DayPicker
        mode="single"
        month={month}
        onMonthChange={setMonth}
        weekStartsOn={weekStart === "sunday" ? 0 : 1}
        hideNavigation
        selected={selectedDay ? new Date(selectedDay + "T00:00:00") : undefined}
        onSelect={(day) => {
          if (day) {
            const key = format(day, "yyyy-MM-dd");
            setSelectedDay(selectedDay === key ? null : key);
          }
        }}
        modifiers={{ active: activeDays }}
        modifiersStyles={{
          active: { fontWeight: 700 },
        }}
        components={{
          DayButton: ({ day, ...props }) => {
            const key = format(day.date, "yyyy-MM-dd");
            const sections = activity[key] || [];
            const isSelected = selectedDay === key;

            return (
              <button
                {...props}
                className="relative w-full aspect-square flex flex-col items-center justify-center rounded-lg transition-all text-xs"
                style={{
                  background: isSelected
                    ? "var(--accent-glow)"
                    : sections.length > 0
                    ? "var(--surface-1)"
                    : "transparent",
                  border: isSelected
                    ? "1px solid var(--accent-color)"
                    : "1px solid transparent",
                  color: sections.length > 0
                    ? "var(--text-primary)"
                    : "var(--text-muted)",
                }}
              >
                <span>{day.date.getDate()}</span>
                {sections.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {sections.slice(0, 4).map((s) => (
                      <div
                        key={s}
                        className="w-1 h-1 rounded-full"
                        style={{ background: SECTION_COLORS[s] || "var(--accent-color)" }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          },
        }}
        classNames={{
          root: "w-full",
          month_grid: "w-full",
          weekdays: "flex",
          weekday: "flex-1 text-center text-[10px] font-medium text-[var(--text-muted)] pb-2",
          week: "flex",
          day: "flex-1 p-0.5",
          outside: "opacity-30",
        }}
      />

      {selectedDay && activity[selectedDay] && (
        <div className="mt-4 p-3 rounded-lg surface-inset space-y-2">
          <p className="text-xs font-medium text-[var(--accent-color)]">
            {format(new Date(selectedDay + "T00:00:00"), "EEEE, MMM d")}
          </p>
          <div className="flex flex-wrap gap-2">
            {activity[selectedDay].map((sectionId) => {
              const meta = SECTION_META[sectionId as SectionId];
              const Icon = meta ? ICON_MAP[meta.icon] : ICON_MAP.Star;
              const label = meta ? meta.label : sectionId;

              return (
                <div
                  key={sectionId}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs surface-inset"
                >
                  {Icon && <Icon size={12} style={{ color: SECTION_COLORS[sectionId] || "var(--accent-color)" }} />}
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

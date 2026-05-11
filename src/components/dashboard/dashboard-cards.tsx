"use client";

import {
  Briefcase, Dumbbell, TrendingUp, GraduationCap,
  Palette, Home, Heart, Target, BookOpen, NotebookPen, ShoppingCart, UtensilsCrossed,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { SectionId } from "@/lib/constants";

const GRID_COLS: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

interface WorkSummary {
  name: string;
  weekHours: number;
  todayHours: number;
  monthHours: number;
  weeklyTarget: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
  hourlyRate: number;
}

interface DashboardCardsProps {
  workSummaries: WorkSummary[];
  gymDaysThisWeek: number;
  studyMinutesThisWeek: number;
  hobbyMinutesThisWeek: number;
  houseworkDone: number;
  houseworkTotal: number;
  avgSleep: number;
  activeGoalCount: number;
  readingCount: number;
  journalCount: number;
  pendingItems: number;
  mealsPlanned: number;
  enabledSections: SectionId[];
  currency: string;
}

export function DashboardCards({
  workSummaries,
  gymDaysThisWeek,
  studyMinutesThisWeek,
  hobbyMinutesThisWeek,
  houseworkDone,
  houseworkTotal,
  avgSleep,
  activeGoalCount,
  readingCount,
  journalCount,
  pendingItems,
  mealsPlanned,
  enabledSections,
  currency,
}: DashboardCardsProps) {
  const has = (s: SectionId) => enabledSections.includes(s);

  const totalWeekEarnings = workSummaries.reduce(
    (sum, w) => sum + w.weekEarnings,
    0
  );
  const totalMonthEarnings = workSummaries.reduce(
    (sum, w) => sum + w.monthEarnings,
    0
  );

  const studyHours = Math.round(studyMinutesThisWeek / 60 * 10) / 10;
  const hobbyHours = Math.round(hobbyMinutesThisWeek / 60 * 10) / 10;

  const statCards = [];
  if (has("work")) {
    statCards.push(
      <StatCard key="week-earn" label="This week" value={formatCurrency(totalWeekEarnings, currency)} icon={<TrendingUp size={16} />} />,
      <StatCard key="month-earn" label="This month" value={formatCurrency(totalMonthEarnings, currency)} icon={<TrendingUp size={16} />} />,
      <StatCard key="jobs" label="Active jobs" value={String(workSummaries.length)} icon={<Briefcase size={16} />} />,
    );
  }
  if (has("gym")) {
    statCards.push(
      <StatCard key="gym" label="Gym this week" value={`${gymDaysThisWeek}/5`} icon={<Dumbbell size={16} />} />,
    );
  }
  if (has("study")) {
    statCards.push(
      <StatCard key="study" label="Study this week" value={`${studyHours}h`} icon={<GraduationCap size={16} />} />,
    );
  }
  if (has("hobbies")) {
    statCards.push(
      <StatCard key="hobbies" label="Hobby hours" value={`${hobbyHours}h`} icon={<Palette size={16} />} />,
    );
  }
  if (has("housework")) {
    statCards.push(
      <StatCard key="housework" label="Tasks today" value={houseworkTotal > 0 ? `${houseworkDone}/${houseworkTotal}` : "—"} icon={<Home size={16} />} />,
    );
  }
  if (has("health")) {
    statCards.push(
      <StatCard key="health" label="Avg sleep" value={avgSleep > 0 ? `${avgSleep.toFixed(1)}h` : "—"} icon={<Heart size={16} />} />,
    );
  }
  if (has("goals")) {
    statCards.push(
      <StatCard key="goals" label="Active goals" value={String(activeGoalCount)} icon={<Target size={16} />} />,
    );
  }
  if (has("reading")) {
    statCards.push(
      <StatCard key="reading" label="Reading now" value={String(readingCount)} icon={<BookOpen size={16} />} />,
    );
  }
  if (has("journal")) {
    statCards.push(
      <StatCard key="journal" label="Entries this month" value={String(journalCount)} icon={<NotebookPen size={16} />} />,
    );
  }
  if (has("shopping")) {
    statCards.push(
      <StatCard key="shopping" label="Items pending" value={String(pendingItems)} icon={<ShoppingCart size={16} />} />,
    );
  }
  if (has("mealprep")) {
    statCards.push(
      <StatCard key="mealprep" label="Meals this week" value={String(mealsPlanned)} icon={<UtensilsCrossed size={16} />} />,
    );
  }

  return (
    <div className="space-y-6">
      {/* Top stats row */}
      {statCards.length > 0 && (
        <div className={`grid grid-cols-2 ${GRID_COLS[Math.min(statCards.length, 4)] || "md:grid-cols-4"} gap-4`}>
          {statCards}
        </div>
      )}

      {/* Work summaries */}
      {has("work") && workSummaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workSummaries.map((work) => (
            <WorkCard key={work.name} work={work} currency={currency} />
          ))}
        </div>
      )}

      {has("work") && workSummaries.length === 0 && (
        <div className="planner-surface p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No jobs configured yet. Head to{" "}
            <a href="/settings" className="text-primary hover:underline">
              Settings
            </a>{" "}
            to add your work.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="planner-surface p-4">
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: "var(--accent-color)" }}>{icon}</span>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value text-xl md:text-2xl">{value}</div>
    </div>
  );
}

function WorkCard({
  work,
  currency,
}: {
  work: WorkSummary;
  currency: string;
}) {
  const progress = work.weeklyTarget > 0
    ? Math.min((work.weekHours / work.weeklyTarget) * 100, 100)
    : 0;

  return (
    <div className="planner-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">{work.name}</h3>
        <span className="text-xs text-muted-foreground">
          {work.hourlyRate > 0
            ? `${formatCurrency(work.hourlyRate, currency)}/hr`
            : "No rate set"}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Weekly hours</span>
          <span style={{ color: "var(--text-primary)" }}>
            {work.weekHours.toFixed(1)}h / {work.weeklyTarget}h
          </span>
        </div>
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: "var(--surface-2)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: "var(--accent-color)",
            }}
          />
        </div>
      </div>

      {/* Earnings grid */}
      {work.hourlyRate > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="stat-label">Today</p>
            <p className="text-sm font-semibold mt-0.5">
              {formatCurrency(work.todayEarnings, currency)}
            </p>
          </div>
          <div>
            <p className="stat-label">Week</p>
            <p className="text-sm font-semibold mt-0.5">
              {formatCurrency(work.weekEarnings, currency)}
            </p>
          </div>
          <div>
            <p className="stat-label">Month</p>
            <p className="text-sm font-semibold mt-0.5">
              {formatCurrency(work.monthEarnings, currency)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

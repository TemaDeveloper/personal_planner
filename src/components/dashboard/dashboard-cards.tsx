"use client";

import Link from "next/link";
import {
  Briefcase, Dumbbell, TrendingUp, GraduationCap,
  Palette, Home, Heart, Target, BookOpen, NotebookPen,
  ShoppingCart, UtensilsCrossed, ChevronRight, Plus,
  Flame, DollarSign,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatBlock } from "@/components/ui/stat-block";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/utils";
import type { SectionId } from "@/lib/constants";
import { SECTION_META } from "@/lib/constants";

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
  gymTargetDays: number;
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

// Quick-log chips: section → label
const QUICK_LOG_CHIPS: { section: SectionId; label: string; icon: React.ReactNode }[] = [
  { section: "work",     label: "Log work",    icon: <Briefcase size={13} /> },
  { section: "gym",      label: "Gym",         icon: <Dumbbell size={13} /> },
  { section: "habits",   label: "Habits",      icon: <Flame size={13} /> },
  { section: "finances", label: "Expense",     icon: <DollarSign size={13} /> },
  { section: "study",    label: "Study",       icon: <GraduationCap size={13} /> },
  { section: "hobbies",  label: "Hobby",       icon: <Palette size={13} /> },
  { section: "health",   label: "Health",      icon: <Heart size={13} /> },
  { section: "journal",  label: "Journal",     icon: <NotebookPen size={13} /> },
  { section: "shopping", label: "Shopping",    icon: <ShoppingCart size={13} /> },
  { section: "mealprep", label: "Meal",        icon: <UtensilsCrossed size={13} /> },
  { section: "housework",label: "Chores",      icon: <Home size={13} /> },
  { section: "goals",    label: "Goals",       icon: <Target size={13} /> },
  { section: "reading",  label: "Reading",     icon: <BookOpen size={13} /> },
];

export function DashboardCards({
  workSummaries,
  gymDaysThisWeek,
  gymTargetDays,
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

  const totalWeekEarnings = workSummaries.reduce((sum, w) => sum + w.weekEarnings, 0);
  const totalMonthEarnings = workSummaries.reduce((sum, w) => sum + w.monthEarnings, 0);

  const studyHours = Math.round((studyMinutesThisWeek / 60) * 10) / 10;
  const hobbyHours = Math.round((hobbyMinutesThisWeek / 60) * 10) / 10;

  // Determine HERO metric: prefer week earnings if work enabled, else gym, else null
  const heroValue = has("work") && workSummaries.length > 0
    ? formatCurrency(totalWeekEarnings, currency)
    : has("gym")
    ? `${gymDaysThisWeek}/${gymTargetDays}`
    : null;

  const heroLabel = has("work") && workSummaries.length > 0
    ? "This week's earnings"
    : has("gym")
    ? "Gym days this week"
    : null;

  const heroSub = has("work") && workSummaries.length > 0
    ? `${formatCurrency(totalMonthEarnings, currency)} this month · ${workSummaries.length} active job${workSummaries.length !== 1 ? "s" : ""}`
    : has("gym")
    ? `Target: ${gymTargetDays} days`
    : null;

  // Quick-log chips (only enabled sections)
  const visibleChips = QUICK_LOG_CHIPS.filter((c) => has(c.section));

  // Life-area glance rows
  interface GlanceItem {
    key: string;
    icon: React.ReactNode;
    label: string;
    value: string;
    href: string;
  }
  const glanceItems: GlanceItem[] = [];

  if (has("work") && workSummaries.length > 0) {
    const totalWeekHours = workSummaries.reduce((s, w) => s + w.weekHours, 0);
    glanceItems.push({
      key: "work",
      icon: <TrendingUp size={15} />,
      label: "Earnings",
      value: `${formatCurrency(totalWeekEarnings, currency)} · ${totalWeekHours.toFixed(1)}h logged`,
      href: SECTION_META.work.href,
    });
  }
  if (has("gym")) {
    glanceItems.push({
      key: "gym",
      icon: <Dumbbell size={15} />,
      label: "Gym",
      value: `${gymDaysThisWeek} of ${gymTargetDays} days`,
      href: SECTION_META.gym.href,
    });
  }
  if (has("study")) {
    glanceItems.push({
      key: "study",
      icon: <GraduationCap size={15} />,
      label: "Study",
      value: `${studyHours}h this week`,
      href: SECTION_META.study.href,
    });
  }
  if (has("hobbies")) {
    glanceItems.push({
      key: "hobbies",
      icon: <Palette size={15} />,
      label: "Hobbies",
      value: `${hobbyHours}h this week`,
      href: SECTION_META.hobbies.href,
    });
  }
  if (has("housework")) {
    glanceItems.push({
      key: "housework",
      icon: <Home size={15} />,
      label: "Chores",
      value: houseworkTotal > 0 ? `${houseworkDone} of ${houseworkTotal} done today` : "No tasks today",
      href: SECTION_META.housework.href,
    });
  }
  if (has("health")) {
    glanceItems.push({
      key: "health",
      icon: <Heart size={15} />,
      label: "Sleep",
      value: avgSleep > 0 ? `${avgSleep.toFixed(1)}h avg this week` : "No data logged",
      href: SECTION_META.health.href,
    });
  }
  if (has("goals")) {
    glanceItems.push({
      key: "goals",
      icon: <Target size={15} />,
      label: "Goals",
      value: `${activeGoalCount} active`,
      href: SECTION_META.goals.href,
    });
  }
  if (has("reading")) {
    glanceItems.push({
      key: "reading",
      icon: <BookOpen size={15} />,
      label: "Reading",
      value: `${readingCount} book${readingCount !== 1 ? "s" : ""} in progress`,
      href: SECTION_META.reading.href,
    });
  }
  if (has("journal")) {
    glanceItems.push({
      key: "journal",
      icon: <NotebookPen size={15} />,
      label: "Journal",
      value: `${journalCount} entr${journalCount !== 1 ? "ies" : "y"} this month`,
      href: SECTION_META.journal.href,
    });
  }
  if (has("shopping")) {
    glanceItems.push({
      key: "shopping",
      icon: <ShoppingCart size={15} />,
      label: "Shopping",
      value: `${pendingItems} item${pendingItems !== 1 ? "s" : ""} pending`,
      href: SECTION_META.shopping.href,
    });
  }
  if (has("mealprep")) {
    glanceItems.push({
      key: "mealprep",
      icon: <UtensilsCrossed size={15} />,
      label: "Meals",
      value: `${mealsPlanned} meal${mealsPlanned !== 1 ? "s" : ""} planned this week`,
      href: SECTION_META.mealprep.href,
    });
  }

  const hasAnySections = enabledSections.length > 0;

  return (
    <div className="space-y-6">
      {/* HERO metric */}
      {heroValue && heroLabel && (
        <Card padding="lg">
          <StatBlock
            label={heroLabel}
            value={heroValue}
            sub={heroSub ?? undefined}
            size="hero"
          />
        </Card>
      )}

      {/* Quick-log chip row */}
      {visibleChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {visibleChips.map((chip) => (
            <Link
              key={chip.section}
              href={SECTION_META[chip.section].href}
              className={[
                "inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-medium",
                "border border-[var(--border-subtle)] bg-[var(--surface-1)]",
                "text-[var(--text-primary)] hover:border-[var(--accent-color)]",
                "hover:text-[var(--accent-text)] transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "active:scale-[0.97]",
              ].join(" ")}
            >
              <span style={{ color: "var(--accent-color)" }}>{chip.icon}</span>
              <Plus size={11} />
              {chip.label}
            </Link>
          ))}
        </div>
      )}

      {/* This week at a glance */}
      {glanceItems.length > 0 && (
        <Card padding="none">
          <div className="px-4 pt-4 pb-2">
            <h2 className="stat-label">This week at a glance</h2>
          </div>
          <ul className="divide-y divide-[var(--border-subtle)]">
            {glanceItems.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={[
                    "flex items-center gap-3 px-4 py-3",
                    "hover:bg-[var(--surface-1)] transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-ring",
                    "group",
                  ].join(" ")}
                >
                  <span className="shrink-0" style={{ color: "var(--accent-color)" }}>
                    {item.icon}
                  </span>
                  <span className="text-sm font-medium text-[var(--text-primary)] w-20 shrink-0">
                    {item.label}
                  </span>
                  <span className="text-sm text-[var(--text-muted)] num flex-1 min-w-0 truncate">
                    {item.value}
                  </span>
                  <ChevronRight
                    size={15}
                    className="shrink-0 text-[var(--text-faint)] group-hover:text-[var(--text-muted)] transition-colors duration-150"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Per-job work cards */}
      {has("work") && workSummaries.length > 0 && (
        <div>
          <h2 className="stat-label mb-3">Jobs</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {workSummaries.map((work) => (
              <WorkCard key={work.name} work={work} currency={currency} />
            ))}
          </div>
        </div>
      )}

      {has("work") && workSummaries.length === 0 && (
        <Card padding="lg">
          <EmptyState
            icon={Briefcase}
            title="No jobs configured"
            description="Add your jobs in Settings to start tracking earnings."
          />
        </Card>
      )}

      {!hasAnySections && (
        <Card padding="lg">
          <EmptyState
            icon={Target}
            title="No sections enabled"
            description="Enable sections from Settings to see your dashboard stats."
          />
        </Card>
      )}
    </div>
  );
}

function WorkCard({ work, currency }: { work: WorkSummary; currency: string }) {
  const progress =
    work.weeklyTarget > 0
      ? Math.min((work.weekHours / work.weeklyTarget) * 100, 100)
      : 0;

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="text-sm font-semibold truncate text-[var(--text-primary)]">{work.name}</h3>
        <span className="text-xs text-[var(--text-muted)] shrink-0">
          {work.hourlyRate > 0
            ? `${formatCurrency(work.hourlyRate, currency)}/hr`
            : "No rate set"}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-[var(--text-muted)]">Weekly hours</span>
          <span className="text-[var(--text-primary)] num">
            {work.weekHours.toFixed(1)}h / {work.weeklyTarget}h
          </span>
        </div>
        <Progress value={progress} size="md" />
      </div>

      {work.hourlyRate > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatBlock label="Today" value={formatCurrency(work.todayEarnings, currency)} size="sm" />
          <StatBlock label="Week" value={formatCurrency(work.weekEarnings, currency)} size="sm" />
          <StatBlock label="Month" value={formatCurrency(work.monthEarnings, currency)} size="sm" />
        </div>
      )}
    </Card>
  );
}

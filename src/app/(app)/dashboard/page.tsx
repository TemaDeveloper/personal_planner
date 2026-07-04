import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import WorkSession from "@/lib/models/work-session";
import GymAttendance from "@/lib/models/gym-attendance";
import StudySession from "@/lib/models/study-session";
import HobbySession from "@/lib/models/hobby-session";
import HouseworkLog from "@/lib/models/housework-log";
import HealthLog from "@/lib/models/health-log";
import Goal from "@/lib/models/goal";
import Book from "@/lib/models/book";
import JournalEntry from "@/lib/models/journal-entry";
import ShoppingList from "@/lib/models/shopping-list";
import MealPlan from "@/lib/models/meal-plan";
import { startOfWeek, endOfWeek, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { DashboardBoards } from "@/components/dashboard/dashboard-boards";
import { builtinSectionEntries, num, type BuiltinEntry } from "@/lib/dashboard-data";
import { DEFAULT_CURRENCY, DEFAULT_ENABLED_SECTIONS, type SectionId } from "@/lib/constants";

export default async function DashboardPage() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return null;

  await connectDB();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const user = await User.findById(userId).lean();
  if (!user) return null;

  const enabledSections = (user.enabledSections as SectionId[] | undefined) ?? [...DEFAULT_ENABLED_SECTIONS];
  const has = (s: SectionId) => enabledSections.includes(s);

  const jobs = user.workConfig?.jobs || [];
  const currency = user.preferences?.currency || DEFAULT_CURRENCY;

  const inRange = (d: Date, s: Date, e: Date) => {
    const t = new Date(d).getTime();
    return t >= s.getTime() && t <= e.getTime();
  };
  const dayKey = (d: Date) => new Date(d).toISOString().slice(0, 10);

  // Every glance stat reads the unified CustomEntry store (what /sections write),
  // falling back to the legacy collection only when a section has no unified rows
  // yet (pre-migration data). Each block resolves the numbers the cards expect.

  // ── Work: normalize to { date, job, hours } from either store ──────────────
  type WorkRow = { date: Date; job: string; hours: number };
  let workRows: WorkRow[] = [];
  if (has("work")) {
    const entries = await builtinSectionEntries(userId, "work", [monthStart, monthEnd]);
    if (entries && entries.length > 0) {
      workRows = entries.map((e) => ({
        date: e.date,
        job: String(e.data?.job ?? ""),
        hours: num(e.data?.hours),
      }));
    } else {
      const sessions = await WorkSession.find({ userId, date: { $gte: monthStart, $lte: monthEnd } }).lean();
      workRows = sessions.map((s: { date: Date; jobName: string; hours: number }) => ({
        date: s.date,
        job: s.jobName,
        hours: s.hours,
      }));
    }
  }
  const workSummaries = has("work")
    ? jobs.filter((j: { active: boolean }) => j.active).map((job: { name: string; hourlyRate: number; weeklyTarget: number }) => {
        const forJob = workRows.filter((r) => r.job === job.name);
        const sumHours = (s: Date, e: Date) =>
          forJob.filter((r) => inRange(r.date, s, e)).reduce((sum, r) => sum + r.hours, 0);
        const weekHours = sumHours(weekStart, weekEnd);
        const todayHours = sumHours(todayStart, todayEnd);
        const monthHours = sumHours(monthStart, monthEnd);
        return {
          name: job.name,
          weekHours,
          todayHours,
          monthHours,
          weeklyTarget: job.weeklyTarget,
          todayEarnings: todayHours * job.hourlyRate,
          weekEarnings: weekHours * job.hourlyRate,
          monthEarnings: monthHours * job.hourlyRate,
          hourlyRate: job.hourlyRate,
        };
      })
    : [];

  // ── Gym: distinct attended days this week ──────────────────────────────────
  let gymDaysThisWeek = 0;
  if (has("gym")) {
    const entries = await builtinSectionEntries(userId, "gym", [weekStart, weekEnd]);
    if (entries) {
      gymDaysThisWeek = new Set(
        entries.filter((e) => e.data?.attended !== false).map((e) => dayKey(e.date))
      ).size;
    } else {
      gymDaysThisWeek = await GymAttendance.countDocuments({ userId, date: { $gte: weekStart, $lte: weekEnd } });
    }
  }
  const gymTargetDays = user.gymConfig?.targetDaysPerWeek ?? 3;

  // ── Study / Hobbies: minutes this week ─────────────────────────────────────
  const sumMinutes = async (slug: string, legacy: () => Promise<number>): Promise<number> => {
    const entries = await builtinSectionEntries(userId, slug, [weekStart, weekEnd]);
    if (entries && entries.length > 0) return entries.reduce((s, e) => s + num(e.data?.minutes), 0);
    if (entries && entries.length === 0) return 0;
    return legacy();
  };
  const studyMinutesThisWeek = has("study")
    ? await sumMinutes("study", async () =>
        (await StudySession.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).lean())
          .reduce((s: number, x: { minutes: number }) => s + x.minutes, 0))
    : 0;
  const hobbyMinutesThisWeek = has("hobbies")
    ? await sumMinutes("hobbies", async () =>
        (await HobbySession.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).lean())
          .reduce((s: number, x: { minutes: number }) => s + x.minutes, 0))
    : 0;

  // ── Housework: done / total today ──────────────────────────────────────────
  let houseworkDone = 0, houseworkTotal = 0;
  if (has("housework")) {
    const entries = await builtinSectionEntries(userId, "housework", [todayStart, todayEnd]);
    if (entries) {
      houseworkTotal = entries.length;
      houseworkDone = entries.filter((e) => e.data?.done === true).length;
    } else {
      const legacy = await HouseworkLog.find({ userId, date: { $gte: todayStart, $lte: todayEnd } }).lean();
      houseworkTotal = legacy.length;
      houseworkDone = (legacy as { completed: boolean }[]).filter((h) => h.completed).length;
    }
  }

  // ── Health: avg sleep this week ────────────────────────────────────────────
  let avgSleep = 0;
  if (has("health")) {
    const entries = await builtinSectionEntries(userId, "health", [weekStart, weekEnd]);
    const sleeps: number[] = entries
      ? entries.map((e) => Number(e.data?.sleep_hours)).filter((v) => Number.isFinite(v))
      : (await HealthLog.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).lean())
          .map((l: { sleepHours: number }) => l.sleepHours);
    avgSleep = sleeps.length > 0 ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : 0;
  }

  // ── Goals / Reading: active/in-progress counts (not date-bound) ────────────
  const countBy = async (
    slug: string,
    match: (e: BuiltinEntry) => boolean,
    legacy: () => Promise<number>
  ): Promise<number> => {
    const entries = await builtinSectionEntries(userId, slug);
    if (entries) return entries.filter(match).length;
    return legacy();
  };
  const activeGoalCount = has("goals")
    ? await countBy("goals", (e) => (e.data?.status ?? "active") === "active",
        async () => Goal.countDocuments({ userId, status: "active" }))
    : 0;
  const readingCount = has("reading")
    ? await countBy("reading", (e) => e.data?.status === "reading",
        async () => Book.countDocuments({ userId, status: "reading" }))
    : 0;

  // ── Journal: entries this month ────────────────────────────────────────────
  let journalCount = 0;
  if (has("journal")) {
    const entries = await builtinSectionEntries(userId, "journal", [monthStart, monthEnd]);
    journalCount = entries
      ? entries.length
      : await JournalEntry.countDocuments({ userId, date: { $gte: monthStart, $lte: monthEnd } });
  }

  // ── Shopping: pending (unbought) items ─────────────────────────────────────
  let pendingItems = 0;
  if (has("shopping")) {
    const entries = await builtinSectionEntries(userId, "shopping");
    if (entries) {
      pendingItems = entries.filter((e) => e.data?.bought !== true).length;
    } else {
      const lists = await ShoppingList.find({ userId, archived: false }).lean();
      pendingItems = (lists as { items: { checked: boolean }[] }[]).reduce(
        (sum, list) => sum + list.items.filter((i) => !i.checked).length, 0
      );
    }
  }

  // ── Meal prep: meals planned this week ─────────────────────────────────────
  let mealsPlanned = 0;
  if (has("mealprep")) {
    const entries = await builtinSectionEntries(userId, "mealprep", [weekStart, weekEnd]);
    if (entries) {
      mealsPlanned = entries.length;
    } else {
      const plans = await MealPlan.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).lean();
      mealsPlanned = plans.reduce((sum: number, p: { meals: unknown[] }) => sum + (p.meals?.length || 0), 0);
    }
  }

  const greeting = getGreeting();
  const userName = user.name || "there";

  return (
    <div className="animate-slide-up">
      <PageHeader
        title={`${greeting}, ${userName}`}
        description={formatDate(now)}
      />
      <DashboardCalendar
        enabledSections={enabledSections}
        weekStart={(user.preferences?.weekStart as "monday" | "sunday") || "monday"}
      />
      <DashboardMetrics />
      <DashboardCards
        workSummaries={workSummaries}
        gymDaysThisWeek={gymDaysThisWeek}
        gymTargetDays={gymTargetDays}
        studyMinutesThisWeek={studyMinutesThisWeek}
        hobbyMinutesThisWeek={hobbyMinutesThisWeek}
        houseworkDone={houseworkDone}
        houseworkTotal={houseworkTotal}
        avgSleep={avgSleep}
        activeGoalCount={activeGoalCount}
        readingCount={readingCount}
        journalCount={journalCount}
        pendingItems={pendingItems}
        mealsPlanned={mealsPlanned}
        enabledSections={enabledSections}
        currency={currency}
      />
      <DashboardBoards />
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

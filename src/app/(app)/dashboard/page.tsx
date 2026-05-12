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
import { DEFAULT_ENABLED_SECTIONS, type SectionId } from "@/lib/constants";

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

  const [
    weekSessions, todaySessions, monthSessions,
    weekWorkouts, weekStudySessions,
    weekHobbySessions, todayHousework, weekHealthLogs,
    activeGoals, readingBooks, monthJournalEntries,
    shoppingLists, weekMealPlans,
  ] = await Promise.all([
    has("work") ? WorkSession.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).lean() : Promise.resolve([]),
    has("work") ? WorkSession.find({ userId, date: { $gte: todayStart, $lte: todayEnd } }).lean() : Promise.resolve([]),
    has("work") ? WorkSession.find({ userId, date: { $gte: monthStart, $lte: monthEnd } }).lean() : Promise.resolve([]),
    has("gym") ? GymAttendance.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).lean() : Promise.resolve([]),
    has("study") ? StudySession.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).lean() : Promise.resolve([]),
    has("hobbies") ? HobbySession.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).lean() : Promise.resolve([]),
    has("housework") ? HouseworkLog.find({ userId, date: { $gte: todayStart, $lte: todayEnd } }).lean() : Promise.resolve([]),
    has("health") ? HealthLog.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).lean() : Promise.resolve([]),
    has("goals") ? Goal.find({ userId, status: "active" }).lean() : Promise.resolve([]),
    has("reading") ? Book.find({ userId, status: "reading" }).lean() : Promise.resolve([]),
    has("journal") ? JournalEntry.find({ userId, date: { $gte: monthStart, $lte: monthEnd } }).lean() : Promise.resolve([]),
    has("shopping") ? ShoppingList.find({ userId, archived: false }).lean() : Promise.resolve([]),
    has("mealprep") ? MealPlan.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).lean() : Promise.resolve([]),
  ]);

  const jobs = user.workConfig?.jobs || [];
  const currency = user.preferences?.currency || "CAD";

  // Calculate work summaries per job
  const workSummaries = has("work")
    ? jobs.filter((j: { active: boolean }) => j.active).map((job: { name: string; hourlyRate: number; weeklyTarget: number }) => {
        const jobWeekSessions = weekSessions.filter((s: { jobName: string }) => s.jobName === job.name);
        const jobTodaySessions = todaySessions.filter((s: { jobName: string }) => s.jobName === job.name);
        const jobMonthSessions = monthSessions.filter((s: { jobName: string }) => s.jobName === job.name);

        const weekHours = jobWeekSessions.reduce((sum: number, s: { hours: number }) => sum + s.hours, 0);
        const todayHours = jobTodaySessions.reduce((sum: number, s: { hours: number }) => sum + s.hours, 0);
        const monthHours = jobMonthSessions.reduce((sum: number, s: { hours: number }) => sum + s.hours, 0);

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

  const gymDaysThisWeek = weekWorkouts.length;
  const gymTargetDays = user.gymConfig?.targetDaysPerWeek ?? 5;
  const studyMinutesThisWeek = weekStudySessions.reduce(
    (sum: number, s: { minutes: number }) => sum + s.minutes,
    0
  );
  const hobbyMinutesThisWeek = weekHobbySessions.reduce(
    (sum: number, s: { minutes: number }) => sum + s.minutes,
    0
  );
  const houseworkToday = todayHousework as { completed: boolean }[];
  const houseworkDone = houseworkToday.filter((h) => h.completed).length;
  const houseworkTotal = houseworkToday.length;
  const avgSleep = weekHealthLogs.length > 0
    ? (weekHealthLogs.reduce((s: number, l: { sleepHours: number }) => s + l.sleepHours, 0) / weekHealthLogs.length)
    : 0;
  const activeGoalCount = activeGoals.length;
  const readingCount = readingBooks.length;
  const journalCount = monthJournalEntries.length;
  const pendingItems = (shoppingLists as { items: { checked: boolean }[] }[]).reduce(
    (sum, list) => sum + list.items.filter((i) => !i.checked).length,
    0
  );
  const mealsPlanned = weekMealPlans.reduce(
    (sum: number, p: { meals: unknown[] }) => sum + (p.meals?.length || 0),
    0
  );

  const greeting = getGreeting();
  const userName = user.name || "there";

  return (
    <div className="animate-slide-up">
      <PageHeader
        title={`${greeting}, ${userName}`}
        description={formatDate(now)}
      />
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

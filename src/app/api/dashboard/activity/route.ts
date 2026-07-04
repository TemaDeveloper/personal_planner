import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import GymAttendance from "@/lib/models/gym-attendance";
import WorkSession from "@/lib/models/work-session";
import { Habit, HabitLog } from "@/lib/models/habit";
import StudySession from "@/lib/models/study-session";
import HobbySession from "@/lib/models/hobby-session";
import HouseworkLog from "@/lib/models/housework-log";
import HealthLog from "@/lib/models/health-log";
import Goal from "@/lib/models/goal";
import JournalEntry from "@/lib/models/journal-entry";
import MealPlan from "@/lib/models/meal-plan";
import Expense from "@/lib/models/expense";
import CustomEntry from "@/lib/models/custom-entry";
import SectionTemplate from "@/lib/models/section-template";
import { format } from "date-fns";
import { DEFAULT_ENABLED_SECTIONS, SECTIONS, type SectionId } from "@/lib/constants";

// Build a UTC month range from a "yyyy-MM" param (or the current month), so the
// window doesn't shift a day/month on a non-UTC server.
function utcMonthRange(monthParam: string | null): [Date, Date] {
  const now = new Date();
  let year: number, month: number; // month is 0-indexed
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split("-").map(Number);
    year = y;
    month = m - 1;
  } else {
    year = now.getUTCFullYear();
    month = now.getUTCMonth();
  }
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  return [start, end];
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const [start, end] = utcMonthRange(searchParams.get("month"));

  const user = await User.findById(userId).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const enabled = (user.enabledSections as SectionId[] | undefined) ?? [...DEFAULT_ENABLED_SECTIONS];
  const has = (s: SectionId) => enabled.includes(s);
  const dateFilter = { $gte: start, $lte: end };

  const activity: Record<string, string[]> = {};
  const addDate = (d: Date, sectionId: string) => {
    const key = format(new Date(d), "yyyy-MM-dd");
    if (!activity[key]) activity[key] = [];
    if (!activity[key].includes(sectionId)) activity[key].push(sectionId);
  };
  const addDates = (dates: Date[], sectionId: string) => dates.forEach((d) => addDate(d, sectionId));

  // ── Resolve every enabled section (built-in + custom) to a templateId ──────
  const enabledBuiltinSlugs = (SECTIONS as readonly SectionId[]).filter(has);
  const customSecs = (user.customSections || []) as { templateId: { toString(): string }; enabled: boolean }[];
  const enabledCustomIds = customSecs.filter((cs) => cs.enabled).map((cs) => cs.templateId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const templates = await SectionTemplate.find({
    $or: [
      { slug: { $in: enabledBuiltinSlugs } },
      { _id: { $in: enabledCustomIds } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any,
  }).select("_id slug").lean();

  const idToSlug = new Map(templates.map((t) => [String(t._id), t.slug]));
  const seededBuiltinSlugs = new Set(templates.map((t) => t.slug));

  const queries: Promise<void>[] = [];

  // Unified store: one query across all resolved templates.
  if (templates.length > 0) {
    queries.push(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      CustomEntry.find({ userId, templateId: { $in: templates.map((t) => t._id) } as any, date: dateFilter })
        .select("date templateId").lean()
        .then((docs) => {
          for (const doc of docs) {
            const slug = idToSlug.get(String(doc.templateId));
            if (slug) addDate(doc.date, slug);
          }
        })
    );
  }

  // Legacy fallback — only for built-in sections whose template isn't seeded yet.
  const needsLegacy = (slug: SectionId) => has(slug) && !seededBuiltinSlugs.has(slug);

  if (needsLegacy("gym")) {
    queries.push(GymAttendance.find({ userId, date: dateFilter }).select("date").lean()
      .then((docs) => addDates(docs.map((d) => d.date), "gym")));
  }
  if (needsLegacy("work")) {
    queries.push(WorkSession.find({ userId, date: dateFilter }).select("date").lean()
      .then((docs) => addDates(docs.map((d) => d.date), "work")));
  }
  if (needsLegacy("habits")) {
    queries.push((async () => {
      const habits = await Habit.find({ userId }).select("_id").lean();
      if (habits.length === 0) return;
      const logs = await HabitLog.find({ habitId: { $in: habits.map((h) => h._id) }, date: dateFilter }).select("date").lean();
      addDates(logs.map((l) => l.date), "habits");
    })());
  }
  if (needsLegacy("study")) {
    queries.push(StudySession.find({ userId, date: dateFilter }).select("date").lean()
      .then((docs) => addDates(docs.map((d) => d.date), "study")));
  }
  if (needsLegacy("hobbies")) {
    queries.push(HobbySession.find({ userId, date: dateFilter }).select("date").lean()
      .then((docs) => addDates(docs.map((d) => d.date), "hobbies")));
  }
  if (needsLegacy("housework")) {
    queries.push(HouseworkLog.find({ userId, date: dateFilter }).select("date").lean()
      .then((docs) => addDates(docs.map((d) => d.date), "housework")));
  }
  if (needsLegacy("health")) {
    queries.push(HealthLog.find({ userId, date: dateFilter }).select("date").lean()
      .then((docs) => addDates(docs.map((d) => d.date), "health")));
  }
  if (needsLegacy("goals")) {
    queries.push(Goal.find({ userId, createdAt: dateFilter }).select("createdAt").lean()
      .then((docs) => addDates(docs.map((d) => d.createdAt), "goals")));
  }
  if (needsLegacy("journal")) {
    queries.push(JournalEntry.find({ userId, date: dateFilter }).select("date").lean()
      .then((docs) => addDates(docs.map((d) => d.date), "journal")));
  }
  if (needsLegacy("finances")) {
    queries.push(Expense.find({ userId, date: dateFilter }).select("date").lean()
      .then((docs) => addDates(docs.map((d) => d.date), "finances")));
  }
  if (needsLegacy("mealprep")) {
    queries.push(MealPlan.find({ userId, date: dateFilter }).select("date").lean()
      .then((docs) => addDates(docs.map((d) => d.date), "mealprep")));
  }

  await Promise.all(queries);

  return NextResponse.json({ activity });
}

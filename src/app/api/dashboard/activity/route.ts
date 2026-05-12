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
import { startOfMonth, endOfMonth, format } from "date-fns";
import { DEFAULT_ENABLED_SECTIONS, type SectionId } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get("month"); // "2026-05"

  let start: Date, end: Date;
  if (monthParam) {
    const d = new Date(monthParam + "-01");
    start = startOfMonth(d);
    end = endOfMonth(d);
  } else {
    start = startOfMonth(new Date());
    end = endOfMonth(new Date());
  }

  const user = await User.findById(userId).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const enabled = (user.enabledSections as SectionId[] | undefined) ?? [...DEFAULT_ENABLED_SECTIONS];
  const has = (s: SectionId) => enabled.includes(s);
  const dateFilter = { $gte: start, $lte: end };

  const activity: Record<string, string[]> = {};

  const addDates = (dates: Date[], sectionId: string) => {
    for (const d of dates) {
      const key = format(d, "yyyy-MM-dd");
      if (!activity[key]) activity[key] = [];
      if (!activity[key].includes(sectionId)) activity[key].push(sectionId);
    }
  };

  // Query all sections in parallel
  const queries: Promise<void>[] = [];

  if (has("gym")) {
    queries.push(
      GymAttendance.find({ userId, date: dateFilter }).select("date").lean()
        .then((docs) => addDates(docs.map((d) => d.date), "gym"))
    );
  }
  if (has("work")) {
    queries.push(
      WorkSession.find({ userId, date: dateFilter }).select("date").lean()
        .then((docs) => addDates(docs.map((d) => d.date), "work"))
    );
  }
  if (has("habits")) {
    queries.push(
      (async () => {
        const habits = await Habit.find({ userId }).select("_id").lean();
        if (habits.length === 0) return;
        const logs = await HabitLog.find({
          habitId: { $in: habits.map((h) => h._id) },
          date: dateFilter,
        }).select("date").lean();
        addDates(logs.map((l) => l.date), "habits");
      })()
    );
  }
  if (has("study")) {
    queries.push(
      StudySession.find({ userId, date: dateFilter }).select("date").lean()
        .then((docs) => addDates(docs.map((d) => d.date), "study"))
    );
  }
  if (has("hobbies")) {
    queries.push(
      HobbySession.find({ userId, date: dateFilter }).select("date").lean()
        .then((docs) => addDates(docs.map((d) => d.date), "hobbies"))
    );
  }
  if (has("housework")) {
    queries.push(
      HouseworkLog.find({ userId, date: dateFilter }).select("date").lean()
        .then((docs) => addDates(docs.map((d) => d.date), "housework"))
    );
  }
  if (has("health")) {
    queries.push(
      HealthLog.find({ userId, date: dateFilter }).select("date").lean()
        .then((docs) => addDates(docs.map((d) => d.date), "health"))
    );
  }
  if (has("goals")) {
    queries.push(
      Goal.find({ userId, createdAt: dateFilter }).select("createdAt").lean()
        .then((docs) => addDates(docs.map((d) => d.createdAt), "goals"))
    );
  }
  if (has("journal")) {
    queries.push(
      JournalEntry.find({ userId, date: dateFilter }).select("date").lean()
        .then((docs) => addDates(docs.map((d) => d.date), "journal"))
    );
  }
  if (has("finances")) {
    queries.push(
      Expense.find({ userId, date: dateFilter }).select("date").lean()
        .then((docs) => addDates(docs.map((d) => d.date), "finances"))
    );
  }
  if (has("mealprep")) {
    queries.push(
      MealPlan.find({ userId, date: dateFilter }).select("date").lean()
        .then((docs) => addDates(docs.map((d) => d.date), "mealprep"))
    );
  }

  // Custom sections
  const customSecs = user.customSections || [];
  const enabledCustom = (customSecs as { templateId: { toString(): string }; enabled: boolean }[]).filter((cs) => cs.enabled);
  if (enabledCustom.length > 0) {
    const templateIds = enabledCustom.map((cs) => cs.templateId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templates = await SectionTemplate.find({ _id: { $in: templateIds } } as any).lean();
    const templateMap = new Map(templates.map((t) => [String(t._id), t.slug]));

    queries.push(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      CustomEntry.find({ userId, templateId: { $in: templateIds } as any, date: dateFilter })
        .select("date templateId").lean()
        .then((docs) => {
          for (const doc of docs) {
            const slug = templateMap.get(String(doc.templateId));
            if (slug) {
              const key = format(doc.date, "yyyy-MM-dd");
              if (!activity[key]) activity[key] = [];
              if (!activity[key].includes(slug)) activity[key].push(slug);
            }
          }
        })
    );
  }

  await Promise.all(queries);

  return NextResponse.json({ activity });
}

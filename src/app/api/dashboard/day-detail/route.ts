import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import WorkSession from "@/lib/models/work-session";
import GymAttendance from "@/lib/models/gym-attendance";
import { Habit, HabitLog } from "@/lib/models/habit";
import StudySession from "@/lib/models/study-session";
import HobbySession from "@/lib/models/hobby-session";
import HouseworkLog from "@/lib/models/housework-log";
import HealthLog from "@/lib/models/health-log";
import JournalEntry from "@/lib/models/journal-entry";
import Expense from "@/lib/models/expense";
import Route from "@/lib/models/route";
import MealPlan from "@/lib/models/meal-plan";
import { startOfDay, endOfDay } from "date-fns";
import { DEFAULT_ENABLED_SECTIONS, type SectionId } from "@/lib/constants";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  if (!dateParam) {
    return NextResponse.json({ error: "date parameter required" }, { status: 400 });
  }

  const dayStart = startOfDay(new Date(dateParam));
  const dayEnd = endOfDay(new Date(dateParam));
  const dateFilter = { $gte: dayStart, $lte: dayEnd };

  const user = await User.findById(userId).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const enabled = (user.enabledSections as SectionId[] | undefined) ?? [...DEFAULT_ENABLED_SECTIONS];
  const has = (s: SectionId) => enabled.includes(s);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};

  const queries: Promise<void>[] = [];

  if (has("work")) {
    queries.push(
      WorkSession.find({ userId, date: dateFilter }).lean()
        .then((docs) => { if (docs.length > 0) result.work = docs; })
    );
  }

  if (has("gym")) {
    queries.push(
      GymAttendance.find({ userId, date: dateFilter }).lean()
        .then((docs) => { if (docs.length > 0) result.gym = docs; })
    );
  }

  if (has("habits")) {
    queries.push(
      (async () => {
        const habits = await Habit.find({ userId, active: true }).lean();
        if (habits.length === 0) return;
        const logs = await HabitLog.find({
          habitId: { $in: habits.map((h) => h._id) },
          date: dateFilter,
        }).lean();
        if (logs.length === 0) return;
        const loggedIds = new Set(logs.map((l) => String(l.habitId)));
        result.habits = habits
          .filter((h) => loggedIds.has(String(h._id)))
          .map((h) => ({
            _id: String(h._id),
            name: h.name,
            emoji: h.emoji,
            color: h.color,
            completed: true,
          }));
      })()
    );
  }

  if (has("study")) {
    queries.push(
      StudySession.find({ userId, date: dateFilter }).lean()
        .then((docs) => { if (docs.length > 0) result.study = docs; })
    );
  }

  if (has("hobbies")) {
    queries.push(
      HobbySession.find({ userId, date: dateFilter }).lean()
        .then((docs) => { if (docs.length > 0) result.hobbies = docs; })
    );
  }

  if (has("housework")) {
    queries.push(
      HouseworkLog.find({ userId, date: dateFilter }).lean()
        .then((docs) => { if (docs.length > 0) result.housework = docs; })
    );
  }

  if (has("health")) {
    queries.push(
      HealthLog.findOne({ userId, date: dateFilter }).lean()
        .then((doc) => { if (doc) result.health = doc; })
    );
  }

  if (has("journal")) {
    queries.push(
      JournalEntry.findOne({ userId, date: dateFilter }).lean()
        .then((doc) => { if (doc) result.journal = doc; })
    );
  }

  if (has("finances")) {
    queries.push(
      (async () => {
        const [expenses, routes] = await Promise.all([
          Expense.find({ userId, date: dateFilter }).lean(),
          Route.find({ userId, date: dateFilter }).lean(),
        ]);
        if (expenses.length > 0 || routes.length > 0) {
          result.finances = { expenses, routes };
        }
      })()
    );
  }

  if (has("mealprep")) {
    queries.push(
      MealPlan.findOne({ userId, date: dateFilter }).lean()
        .then((doc) => { if (doc) result.mealprep = doc; })
    );
  }

  await Promise.all(queries);

  // Add user config for inline forms
  const jobs = user.workConfig?.jobs?.filter((j: { active: boolean }) => j.active) || [];
  const currency = user.preferences?.currency || "CAD";

  return NextResponse.json({ sections: result, jobs, currency });
}

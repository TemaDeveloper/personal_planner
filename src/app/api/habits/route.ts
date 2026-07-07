import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import { Habit, HabitLog } from "@/lib/models/habit";
import { startOfDay, subDays } from "date-fns";
import { createHabitSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const habits = await Habit.find({ userId, active: true }).lean();
  const today = startOfDay(new Date());
  const rangeStart = subDays(today, 365);

  // Batch-fetch every log in the streak lookback window in one query, then
  // compute completedToday/streak in memory instead of querying per habit
  // per day (was up to 365 DB round-trips per habit).
  const habitIds = habits.map((h) => h._id);
  const logs = habitIds.length > 0
    ? await HabitLog.find({
        habitId: { $in: habitIds },
        date: { $gte: rangeStart, $lte: today },
      }).lean()
    : [];

  const datesByHabit = new Map<string, Set<number>>();
  for (const log of logs) {
    const key = String(log.habitId);
    const dates = datesByHabit.get(key) ?? new Set<number>();
    dates.add(startOfDay(log.date).getTime());
    datesByHabit.set(key, dates);
  }

  const habitsWithLogs = habits.map((habit) => {
    const dates = datesByHabit.get(String(habit._id)) ?? new Set<number>();
    const todayLog = dates.has(today.getTime());

    let streak = 0;
    const checkDate = todayLog ? today : subDays(today, 1);
    for (let i = 0; i < 365; i++) {
      if (dates.has(startOfDay(subDays(checkDate, i)).getTime())) {
        streak++;
      } else {
        break;
      }
    }

    return {
      _id: String(habit._id),
      name: habit.name,
      emoji: habit.emoji,
      color: habit.color,
      active: habit.active,
      completedToday: todayLog,
      streak,
    };
  });

  return NextResponse.json({ habits: habitsWithLogs });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const parsed = createHabitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { name, emoji, color } = parsed.data;

  const habit = await Habit.create({
    userId,
    name,
    emoji: emoji || "🎯",
    color: color || "#D4A853",
  });

  return NextResponse.json({ habit }, { status: 201 });
}

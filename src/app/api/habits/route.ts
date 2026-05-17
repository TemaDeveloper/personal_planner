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

  // Get today's logs and compute streaks
  const habitsWithLogs = await Promise.all(
    habits.map(async (habit) => {
      const todayLog = await HabitLog.findOne({
        habitId: habit._id,
        date: today,
      });

      // Calculate streak
      let streak = 0;
      const checkDate = todayLog ? today : subDays(today, 1);
      for (let i = 0; i < 365; i++) {
        const log = await HabitLog.findOne({
          habitId: habit._id,
          date: startOfDay(subDays(checkDate, i)),
        });
        if (log) {
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
        completedToday: !!todayLog,
        streak,
      };
    })
  );

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

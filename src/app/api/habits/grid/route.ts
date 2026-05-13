import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import { Habit, HabitLog } from "@/lib/models/habit";
import { startOfMonth, endOfMonth } from "date-fns";

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

  const habits = await Habit.find({ userId, active: true }).lean();

  const habitIds = habits.map((h) => h._id);
  const logs = await HabitLog.find({
    habitId: { $in: habitIds },
    date: { $gte: start, $lte: end },
  }).lean();

  // Build a map: habitId -> Set of date strings
  const logMap: Record<string, string[]> = {};
  for (const log of logs) {
    const hid = String(log.habitId);
    const dateStr = new Date(log.date).toISOString().split("T")[0];
    if (!logMap[hid]) logMap[hid] = [];
    if (!logMap[hid].includes(dateStr)) logMap[hid].push(dateStr);
  }

  return NextResponse.json({
    habits: habits.map((h) => ({
      _id: String(h._id),
      name: h.name,
      emoji: h.emoji,
      color: h.color,
      dates: logMap[String(h._id)] || [],
    })),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import HouseworkLog from "@/lib/models/housework-log";
import User from "@/lib/models/user";
import { startOfDay, endOfDay, getDay, getDate } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get("date") || new Date().toISOString();
  const targetDate = new Date(dateStr);

  // Get user's chore config
  const user = await User.findById(userId).lean();
  const chores = user?.houseworkConfig?.chores?.filter((c: { active: boolean }) => c.active) || [];

  // Determine which recurring chores apply for this date
  const dayOfWeek = getDay(targetDate); // 0=Sun, 1=Mon, ...
  const dayOfMonth = getDate(targetDate);

  const applicableChores = chores.filter((c: { frequency: string }) => {
    if (c.frequency === "daily") return true;
    if (c.frequency === "weekly") return dayOfWeek === 1; // Mondays
    if (c.frequency === "monthly") return dayOfMonth === 1; // 1st of month
    return false;
  });

  // Get existing logs for this date
  const logs = await HouseworkLog.find({
    userId,
    date: { $gte: startOfDay(targetDate), $lte: endOfDay(targetDate) },
  }).lean();

  // Merge: create checklist from recurring chores + any one-off tasks
  const logMap = new Map(logs.map((l) => [l.choreName + (l.isRecurring ? "_r" : "_o"), l]));

  const checklist = [
    ...applicableChores.map((c: { name: string; frequency: string }) => {
      const existing = logMap.get(c.name + "_r");
      return {
        _id: existing?._id || null,
        choreName: c.name,
        isRecurring: true,
        completed: existing?.completed || false,
        frequency: c.frequency,
      };
    }),
    ...logs
      .filter((l) => !l.isRecurring)
      .map((l) => ({
        _id: l._id,
        choreName: l.choreName,
        isRecurring: false,
        completed: l.completed,
        frequency: null,
      })),
  ];

  return NextResponse.json({ checklist, date: targetDate.toISOString() });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const { choreName, date, isRecurring } = body;

  if (!choreName || !date) {
    return NextResponse.json(
      { error: "choreName and date are required" },
      { status: 400 }
    );
  }

  const log = await HouseworkLog.create({
    userId,
    choreName,
    date: new Date(date),
    isRecurring: isRecurring || false,
    completed: false,
  });

  return NextResponse.json({ log }, { status: 201 });
}

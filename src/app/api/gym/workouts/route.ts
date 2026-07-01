import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import GymAttendance from "@/lib/models/gym-attendance";
import User from "@/lib/models/user";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { createWorkoutSchema } from "@/lib/validations";
import { toUtcMidnight } from "@/lib/gym-date";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const weekOf = searchParams.get("weekOf");
  const monthEnd = searchParams.get("monthEnd");

  let start: Date, end: Date;
  if (weekOf && monthEnd) {
    // Month range query
    start = startOfMonth(new Date(weekOf));
    end = endOfMonth(new Date(monthEnd));
  } else if (weekOf) {
    const d = new Date(weekOf);
    start = startOfWeek(d, { weekStartsOn: 1 });
    end = endOfWeek(d, { weekStartsOn: 1 });
  } else {
    start = startOfWeek(new Date(), { weekStartsOn: 1 });
    end = endOfWeek(new Date(), { weekStartsOn: 1 });
  }

  const [attendance, user] = await Promise.all([
    GymAttendance.find({
      userId,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: 1 })
      .lean(),
    User.findById(userId).select("gymConfig").lean(),
  ]);

  return NextResponse.json({
    attendance,
    targetDaysPerWeek: user?.gymConfig?.targetDaysPerWeek ?? 3,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const parsed = createWorkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { date } = parsed.data;

  // Normalize to UTC midnight of the calendar date so attendance is
  // timezone-independent (see src/lib/gym-date.ts).
  const d = toUtcMidnight(date);

  const existing = await GymAttendance.findOne({ userId, date: d });

  if (existing) {
    await GymAttendance.deleteOne({ _id: existing._id });
    return NextResponse.json({ attended: false, date: d });
  }

  const record = await GymAttendance.create({ userId, date: d });
  return NextResponse.json({ attended: true, date: d, record }, { status: 201 });
}

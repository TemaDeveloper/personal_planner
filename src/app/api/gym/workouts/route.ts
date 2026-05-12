import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import GymAttendance from "@/lib/models/gym-attendance";
import User from "@/lib/models/user";
import { startOfWeek, endOfWeek, startOfDay } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const weekOf = searchParams.get("weekOf");

  let start: Date, end: Date;
  if (weekOf) {
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
    targetDaysPerWeek: user?.gymConfig?.targetDaysPerWeek ?? 5,
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
  const { date } = body;

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const d = startOfDay(new Date(date));

  const existing = await GymAttendance.findOne({ userId, date: d });

  if (existing) {
    await GymAttendance.deleteOne({ _id: existing._id });
    return NextResponse.json({ attended: false, date: d });
  }

  const record = await GymAttendance.create({ userId, date: d });
  return NextResponse.json({ attended: true, date: d, record }, { status: 201 });
}

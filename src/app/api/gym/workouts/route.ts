import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import Workout from "@/lib/models/workout";
import { startOfWeek, endOfWeek } from "date-fns";

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

  const workouts = await Workout.find({
    userId,
    date: { $gte: start, $lte: end },
  })
    .sort({ date: 1 })
    .lean();

  return NextResponse.json({ workouts });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const { date, exercises, note } = body;

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const mappedDay = dayOfWeek === 0 ? 7 : dayOfWeek; // 1=Mon, 7=Sun

  if (mappedDay > 5) {
    return NextResponse.json(
      { error: "Gym tracking is Mon-Fri only" },
      { status: 400 }
    );
  }

  const workout = await Workout.create({
    userId,
    date: d,
    dayOfWeek: mappedDay,
    exercises: exercises || [],
    note,
  });

  return NextResponse.json({ workout }, { status: 201 });
}

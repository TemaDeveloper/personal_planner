import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import HealthLog from "@/lib/models/health-log";
import { startOfDay } from "date-fns";
import { createHealthSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const filter: Record<string, unknown> = { userId };
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.date as Record<string, Date>).$lte = new Date(to);
  }

  const logs = await HealthLog.find(filter).sort({ date: -1 }).limit(60).lean();

  return NextResponse.json({ logs });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const parsed = createHealthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { date, waterLiters, sleepHours, weight, mood } = parsed.data;

  const dayStart = startOfDay(new Date(date));

  // Upsert by date
  const log = await HealthLog.findOneAndUpdate(
    { userId, date: dayStart },
    {
      userId,
      date: dayStart,
      water: waterLiters ?? 0,
      sleepHours: sleepHours ?? 0,
      weight: weight || undefined,
      mood: mood ?? 3,
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ log }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import WorkSession from "@/lib/models/work-session";
import User from "@/lib/models/user";
import {
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const jobName = searchParams.get("jobName");

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const baseFilter: Record<string, unknown> = { userId };
  if (jobName) baseFilter.jobName = jobName;

  const [todaySessions, weekSessions, monthSessions, user] = await Promise.all([
    WorkSession.find({ ...baseFilter, date: { $gte: todayStart, $lte: todayEnd } }).lean(),
    WorkSession.find({ ...baseFilter, date: { $gte: weekStart, $lte: weekEnd } }).lean(),
    WorkSession.find({ ...baseFilter, date: { $gte: monthStart, $lte: monthEnd } }).lean(),
    User.findById(userId).lean(),
  ]);

  const job = user?.workConfig?.jobs?.find(
    (j: { name: string }) => j.name === jobName
  );
  const hourlyRate = job?.hourlyRate || 0;
  const weeklyTarget = job?.weeklyTarget || 20;

  const todayHours = todaySessions.reduce((s: number, ws: { hours: number }) => s + ws.hours, 0);
  const weekHours = weekSessions.reduce((s: number, ws: { hours: number }) => s + ws.hours, 0);
  const monthHours = monthSessions.reduce((s: number, ws: { hours: number }) => s + ws.hours, 0);

  return NextResponse.json({
    todayHours,
    weekHours,
    monthHours,
    todayEarnings: todayHours * hourlyRate,
    weekEarnings: weekHours * hourlyRate,
    monthEarnings: monthHours * hourlyRate,
    weeklyTarget,
    hourlyRate,
  });
}

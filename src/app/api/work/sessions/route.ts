import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import WorkSession from "@/lib/models/work-session";
import { createWorkSessionSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const jobName = searchParams.get("jobName");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const filter: Record<string, unknown> = { userId };
  if (jobName) filter.jobName = String(jobName);
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.date as Record<string, Date>).$lte = new Date(to);
  }

  const sessions = await WorkSession.find(filter).sort({ date: -1 }).limit(100).lean();

  return NextResponse.json({ sessions });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const parsed = createWorkSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { jobName, date, hours, note } = parsed.data;

  const workSession = await WorkSession.create({
    userId,
    jobName,
    date: new Date(date),
    hours: Number(hours),
    note,
  });

  return NextResponse.json({ session: workSession }, { status: 201 });
}

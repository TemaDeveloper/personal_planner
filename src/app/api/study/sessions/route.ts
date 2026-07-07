import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import StudySession from "@/lib/models/study-session";
import { createStudySessionSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const subject = searchParams.get("subject");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 200, 1), 200);
  const skip = Math.max(Number(searchParams.get("skip")) || 0, 0);

  const filter: Record<string, unknown> = { userId };
  if (subject) filter.subject = String(subject);
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.date as Record<string, Date>).$lte = new Date(to);
  }

  const [sessions, total] = await Promise.all([
    StudySession.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
    StudySession.countDocuments(filter),
  ]);

  return NextResponse.json({ sessions, total, skip, limit });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const parsed = createStudySessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { subject, date, minutes, note } = parsed.data;

  const studySession = await StudySession.create({
    userId,
    subject,
    date: new Date(date),
    minutes: Number(minutes),
    note,
  });

  return NextResponse.json({ session: studySession }, { status: 201 });
}

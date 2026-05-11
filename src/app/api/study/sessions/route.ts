import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import StudySession from "@/lib/models/study-session";

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

  const filter: Record<string, unknown> = { userId };
  if (subject) filter.subject = subject;
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.date as Record<string, Date>).$lte = new Date(to);
  }

  const sessions = await StudySession.find(filter).sort({ date: -1 }).limit(200).lean();

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
  const { subject, date, minutes, note } = body;

  if (!subject || !date || !minutes) {
    return NextResponse.json(
      { error: "subject, date, and minutes are required" },
      { status: 400 }
    );
  }

  const studySession = await StudySession.create({
    userId,
    subject,
    date: new Date(date),
    minutes: Number(minutes),
    note,
  });

  return NextResponse.json({ session: studySession }, { status: 201 });
}

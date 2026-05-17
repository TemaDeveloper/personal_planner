import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import JournalEntry from "@/lib/models/journal-entry";
import { startOfDay } from "date-fns";
import { createJournalSchema } from "@/lib/validations";

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
  const limit = searchParams.get("limit");

  const filter: Record<string, unknown> = { userId };
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.date as Record<string, Date>).$lte = new Date(to);
  }

  const entries = await JournalEntry.find(filter)
    .sort({ date: -1 })
    .limit(limit ? Number(limit) : 50)
    .lean();

  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const parsed = createJournalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { date, content, mood } = parsed.data;

  const dayStart = startOfDay(new Date(date));

  const entry = await JournalEntry.findOneAndUpdate(
    { userId, date: dayStart },
    { userId, date: dayStart, content, mood: mood ?? 3 },
    { upsert: true, new: true }
  );

  return NextResponse.json({ entry }, { status: 201 });
}

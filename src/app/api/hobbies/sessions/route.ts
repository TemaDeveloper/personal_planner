import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import HobbySession from "@/lib/models/hobby-session";
import { createHobbySessionSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const hobby = searchParams.get("hobby");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const filter: Record<string, unknown> = { userId };
  if (hobby) filter.hobby = String(hobby);
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.date as Record<string, Date>).$lte = new Date(to);
  }

  const sessions = await HobbySession.find(filter).sort({ date: -1 }).limit(200).lean();

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
  const parsed = createHobbySessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { hobby, date, minutes, note } = parsed.data;

  const hobbySession = await HobbySession.create({
    userId,
    hobby,
    date: new Date(date),
    minutes: Number(minutes),
    note,
  });

  return NextResponse.json({ session: hobbySession }, { status: 201 });
}

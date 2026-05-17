import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import Homework from "@/lib/models/homework";
import { createHomeworkSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const completed = searchParams.get("completed");
  const subject = searchParams.get("subject");

  const filter: Record<string, unknown> = { userId };
  if (completed !== null) filter.completed = completed === "true";
  if (subject) filter.subject = String(subject);

  const homework = await Homework.find(filter).sort({ dueDate: 1, createdAt: -1 }).limit(200).lean();

  return NextResponse.json({ homework });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const parsed = createHomeworkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { subject, title, dueDate } = parsed.data;

  const homework = await Homework.create({
    userId,
    subject,
    title,
    dueDate: dueDate ? new Date(dueDate) : undefined,
  });

  return NextResponse.json({ homework }, { status: 201 });
}

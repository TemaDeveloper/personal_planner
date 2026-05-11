import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import AcademicItem from "@/lib/models/academic-item";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const subject = searchParams.get("subject");

  const filter: Record<string, unknown> = { userId };
  if (type) filter.type = type;
  if (subject) filter.subject = subject;

  const items = await AcademicItem.find(filter).sort({ dueDate: 1 }).limit(200).lean();

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const { type, subject, title, dueDate, grade, note } = body;

  if (!type || !subject || !title || !dueDate) {
    return NextResponse.json(
      { error: "type, subject, title, and dueDate are required" },
      { status: 400 }
    );
  }

  const item = await AcademicItem.create({
    userId,
    type,
    subject,
    title,
    dueDate: new Date(dueDate),
    grade: grade !== undefined ? Number(grade) : undefined,
    note,
  });

  return NextResponse.json({ item }, { status: 201 });
}

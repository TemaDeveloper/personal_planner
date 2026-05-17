import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import AcademicItem from "@/lib/models/academic-item";
import { createAcademicSchema } from "@/lib/validations";

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
  if (type) filter.type = String(type);
  if (subject) filter.subject = String(subject);

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
  const parsed = createAcademicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { type, subject, title, dueDate, grade, note } = parsed.data;

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

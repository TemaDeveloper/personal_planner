import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import Goal from "@/lib/models/goal";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");

  const filter: Record<string, unknown> = { userId };
  if (status) filter.status = status;
  if (category) filter.category = category;

  const goals = await Goal.find(filter).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ goals });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const { title, description, targetDate, category, milestones } = body;

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const goal = await Goal.create({
    userId,
    title,
    description,
    targetDate: targetDate ? new Date(targetDate) : undefined,
    category: category || "personal",
    milestones: milestones || [],
  });

  return NextResponse.json({ goal }, { status: 201 });
}

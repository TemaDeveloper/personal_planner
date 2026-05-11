import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import { HabitLog } from "@/lib/models/habit";
import { startOfDay } from "date-fns";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const date = startOfDay(new Date(body.date || new Date()));

  // Toggle: if log exists, remove it; otherwise create it
  const existing = await HabitLog.findOne({
    habitId: id,
    date,
  });

  if (existing) {
    await HabitLog.findByIdAndDelete(existing._id);
    return NextResponse.json({ toggled: false });
  }

  await HabitLog.create({
    habitId: id,
    userId,
    date,
  });

  return NextResponse.json({ toggled: true }, { status: 201 });
}

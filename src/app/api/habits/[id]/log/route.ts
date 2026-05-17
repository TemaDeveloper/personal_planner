import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import { HabitLog } from "@/lib/models/habit";
import { startOfDay } from "date-fns";
import { toggleHabitLogSchema } from "@/lib/validations";

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
  const parsed = toggleHabitLogSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const date = startOfDay(new Date(parsed.data.date));

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

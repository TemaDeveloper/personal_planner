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

  // Atomic toggle: findOneAndDelete returns the doc if it existed, null otherwise.
  // This eliminates the race condition where two concurrent requests both see no
  // existing log and both create one.
  const deleted = await HabitLog.findOneAndDelete({ habitId: id, date });

  if (deleted) {
    return NextResponse.json({ toggled: false });
  }

  try {
    await HabitLog.create({
      habitId: id,
      userId,
      date,
    });
    return NextResponse.json({ toggled: true }, { status: 201 });
  } catch (err: unknown) {
    // Concurrent request created the log first — the unique habitId+date
    // index rejects our insert, but a log now exists either way.
    if (err && typeof err === "object" && (err as { code?: number }).code === 11000) {
      return NextResponse.json({ toggled: true }, { status: 200 });
    }
    throw err;
  }
}

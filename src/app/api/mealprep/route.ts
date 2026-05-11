import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import MealPlan from "@/lib/models/meal-plan";
import { startOfWeek, endOfWeek } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const weekOf = searchParams.get("weekOf") || new Date().toISOString();
  const ws = startOfWeek(new Date(weekOf), { weekStartsOn: 1 });
  const we = endOfWeek(new Date(weekOf), { weekStartsOn: 1 });

  const plans = await MealPlan.find({
    userId,
    date: { $gte: ws, $lte: we },
  })
    .sort({ dayOfWeek: 1 })
    .lean();

  return NextResponse.json({ plans });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const { date, dayOfWeek, meals } = body;

  if (!date || !dayOfWeek) {
    return NextResponse.json(
      { error: "date and dayOfWeek are required" },
      { status: 400 }
    );
  }

  const plan = await MealPlan.findOneAndUpdate(
    { userId, date: new Date(date) },
    { userId, date: new Date(date), dayOfWeek, meals: meals || [] },
    { upsert: true, new: true }
  );

  return NextResponse.json({ plan }, { status: 201 });
}

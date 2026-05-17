import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import Expense from "@/lib/models/expense";
import { createExpenseSchema } from "@/lib/validations";

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

  const filter: Record<string, unknown> = { userId };
  if (from || to) {
    filter.date = {};
    if (from) (filter.date as Record<string, Date>).$gte = new Date(from);
    if (to) (filter.date as Record<string, Date>).$lte = new Date(to);
  }

  const expenses = await Expense.find(filter).sort({ date: -1 }).limit(200).lean();

  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { amount, currency, description, date, category } = parsed.data;

  const expense = await Expense.create({
    userId,
    amount: Number(amount),
    currency: currency || "CAD",
    description,
    date: new Date(date),
    category: category || "other",
  });

  return NextResponse.json({ expense }, { status: 201 });
}

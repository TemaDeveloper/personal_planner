import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import Book from "@/lib/models/book";
import { createBookSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const filter: Record<string, unknown> = { userId };
  if (status) filter.status = String(status);

  const books = await Book.find(filter).sort({ createdAt: -1 }).lean();

  return NextResponse.json({ books });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const parsed = createBookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { title, author, totalPages, status } = parsed.data;

  const book = await Book.create({
    userId,
    title,
    author,
    totalPages: totalPages || 0,
    status: status || "want-to-read",
  });

  return NextResponse.json({ book }, { status: 201 });
}

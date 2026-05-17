import { NextRequest, NextResponse } from "next/server";
import { pickFields } from "@/lib/sanitize";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import Book from "@/lib/models/book";
import { createBookSchema } from "@/lib/validations";

export async function PATCH(
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
  const parsed = createBookSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const updated = await Book.findOneAndUpdate(
    { _id: id, userId },
    pickFields(parsed.data, ["title","author","totalPages","currentPage","status","rating","notes"]),
    { new: true }
  );

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ book: updated });
}

export async function DELETE(
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

  const deleted = await Book.findOneAndDelete({ _id: id, userId });

  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

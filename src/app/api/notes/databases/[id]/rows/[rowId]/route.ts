import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesDatabase from "@/lib/models/notes-database";

/** Update a row's cells (shallow-merge the provided `cells` map). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; rowId: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || typeof body.cells !== "object" || !body.cells) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await connectDB();
  const { id, rowId } = await params;
  const db = await NotesDatabase.findOne({ _id: id, userId });
  if (!db) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = db.rows.find((r) => r.id === rowId);
  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  row.cells = { ...row.cells, ...body.cells };
  db.markModified("rows");
  await db.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; rowId: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { id, rowId } = await params;
  const db = await NotesDatabase.findOne({ _id: id, userId });
  if (!db) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const before = db.rows.length;
  db.rows = db.rows.filter((r) => r.id !== rowId);
  if (db.rows.length === before) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  db.markModified("rows");
  await db.save();
  return NextResponse.json({ ok: true });
}

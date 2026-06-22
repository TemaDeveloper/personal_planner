import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesDatabase from "@/lib/models/notes-database";

/** Update a row: shallow-merge `cells` and/or replace the page-body `content`. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; rowId: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const hasCells = body && typeof body.cells === "object" && body.cells;
  const hasContent = body && "content" in body;
  if (!hasCells && !hasContent) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  await connectDB();
  const { id, rowId } = await params;
  const db = await NotesDatabase.findOne({ _id: id, userId });
  if (!db) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const row = db.rows.find((r) => r.id === rowId);
  if (!row) return NextResponse.json({ error: "Row not found" }, { status: 404 });
  if (hasCells) row.cells = { ...row.cells, ...body.cells };
  if (hasContent) row.content = body.content;
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

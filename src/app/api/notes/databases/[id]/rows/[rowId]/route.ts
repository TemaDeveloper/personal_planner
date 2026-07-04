import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesDatabase from "@/lib/models/notes-database";

/** Update a row: shallow-merge `cells` and/or replace the page-body `content`.
 * Uses atomic $set with arrayFilters so concurrent edits to other cells/rows
 * are never clobbered by a stale full-rows read-modify-write. */
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
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const set: Record<string, unknown> = {};
  if (hasCells) {
    for (const [propId, value] of Object.entries(body.cells as Record<string, unknown>)) {
      // Property ids become Mongo paths — reject ones that would escape the cells map.
      if (propId.includes(".") || propId.startsWith("$")) {
        return NextResponse.json({ error: "Invalid input" }, { status: 400 });
      }
      set[`rows.$[r].cells.${propId}`] = value;
    }
  }
  if (hasContent) set["rows.$[r].content"] = body.content;

  const res = await NotesDatabase.updateOne(
    { _id: id, userId, "rows.id": rowId },
    { $set: set },
    { arrayFilters: [{ "r.id": rowId }] }
  );
  if (res.matchedCount === 0) {
    const exists = await NotesDatabase.exists({ _id: id, userId });
    return NextResponse.json({ error: exists ? "Row not found" : "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; rowId: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { id, rowId } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Atomic $pull — see PATCH above for why the full-array rewrite was unsafe.
  const res = await NotesDatabase.updateOne(
    { _id: id, userId, "rows.id": rowId },
    { $pull: { rows: { id: rowId } } }
  );
  if (res.matchedCount === 0) {
    const exists = await NotesDatabase.exists({ _id: id, userId });
    return NextResponse.json({ error: exists ? "Row not found" : "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

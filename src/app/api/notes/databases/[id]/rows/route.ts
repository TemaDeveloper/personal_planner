import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesDatabase from "@/lib/models/notes-database";

/** Append a new (blank) row to the database. Optional `cells` seeds values. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const cells = body && typeof body.cells === "object" && body.cells ? body.cells : {};
  const row: { id: string; cells: Record<string, unknown>; content?: unknown } =
    { id: `r_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, cells };
  if (body && body.content !== undefined) row.content = body.content; // carry page body on duplicate
  // Atomic $push — a read-modify-write of the whole rows array would drop
  // concurrent cell edits made between the read and the save.
  const res = await NotesDatabase.updateOne({ _id: id, userId }, { $push: { rows: row } });
  if (res.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ row }, { status: 201 });
}

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
  const db = await NotesDatabase.findOne({ _id: id, userId });
  if (!db) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const cells = body && typeof body.cells === "object" && body.cells ? body.cells : {};
  const row = { id: `r_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`, cells };
  db.rows.push(row);
  db.markModified("rows");
  await db.save();
  return NextResponse.json({ row }, { status: 201 });
}

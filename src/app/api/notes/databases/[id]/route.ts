import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesDatabase from "@/lib/models/notes-database";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const db = await NotesDatabase.findOne({ _id: id, userId }).lean();
  if (!db) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    database: {
      id: String(db._id),
      title: db.title,
      icon: db.icon,
      properties: db.properties,
      views: db.views,
      rows: db.rows,
    },
  });
}

/** Update database meta/schema/views (title, icon, properties, views). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const update: Record<string, unknown> = {};
  for (const key of ["title", "icon", "properties", "views"] as const) {
    if (key in body) update[key] = body[key];
  }
  await connectDB();
  const { id } = await params;
  const db = await NotesDatabase.findOneAndUpdate({ _id: id, userId }, update, { new: true }).lean();
  if (!db) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const res = await NotesDatabase.deleteOne({ _id: id, userId });
  if (!res.deletedCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

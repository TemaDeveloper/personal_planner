import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesDatabase from "@/lib/models/notes-database";
import { migrateRowsForTypeChange, synthesizeOptions, isSelectType } from "@/lib/notes/database";
import type { PropertyType } from "@/lib/models/notes-database";

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

  await connectDB();
  const { id } = await params;

  // `rowOrder` (array of row ids) reorders the AUTHORITATIVE stored rows without
  // replacing them — avoids clobbering a concurrent in-flight cell edit (which
  // a full `rows` snapshot would). Ids missing from the order keep their tail.
  if (Array.isArray(body.rowOrder)) {
    const doc = await NotesDatabase.findOne({ _id: id, userId });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const rank = new Map<string, number>(body.rowOrder.map((rid: string, i: number) => [rid, i]));
    doc.rows = doc.rows.slice().sort((a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER));
    doc.markModified("rows");
    await doc.save();
    return NextResponse.json({ ok: true });
  }

  // `migrate` changes a column's type against the AUTHORITATIVE rows (so a
  // concurrent cell edit to OTHER properties isn't clobbered by a stale rows
  // snapshot), migrating that column's cells and synthesizing select options.
  if (body.migrate && typeof body.migrate.propId === "string") {
    const { propId, fromType, toType } = body.migrate as { propId: string; fromType: PropertyType; toType: PropertyType };
    const doc = await NotesDatabase.findOne({ _id: id, userId });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    doc.rows = migrateRowsForTypeChange(doc.rows, propId, fromType, toType);
    doc.properties = doc.properties.map((p) => {
      if (p.id !== propId) return p;
      const next = { ...p, type: toType };
      if (isSelectType(toType)) next.options = synthesizeOptions(next, doc.rows);
      return next;
    });
    doc.markModified("rows");
    doc.markModified("properties");
    await doc.save();
    return NextResponse.json({ ok: true });
  }

  const update: Record<string, unknown> = {};
  // `rows` is accepted for deliberate bulk ops (e.g. migrating cells when a
  // column's type changes); per-cell edits should use the row endpoints.
  for (const key of ["title", "icon", "properties", "views", "rows"] as const) {
    if (key in body) update[key] = body[key];
  }
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

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesDatabase from "@/lib/models/notes-database";
import { buildDefaultDatabase } from "@/lib/notes/database";

/** List the user's databases (id + title), for relation target pickers. */
export async function GET() {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const dbs = await NotesDatabase.find({ userId }).select("_id title icon").sort({ updatedAt: -1 }).lean();
  return NextResponse.json({ databases: dbs.map((d) => ({ id: String(d._id), title: d.title, icon: d.icon })) });
}

/** Create a new database (default Notion-like schema: Name/Status/Date + Table view). */
export async function POST(req: NextRequest) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let title = "Untitled";
  try {
    const body = await req.json();
    if (typeof body?.title === "string") title = body.title.slice(0, 200);
  } catch { /* empty body is fine */ }

  await connectDB();
  // Seed ids off the row count of the user's databases so they're stable & unique-ish.
  const seed = (await NotesDatabase.countDocuments({ userId })) + 1;
  const { properties, views, rows } = buildDefaultDatabase(seed);
  const db = await NotesDatabase.create({ userId, title, properties, views, rows });

  return NextResponse.json({ database: { id: String(db._id), title: db.title } }, { status: 201 });
}

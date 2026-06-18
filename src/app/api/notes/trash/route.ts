import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesPage from "@/lib/models/notes-page";

/** List archived (trashed) pages, most-recently-trashed first. */
export async function GET() {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const pages = await NotesPage.find({ userId, archived: true })
    .select("_id title icon updatedAt")
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json({
    pages: pages.map((p) => ({
      id: String(p._id),
      title: p.title,
      icon: p.icon,
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
    })),
  });
}

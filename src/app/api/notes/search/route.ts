import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesPage from "@/lib/models/notes-page";
import { blocksToText, snippetAround } from "@/lib/notes/blocks-to-text";

/** Full-text-ish search across the user's pages: matches title OR body text,
 * returning a short snippet for body matches. Title matches rank first. */
export async function GET(req: NextRequest) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (!q) return NextResponse.json({ results: [] });
  const needle = q.toLowerCase();

  await connectDB();
  const pages = await NotesPage.find({ userId, archived: false })
    .select("_id title icon content")
    .lean();

  const results = [];
  for (const p of pages) {
    const title = (p.title || "Untitled");
    const titleHit = title.toLowerCase().includes(needle);
    const body = blocksToText(p.content);
    const bodyHit = body.toLowerCase().includes(needle);
    if (!titleHit && !bodyHit) continue;
    results.push({
      id: String(p._id),
      title: p.title,
      icon: p.icon,
      snippet: bodyHit ? snippetAround(body, q) : "",
      score: titleHit ? (title.toLowerCase().startsWith(needle) ? 0 : 1) : 2,
    });
  }

  results.sort((a, b) => a.score - b.score);
  return NextResponse.json({ results: results.slice(0, 20).map(({ score, ...r }) => { void score; return r; }) });
}

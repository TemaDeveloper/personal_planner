import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesPage from "@/lib/models/notes-page";

/** Restore a trashed page (and the descendants archived with it). If the
 * original parent is still trashed, the page is restored to the root. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const root = await NotesPage.findOne({ _id: id, userId, archived: true }).lean();
  if (!root) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Walk descendants among archived pages.
  const archived = await NotesPage.find({ userId, archived: true }).select("_id parentId").lean();
  const childrenOf = new Map<string, string[]>();
  for (const p of archived) {
    const key = p.parentId ? String(p.parentId) : "root";
    const arr = childrenOf.get(key) ?? [];
    arr.push(String(p._id));
    childrenOf.set(key, arr);
  }
  const toRestore: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    toRestore.push(cur);
    stack.push(...(childrenOf.get(cur) ?? []));
  }

  // If the parent is gone/trashed, reattach the root to the top level.
  const parentLives = root.parentId
    ? await NotesPage.exists({ _id: root.parentId, userId, archived: false })
    : true;
  if (!parentLives) {
    await NotesPage.updateOne({ _id: id, userId }, { parentId: null });
  }

  await NotesPage.updateMany({ _id: { $in: toRestore }, userId }, { archived: false });
  return NextResponse.json({ ok: true, restored: toRestore.length });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesPage from "@/lib/models/notes-page";

/** Deep-duplicate a page and its entire subtree. The new root is titled
 * "Copy of <title>" and placed right after the original among its siblings. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const root = await NotesPage.findOne({ _id: id, userId, archived: false }).lean();
  if (!root) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const all = await NotesPage.find({ userId, archived: false }).lean();
  const childrenOf = new Map<string, typeof all>();
  for (const p of all) {
    const key = p.parentId ? String(p.parentId) : "root";
    const arr = childrenOf.get(key) ?? [];
    arr.push(p);
    childrenOf.set(key, arr);
  }

  // New root order: just after the original.
  const newRoot = await NotesPage.create({
    userId,
    parentId: root.parentId ?? null,
    title: `Copy of ${root.title || "Untitled"}`,
    icon: root.icon,
    coverUrl: root.coverUrl ?? "",
    content: root.content,
    order: root.order + 0.5,
    fullWidth: root.fullWidth,
  });

  // Recreate descendants depth-first, preserving structure under new parents.
  const stack: { oldId: string; newParentId: string }[] = [{ oldId: String(root._id), newParentId: String(newRoot._id) }];
  let count = 1;
  while (stack.length) {
    const { oldId, newParentId } = stack.pop()!;
    const kids = childrenOf.get(oldId) ?? [];
    for (const k of kids) {
      const copy = await NotesPage.create({
        userId,
        parentId: newParentId,
        title: k.title,
        icon: k.icon,
        coverUrl: k.coverUrl ?? "",
        content: k.content,
        order: k.order,
        fullWidth: k.fullWidth,
      });
      count++;
      stack.push({ oldId: String(k._id), newParentId: String(copy._id) });
    }
  }

  return NextResponse.json({ page: { id: String(newRoot._id), title: newRoot.title }, count }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesPage from "@/lib/models/notes-page";
import NotesDatabase from "@/lib/models/notes-database";
import { collectDatabaseIds, rewriteContentIds } from "@/lib/notes/duplicate-content";

/** Deep-duplicate a page and its entire subtree. The new root is titled
 * "Copy of <title>" and placed right after the original. Referenced databases
 * are cloned (so the copy is independent), and in-content sub-page / mention
 * ids are rewritten to point at the new copies. */
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

  // Order the new root between the original and its next sibling (avoids the
  // +0.5 collision when the same page is duplicated twice).
  const siblings = (childrenOf.get(root.parentId ? String(root.parentId) : "root") ?? [])
    .slice().sort((a, b) => a.order - b.order);
  const idx = siblings.findIndex((s) => String(s._id) === String(root._id));
  const next = siblings[idx + 1];
  const newRootOrder = next ? (root.order + next.order) / 2 : root.order + 1;

  // PASS 1 — copy the page subtree (content not yet rewritten), recording the
  // original content per new page and the old→new page id map.
  type Pending = { newId: string; content: unknown };
  const pageMap: Record<string, string> = {};
  const pending: Pending[] = [];

  const newRoot = await NotesPage.create({
    userId,
    parentId: root.parentId ?? null,
    title: `Copy of ${root.title || "Untitled"}`,
    icon: root.icon,
    coverUrl: root.coverUrl ?? "",
    content: root.content,
    order: newRootOrder,
    fullWidth: root.fullWidth,
  });
  pageMap[String(root._id)] = String(newRoot._id);
  pending.push({ newId: String(newRoot._id), content: root.content });

  const stack: { oldId: string; newParentId: string }[] = [{ oldId: String(root._id), newParentId: String(newRoot._id) }];
  while (stack.length) {
    const { oldId, newParentId } = stack.pop()!;
    for (const k of childrenOf.get(oldId) ?? []) {
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
      pageMap[String(k._id)] = String(copy._id);
      pending.push({ newId: String(copy._id), content: k.content });
      stack.push({ oldId: String(k._id), newParentId: String(copy._id) });
    }
  }

  // PASS 2 — for each new page: clone the databases it references, then rewrite
  // databaseId + subPage/mention pageId in its content and save.
  for (const { newId, content } of pending) {
    const dbIds = collectDatabaseIds(content);
    const dbMap: Record<string, string> = {};
    for (const dbId of dbIds) {
      const src = await NotesDatabase.findOne({ _id: dbId, userId }).lean();
      if (!src) continue;
      const clone = await NotesDatabase.create({
        userId,
        title: src.title,
        icon: src.icon,
        properties: src.properties,
        views: src.views,
        rows: src.rows,
      });
      dbMap[dbId] = String(clone._id);
    }
    if (dbIds.length || Object.keys(pageMap).length) {
      const rewritten = rewriteContentIds(content, dbMap, pageMap);
      await NotesPage.updateOne({ _id: newId, userId }, { content: rewritten });
    }
  }

  return NextResponse.json({ page: { id: String(newRoot._id), title: newRoot.title }, count: pending.length }, { status: 201 });
}

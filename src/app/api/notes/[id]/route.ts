import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesPage from "@/lib/models/notes-page";
import { notesPageUpdateSchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const page = await NotesPage.findOne({ _id: id, userId, archived: false }).lean();
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    page: {
      id: String(page._id),
      parentId: page.parentId ? String(page.parentId) : null,
      title: page.title,
      icon: page.icon,
      coverUrl: page.coverUrl ?? null,
      content: page.content,
      order: page.order,
      fullWidth: page.fullWidth !== false,
      pinned: !!page.pinned,
      updatedAt: page.updatedAt ? new Date(page.updatedAt).toISOString() : null,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = notesPageUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  await connectDB();
  const { id } = await params;
  const update: Record<string, unknown> = { ...parsed.data };
  if ("parentId" in parsed.data) update.parentId = parsed.data.parentId ?? null;
  if ("coverUrl" in parsed.data) update.coverUrl = parsed.data.coverUrl ?? "";

  // Reject re-parenting a page under itself or one of its own descendants — a
  // cycle would otherwise corrupt the sidebar tree.
  if (update.parentId) {
    const target = String(update.parentId);
    if (target === id) return NextResponse.json({ error: "A page cannot be its own parent" }, { status: 400 });
    const all = await NotesPage.find({ userId, archived: false }).select("_id parentId").lean();
    const childrenOf = new Map<string, string[]>();
    for (const p of all) {
      const key = p.parentId ? String(p.parentId) : "root";
      (childrenOf.get(key) ?? childrenOf.set(key, []).get(key)!).push(String(p._id));
    }
    const subtree = new Set<string>();
    const stack = [id];
    while (stack.length) { const cur = stack.pop()!; subtree.add(cur); stack.push(...(childrenOf.get(cur) ?? [])); }
    if (subtree.has(target)) return NextResponse.json({ error: "Cannot move a page into its own subtree" }, { status: 400 });
  }

  const page = await NotesPage.findOneAndUpdate({ _id: id, userId }, update, { new: true }).lean();
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const permanent = req.nextUrl.searchParams.get("permanent") === "1";

  // Permanent delete operates on the trashed subtree; soft delete on the live one.
  const all = await NotesPage.find({ userId, archived: permanent }).select("_id parentId").lean();
  const childrenOf = new Map<string, string[]>();
  for (const p of all) {
    const key = p.parentId ? String(p.parentId) : "root";
    const arr = childrenOf.get(key) ?? [];
    arr.push(String(p._id));
    childrenOf.set(key, arr);
  }
  const toDelete: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    toDelete.push(cur);
    stack.push(...(childrenOf.get(cur) ?? []));
  }

  if (permanent) {
    const res = await NotesPage.deleteMany({ _id: { $in: toDelete }, userId });
    if (res.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, deleted: toDelete.length });
  }

  const res = await NotesPage.updateMany({ _id: { $in: toDelete }, userId }, { archived: true });
  if (res.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, archived: toDelete.length });
}

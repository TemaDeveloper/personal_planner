import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesPage from "@/lib/models/notes-page";
import NotesDatabase from "@/lib/models/notes-database";
import { notesPageCreateSchema } from "@/lib/validations";
import { buildTemplate, templateIcon, templateDatabases } from "@/lib/notes/templates";

export async function GET() {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const pages = await NotesPage.find({ userId, archived: false })
    .select("_id parentId title icon order pinned")
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const flat = pages.map((p) => ({
    id: String(p._id),
    parentId: p.parentId ? String(p.parentId) : null,
    title: p.title,
    icon: p.icon,
    order: p.order,
    pinned: !!p.pinned,
  }));
  return NextResponse.json({ pages: flat });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = notesPageCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { parentId, title, template } = parsed.data;

  await connectDB();
  const last = await NotesPage.find({ userId, parentId: parentId ?? null, archived: false })
    .sort({ order: -1 })
    .limit(1)
    .lean();
  const order = last.length ? last[0].order + 1 : 0;

  // If the template carries one or more databases, create each and swap its
  // sentinel id in the page content for the real database id.
  let content: unknown = buildTemplate(template ?? "blank");
  const dbDefs = templateDatabases(template ?? "blank");
  const sentinels = Object.keys(dbDefs);
  if (sentinels.length) {
    const idBySentinel: Record<string, string> = {};
    const created: { id: string; properties: { type?: string; relationDbId?: string }[] }[] = [];
    // Pass 1: create each database.
    for (const sentinel of sentinels) {
      const def = dbDefs[sentinel];
      const db = await NotesDatabase.create({
        userId, title: def.title, icon: def.icon,
        properties: def.properties, views: def.views, rows: def.rows,
      });
      idBySentinel[sentinel] = String(db._id);
      created.push({ id: String(db._id), properties: def.properties as { type?: string; relationDbId?: string }[] });
    }
    // Pass 2: rewrite relation properties whose relationDbId is a sibling
    // sentinel → that sibling's real id (cross-database relations + rollups).
    for (const c of created) {
      let changed = false;
      const props = c.properties.map((p) => {
        if (p.type === "relation" && p.relationDbId && idBySentinel[p.relationDbId]) {
          changed = true;
          return { ...p, relationDbId: idBySentinel[p.relationDbId] };
        }
        return p;
      });
      if (changed) await NotesDatabase.updateOne({ _id: c.id, userId }, { properties: props });
    }
    content = (content as { type?: string; props?: Record<string, unknown> }[]).map((b) => {
      const sid = b?.type === "database" ? (b.props?.databaseId as string) : undefined;
      return sid && idBySentinel[sid] ? { ...b, props: { ...b.props, databaseId: idBySentinel[sid] } } : b;
    });
  }

  const page = await NotesPage.create({
    userId,
    parentId: parentId ?? null,
    title: title || "Untitled",
    icon: templateIcon(template ?? "blank"),
    content,
    order,
  });

  return NextResponse.json(
    { page: { id: String(page._id), parentId: parentId ?? null, title: page.title, icon: page.icon, order } },
    { status: 201 }
  );
}

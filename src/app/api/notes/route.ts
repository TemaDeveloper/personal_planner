import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesPage from "@/lib/models/notes-page";
import NotesDatabase from "@/lib/models/notes-database";
import { notesPageCreateSchema } from "@/lib/validations";
import { buildTemplate, templateIcon, templateDatabase, TEMPLATE_DB_SENTINEL } from "@/lib/notes/templates";

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

  // If the template carries a database, create it and swap the sentinel id in
  // the page content for the real database id.
  let content: unknown = buildTemplate(template ?? "blank");
  const dbDef = templateDatabase(template ?? "blank");
  if (dbDef) {
    const db = await NotesDatabase.create({
      userId, title: dbDef.title, icon: dbDef.icon,
      properties: dbDef.properties, views: dbDef.views, rows: dbDef.rows,
    });
    const dbId = String(db._id);
    content = (content as { type?: string; props?: Record<string, unknown> }[]).map((b) =>
      b?.type === "database" && b.props?.databaseId === TEMPLATE_DB_SENTINEL
        ? { ...b, props: { ...b.props, databaseId: dbId } }
        : b);
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

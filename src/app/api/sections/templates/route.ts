import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import SectionTemplate from "@/lib/models/section-template";
import User from "@/lib/models/user";
import { SECTIONS } from "@/lib/constants";
import { DEFAULT_CATEGORIES } from "@/lib/calendar";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

export async function GET() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const templates = await SectionTemplate.find({
    $or: [
      { createdBy: userId },
      { createdBy: null },
      { isShared: true, usageCount: { $gte: 3 } },
    ],
  })
    .sort({ usageCount: -1 })
    .lean();

  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const body = await req.json();
  const { name, icon, description, fields, viewType, layoutHtml, calendarCategories: bodyCategories } = body;

  if (!name || typeof name !== "string" || name.trim().length < 1) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  let slug = slugify(name.trim());

  // Prevent collision with built-in sections
  if ((SECTIONS as readonly string[]).includes(slug)) {
    slug = slug + "-custom";
  }

  // Ensure unique slug with clean counter
  let counter = 0;
  const baseSlug = slug;
  while (await SectionTemplate.findOne({ slug })) {
    counter++;
    slug = `${baseSlug}-${counter}`;
  }

  const calendarCategories =
    viewType === "calendar"
      ? Array.isArray(bodyCategories) && bodyCategories.length
        ? bodyCategories
        : DEFAULT_CATEGORIES
      : undefined;

  const doc = {
    name: name.trim(),
    slug,
    icon: icon || "Star",
    description: description || "",
    fields: fields || [],
    viewType: viewType || "weekly-cards",
    layoutHtml: layoutHtml || "",
    calendarCategories,
    isBuiltIn: false,
    createdBy: userId,
    usageCount: 1,
  };

  let template;
  try {
    template = await SectionTemplate.create(doc);
  } catch (err) {
    // Check-then-create race: another request claimed the slug in between.
    // Retry once with a unique suffix.
    const isDuplicate =
      err && typeof err === "object" && (err as { code?: number }).code === 11000;
    if (!isDuplicate) throw err;
    doc.slug = `${slug}-${Date.now().toString(36)}`;
    template = await SectionTemplate.create(doc);
  }

  // Add to user's customSections
  await User.findByIdAndUpdate(userId, {
    $push: { customSections: { templateId: template._id, enabled: true } },
  });

  return NextResponse.json({ template }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import SectionTemplate from "@/lib/models/section-template";
import User from "@/lib/models/user";
import CustomEntry from "@/lib/models/custom-entry";
import { fieldDefSchema, calendarCategoriesUpdateSchema } from "@/lib/validations";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { slug } = await params;
  const template = await SectionTemplate.findOne({
    slug,
    $or: [
      { createdBy: userId },
      { createdBy: null },
      { isShared: true, usageCount: { $gte: 3 } },
    ],
  }).lean();

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { slug } = await params;

  const deleted = await SectionTemplate.findOneAndDelete({
    slug,
    createdBy: userId,
  });

  if (!deleted) {
    return NextResponse.json({ error: "Not found or not owned by you" }, { status: 404 });
  }

  await User.findByIdAndUpdate(userId, { $pull: { customSections: { templateId: deleted._id } } });
  await CustomEntry.deleteMany({ userId, templateId: deleted._id });

  return NextResponse.json({ success: true });
}

const patchTemplateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().max(40).optional(),
  description: z.string().max(200).optional(),
  viewType: z.enum(["weekly-cards", "table", "grid", "board", "calendar"]).optional(),
  fields: z.array(fieldDefSchema).optional(),
  layoutHtml: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = patchTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const update: Record<string, unknown> = { ...parsed.data };

  if (body?.calendarCategories !== undefined) {
    const parsedCategories = calendarCategoriesUpdateSchema.safeParse({
      calendarCategories: body.calendarCategories,
    });
    if (!parsedCategories.success) {
      return NextResponse.json(
        { error: parsedCategories.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    update.calendarCategories = parsedCategories.data.calendarCategories;
  }

  await connectDB();
  const { slug } = await params;
  const template = await SectionTemplate.findOneAndUpdate(
    { slug, createdBy: userId },
    { $set: update },
    { new: true }
  ).lean();

  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  return NextResponse.json({ template });
}

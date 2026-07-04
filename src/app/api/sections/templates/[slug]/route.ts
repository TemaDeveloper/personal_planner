import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import SectionTemplate from "@/lib/models/section-template";
import User from "@/lib/models/user";
import CustomEntry from "@/lib/models/custom-entry";
import { fieldDefSchema, calendarCategoriesUpdateSchema, viewTypeEnum } from "@/lib/validations";
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
      { isShared: true },
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

  const template = await SectionTemplate.findOne({
    slug,
    createdBy: userId,
  });

  if (!template) {
    return NextResponse.json({ error: "Not found or not owned by you" }, { status: 404 });
  }

  await User.findByIdAndUpdate(userId, { $pull: { customSections: { templateId: template._id } } });
  await CustomEntry.deleteMany({ userId, templateId: template._id });

  // If other users have adopted this template, keep the document so their
  // nav and entries aren't stranded — only the owner's data was removed.
  const otherAdopter = await User.exists({
    _id: { $ne: userId },
    "customSections.templateId": template._id,
  });
  if (otherAdopter) {
    return NextResponse.json({
      success: true,
      note: "Removed from your sections. The template itself was kept because other users still use it.",
    });
  }

  await SectionTemplate.deleteOne({ _id: template._id });

  return NextResponse.json({ success: true });
}

const patchTemplateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().max(40).optional(),
  description: z.string().max(200).optional(),
  viewType: viewTypeEnum.optional(),
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

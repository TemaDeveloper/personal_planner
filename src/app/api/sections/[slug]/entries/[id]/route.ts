import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import CustomEntry from "@/lib/models/custom-entry";
import SectionTemplate from "@/lib/models/section-template";
import { validateCalendarEvent } from "@/lib/validations";
import { startOfDay } from "date-fns";
import { Types } from "mongoose";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const deleted = await CustomEntry.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { slug, id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const template = await SectionTemplate.findOne({
    slug,
    $or: [
      { createdBy: userId },
      { createdBy: null },
      { isShared: true, usageCount: { $gte: 3 } },
    ],
  }).lean();
  if (!template) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  let body: { data?: Record<string, unknown>; order?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (template.viewType === "calendar") {
    const result = validateCalendarEvent(body, template.calendarCategories ?? []);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const { title, start, end, allDay, categoryKey, description } = result.value;
    const updated = await CustomEntry.findOneAndUpdate(
      { _id: id, userId },
      { title, start, end, allDay, categoryKey, description, date: startOfDay(start) },
      { new: true }
    ).lean();
    if (!updated) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }
    return NextResponse.json({ entry: updated });
  }

  const entry = await CustomEntry.findOne({ _id: id, userId });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.data !== undefined) {
    entry.data = { ...entry.data, ...body.data };
    entry.markModified("data");
  }
  if (body.order !== undefined) {
    entry.order = body.order;
  }

  await entry.save();

  return NextResponse.json({ entry });
}

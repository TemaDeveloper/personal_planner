import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import SectionTemplate from "@/lib/models/section-template";
import CustomEntry from "@/lib/models/custom-entry";
import { startOfWeek, endOfWeek, startOfDay } from "date-fns";
import { createCustomEntrySchema, validateCalendarEvent } from "@/lib/validations";

export async function GET(
  req: NextRequest,
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
  })
    .select("-embedding -sourcePrompt")
    .lean();
  if (!template) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const weekOf = searchParams.get("weekOf");
  const all = searchParams.get("all") === "1";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let entries;
  if (from && to) {
    // Calendar range: entries whose [start,end] overlap [from,to], or whose
    // date falls in range (for entries lacking explicit start/end).
    const fromDate = new Date(from);
    const toDate = new Date(to);
    entries = await CustomEntry.find({
      userId,
      templateId: template._id,
      $or: [
        { start: { $lte: toDate }, end: { $gte: fromDate } },
        { start: { $exists: false }, date: { $gte: fromDate, $lte: toDate } },
      ],
    })
      .sort({ start: 1, date: 1 })
      .lean();
  } else if (all) {
    entries = await CustomEntry.find({
      userId,
      templateId: template._id,
    })
      .sort({ order: 1, createdAt: -1 })
      .lean();
  } else {
    let start: Date, end: Date;
    if (weekOf) {
      const d = new Date(weekOf);
      start = startOfWeek(d, { weekStartsOn: 1 });
      end = endOfWeek(d, { weekStartsOn: 1 });
    } else {
      start = startOfWeek(new Date(), { weekStartsOn: 1 });
      end = endOfWeek(new Date(), { weekStartsOn: 1 });
    }
    entries = await CustomEntry.find({
      userId,
      templateId: template._id,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: -1 })
      .lean();
  }

  return NextResponse.json({ template, entries });
}

export async function POST(
  req: NextRequest,
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
  })
    .select("-embedding -sourcePrompt")
    .lean();
  if (!template) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const body = await req.json();

  if (template.viewType === "calendar") {
    const result = validateCalendarEvent(body, template.calendarCategories ?? []);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const { title, start, end, allDay, categoryKey, description } = result.value;
    const entry = await CustomEntry.create({
      userId,
      templateId: template._id,
      date: startOfDay(start),
      data: {},
      title,
      start,
      end,
      allDay,
      categoryKey,
      description,
    });
    return NextResponse.json({ entry }, { status: 201 });
  }

  const parsed = createCustomEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { date, data, order } = parsed.data;

  // Parse the incoming yyyy-MM-dd explicitly as UTC midnight so storage
  // doesn't depend on the server's timezone.
  const dateOnly = date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  // Validate data keys against template fields
  const validKeys = new Set(template.fields.map((f) => f.key));
  const cleanData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (validKeys.has(key)) {
      cleanData[key] = value;
    }
  }

  const entry = await CustomEntry.create({
    userId,
    templateId: template._id,
    date: new Date(`${dateOnly}T00:00:00.000Z`),
    data: cleanData,
    ...(typeof order === "number" ? { order } : {}),
  });

  return NextResponse.json({ entry }, { status: 201 });
}

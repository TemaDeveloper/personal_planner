import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import SectionTemplate from "@/lib/models/section-template";
import CustomEntry from "@/lib/models/custom-entry";
import { startOfWeek, endOfWeek, startOfDay } from "date-fns";

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

  const template = await SectionTemplate.findOne({ slug }).lean();
  if (!template) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const weekOf = searchParams.get("weekOf");

  let start: Date, end: Date;
  if (weekOf) {
    const d = new Date(weekOf);
    start = startOfWeek(d, { weekStartsOn: 1 });
    end = endOfWeek(d, { weekStartsOn: 1 });
  } else {
    start = startOfWeek(new Date(), { weekStartsOn: 1 });
    end = endOfWeek(new Date(), { weekStartsOn: 1 });
  }

  const entries = await CustomEntry.find({
    userId,
    templateId: template._id,
    date: { $gte: start, $lte: end },
  })
    .sort({ date: -1 })
    .lean();

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

  const template = await SectionTemplate.findOne({ slug }).lean();
  if (!template) {
    return NextResponse.json({ error: "Section not found" }, { status: 404 });
  }

  const body = await req.json();
  const { date, data } = body;

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
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
    date: startOfDay(new Date(date)),
    data: cleanData,
  });

  return NextResponse.json({ entry }, { status: 201 });
}

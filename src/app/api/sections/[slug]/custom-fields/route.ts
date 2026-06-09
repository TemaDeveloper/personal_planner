import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import SectionCustomization from "@/lib/models/section-customization";
import CustomFieldValue from "@/lib/models/custom-field-value";
import { attendanceDateKey } from "@/lib/gym-date";

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

  const { slug: sectionKey } = await params;
  const dateKey = attendanceDateKey(new Date());

  const customization = await SectionCustomization.findOne({
    userId,
    sectionKey,
  }).lean();

  if (!customization || customization.extraFields.length === 0) {
    return NextResponse.json({ extraFields: [], values: {}, dateKey });
  }

  const fieldDocs = await CustomFieldValue.find({
    userId,
    sectionKey,
    dateKey,
  }).lean();

  const values: Record<string, unknown> = {};
  for (const doc of fieldDocs) {
    values[doc.fieldKey] = doc.value;
  }

  return NextResponse.json({
    extraFields: customization.extraFields,
    values,
    dateKey,
  });
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

  const { slug: sectionKey } = await params;

  if (!sectionKey) {
    return NextResponse.json({ error: "sectionKey is required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { fieldKey, value, dateKey: bodyDateKey } = (body ?? {}) as {
    fieldKey?: string;
    value?: unknown;
    dateKey?: string;
  };

  if (!fieldKey) {
    return NextResponse.json({ error: "fieldKey is required" }, { status: 400 });
  }

  if (bodyDateKey !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(bodyDateKey)) {
    return NextResponse.json({ error: "Invalid dateKey" }, { status: 400 });
  }

  const dateKey = bodyDateKey ?? attendanceDateKey(new Date());

  // Validate that fieldKey exists in the section's extraFields
  const customization = await SectionCustomization.findOne({
    userId,
    sectionKey,
  }).lean();

  if (!customization) {
    return NextResponse.json(
      { error: "No customization found for this section" },
      { status: 404 }
    );
  }

  const fieldExists = customization.extraFields.some((f) => f.key === fieldKey);
  if (!fieldExists) {
    return NextResponse.json(
      { error: `fieldKey "${fieldKey}" not found in section "${sectionKey}"` },
      { status: 400 }
    );
  }

  const saved = await CustomFieldValue.findOneAndUpdate(
    { userId, sectionKey, dateKey, fieldKey },
    { $set: { value } },
    { upsert: true, new: true }
  );

  return NextResponse.json({ saved });
}

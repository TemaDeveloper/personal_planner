import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import CustomEntry from "@/lib/models/custom-entry";
import SectionTemplate from "@/lib/models/section-template";
import { DEFAULT_CURRENCY, SECTIONS, type SectionId } from "@/lib/constants";

// UTC day range from a "yyyy-MM-dd" param, so the window doesn't shift on a
// non-UTC server (entries are stored at UTC midnight).
function utcDayRange(dateParam: string): [Date, Date] | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return null;
  const [y, m, d] = dateParam.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  return [start, end];
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  if (!dateParam) {
    return NextResponse.json({ error: "date parameter required" }, { status: 400 });
  }
  const range = utcDayRange(dateParam);
  if (!range) {
    return NextResponse.json({ error: "date must be yyyy-MM-dd" }, { status: 400 });
  }
  const dateFilter = { $gte: range[0], $lte: range[1] };

  const user = await User.findById(userId).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const enabled = (user.enabledSections as SectionId[] | undefined) ?? [];
  const enabledBuiltinSlugs = (SECTIONS as readonly SectionId[]).filter((s) => enabled.includes(s));

  const customSecs = (user.customSections || []) as { templateId: { toString(): string }; enabled: boolean }[];
  const enabledCustomIds = customSecs.filter((cs) => cs.enabled).map((cs) => cs.templateId);

  // All enabled sections (built-in resolved by slug, custom by id) in one lookup.
  const templates = await SectionTemplate.find({
    $or: [
      { slug: { $in: enabledBuiltinSlugs } },
      { _id: { $in: enabledCustomIds } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any,
  }).lean();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sections: Record<string, any> = {};

  await Promise.all(
    templates.map(async (template) => {
      const entries = await CustomEntry.find({ userId, templateId: template._id, date: dateFilter })
        .sort({ order: 1, createdAt: 1 })
        .lean();
      if (entries.length === 0) return;
      sections[template.slug] = {
        template: {
          name: template.name,
          slug: template.slug,
          icon: template.icon,
          fields: template.fields,
          layoutHtml: template.layoutHtml || "",
        },
        entries: entries.map((e) => ({
          _id: String(e._id),
          date: e.date,
          data: e.data ?? {},
        })),
      };
    })
  );

  const currency = user.preferences?.currency || DEFAULT_CURRENCY;

  return NextResponse.json({ sections, currency });
}

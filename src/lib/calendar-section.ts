import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import SectionTemplate from "@/lib/models/section-template";
import User from "@/lib/models/user";
import { DEFAULT_CATEGORIES, categoriesFromSections, isDefaultCategories } from "@/lib/calendar";
import type { SectionId } from "@/lib/constants";

/** Stable, per-user slug for the default calendar section. */
export function calendarSlugFor(userId: string | Types.ObjectId): string {
  return `calendar-${userId.toString().toLowerCase()}`;
}

type LeanTemplate = {
  _id: Types.ObjectId;
  slug: string;
  name: string;
  icon: string;
};

/**
 * Ensure the given user has their own default "Calendar" section.
 *
 * Idempotent: creates the per-user calendar SectionTemplate (owned by the user, so
 * they can edit its categories) on first call and links it into the user's
 * customSections, then no-ops on subsequent calls. Safe to call on every request.
 * Returns the template (or null if it could not be resolved).
 */
export async function ensureUserCalendar(
  userId: string | Types.ObjectId,
  enabledSections?: SectionId[]
): Promise<LeanTemplate | null> {
  await connectDB();
  const slug = calendarSlugFor(userId);
  // Categories mirror the user's enabled planner sections (Gym, Hobbies, …).
  const seedCategories = enabledSections?.length ? categoriesFromSections(enabledSections) : DEFAULT_CATEGORIES;
  const sel = "_id slug name icon calendarCategories";

  let template = (await SectionTemplate.findOne({ slug }).select(sel).lean()) as
    | (LeanTemplate & { calendarCategories?: { key: string }[] })
    | null;

  if (!template) {
    try {
      const created = await SectionTemplate.create({
        name: "Calendar",
        slug,
        icon: "Calendar",
        description: "Your events and schedule",
        fields: [],
        viewType: "calendar",
        calendarCategories: seedCategories,
        layoutHtml: "",
        isBuiltIn: false,
        createdBy: userId,
        usageCount: 1,
        isShared: false,
      });
      template = { _id: created._id, slug: created.slug, name: created.name, icon: created.icon };
    } catch (err: unknown) {
      // Concurrent request already created it — re-read.
      if (err && typeof err === "object" && (err as { code?: number }).code === 11000) {
        template = (await SectionTemplate.findOne({ slug }).select(sel).lean()) as typeof template;
      } else {
        throw err;
      }
    }
  } else if (enabledSections?.length && isDefaultCategories(template.calendarCategories)) {
    // Migrate an existing calendar that still has the untouched defaults to
    // section-based categories (won't clobber a user who customized them).
    await SectionTemplate.updateOne({ slug }, { $set: { calendarCategories: seedCategories } });
  }

  if (!template) return null;

  // Link into the user's custom sections if not already present.
  const user = (await User.findById(userId).select("customSections").lean()) as
    | { customSections?: { templateId?: { toString(): string } }[] }
    | null;
  const linked = (user?.customSections ?? []).some(
    (cs) => cs.templateId?.toString() === template!._id.toString()
  );
  if (!linked) {
    await User.findByIdAndUpdate(userId, {
      $push: { customSections: { templateId: template._id, enabled: true } },
    });
  }

  return template;
}

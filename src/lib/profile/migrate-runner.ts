import { connectDB } from "@/lib/db";
import SectionTemplate from "@/lib/models/section-template";
import CustomEntry from "@/lib/models/custom-entry";
import User from "@/lib/models/user";
import WorkSession from "@/lib/models/work-session";
import GymAttendance from "@/lib/models/gym-attendance";
import Expense from "@/lib/models/expense";
import { Habit, HabitLog } from "@/lib/models/habit";
import StudySession from "@/lib/models/study-session";
import Homework from "@/lib/models/homework";
import AcademicItem from "@/lib/models/academic-item";
import HobbySession from "@/lib/models/hobby-session";
import HobbyProject from "@/lib/models/hobby-project";
import HouseworkLog from "@/lib/models/housework-log";
import HealthLog from "@/lib/models/health-log";
import Goal from "@/lib/models/goal";
import Book from "@/lib/models/book";
import JournalEntry from "@/lib/models/journal-entry";
import ShoppingList from "@/lib/models/shopping-list";
import MealPlan from "@/lib/models/meal-plan";
import { SECTIONS } from "@/lib/constants";
import {
  buildMigrationInserts,
  MIGRATION_MARKER,
  type MigrationInsert,
} from "@/lib/profile/migrate-run";
import {
  transformWork,
  transformGym,
  transformFinances,
  transformHabits,
  transformStudy,
  transformHobbies,
  transformHousework,
  transformHealth,
  transformGoals,
  transformReading,
  transformJournal,
  transformShopping,
  transformMealprep,
  type OutRow,
  type LegacyRow,
} from "@/lib/profile/migrate-sources";

export interface MigrationReport {
  dryRun: boolean;
  counts: Record<string, number>;
  totalInserts: number;
}

/**
 * Additive, idempotent migration of one user's legacy built-in data into the
 * unified CustomEntry model, under the seed SectionTemplates. Never deletes
 * legacy data. Re-runs skip already-migrated rows (via the __src marker).
 * Pass { dryRun: true } to count without writing.
 */
export async function migrateUserBuiltins(
  userId: string,
  opts: { dryRun?: boolean; resetSections?: string[] } = {}
): Promise<MigrationReport> {
  await connectDB();
  const now = new Date();
  const counts: Record<string, number> = {};

  // Optional reset: drop previously-migrated rows for given sections so they
  // re-migrate cleanly (e.g. after a transform fix). Only touches migrated
  // copies (identified by the __src marker); legacy data is never affected.
  if (!opts.dryRun && opts.resetSections?.length) {
    for (const section of opts.resetSections) {
      await CustomEntry.deleteMany({
        userId,
        "data.__src": { $regex: `^${section}:` },
      });
    }
  }

  // Idempotency: markers already present on this user's CustomEntries.
  const existing = await CustomEntry.find({ userId }).select("data").lean();
  const seen = new Set<string>();
  for (const e of existing) {
    const marker = (e.data as Record<string, unknown> | undefined)?.[MIGRATION_MARKER];
    if (marker) seen.add(String(marker));
  }

  const templates = await SectionTemplate.find({ slug: { $in: SECTIONS } })
    .select("slug")
    .lean();
  const tplBySlug = new Map(templates.map((t) => [t.slug, String(t._id)]));

  // Mongoose's typed lean() results don't carry an index signature; the
  // transforms only read by key, so treat them as loose rows.
  const asRows = (x: unknown): LegacyRow[] => x as LegacyRow[];

  const run = async (sectionId: string, rows: OutRow[]) => {
    const templateId = tplBySlug.get(sectionId);
    if (!templateId) {
      counts[sectionId] = 0;
      return;
    }
    const inserts = buildMigrationInserts(sectionId, templateId, rows, seen);
    counts[sectionId] = inserts.length;
    if (!opts.dryRun && inserts.length) {
      await CustomEntry.insertMany(
        inserts.map((i: MigrationInsert) => ({
          userId,
          templateId: i.templateId,
          date: new Date(i.date),
          data: i.data,
        }))
      );
    }
  };

  // Legacy hourly rates live on the user's job config, not the session rows.
  const userDoc = await User.findById(userId).select("workConfig.jobs").lean();
  const rateByJob = new Map<string, number>();
  for (const job of userDoc?.workConfig?.jobs ?? []) {
    if (job?.name) rateByJob.set(String(job.name), Number(job.hourlyRate) || 0);
  }
  await run("work", transformWork(asRows(await WorkSession.find({ userId }).lean()), now, rateByJob));
  await run("gym", transformGym(asRows(await GymAttendance.find({ userId }).lean()), now));
  await run("finances", transformFinances(asRows(await Expense.find({ userId }).lean()), now));

  const habitDefs = await Habit.find({ userId }).select("name").lean();
  const habitNames = new Map(habitDefs.map((h) => [String(h._id), h.name]));
  await run("habits", transformHabits(asRows(await HabitLog.find({ userId }).lean()), habitNames, now));

  await run(
    "study",
    transformStudy(
      {
        academic: asRows(await AcademicItem.find({ userId }).lean()),
        sessions: asRows(await StudySession.find({ userId }).lean()),
        homework: asRows(await Homework.find({ userId }).lean()),
      },
      now
    )
  );
  await run(
    "hobbies",
    transformHobbies(
      {
        sessions: asRows(await HobbySession.find({ userId }).lean()),
        projects: asRows(await HobbyProject.find({ userId }).lean()),
      },
      now
    )
  );
  await run("housework", transformHousework(asRows(await HouseworkLog.find({ userId }).lean()), now));
  await run("health", transformHealth(asRows(await HealthLog.find({ userId }).lean()), now));
  await run("goals", transformGoals(asRows(await Goal.find({ userId }).lean()), now));
  await run("reading", transformReading(asRows(await Book.find({ userId }).lean()), now));
  await run("journal", transformJournal(asRows(await JournalEntry.find({ userId }).lean()), now));
  await run("shopping", transformShopping(asRows(await ShoppingList.find({ userId }).lean()), now));
  await run("mealprep", transformMealprep(asRows(await MealPlan.find({ userId }).lean()), now));

  const totalInserts = Object.values(counts).reduce((s, n) => s + n, 0);
  return { dryRun: Boolean(opts.dryRun), counts, totalInserts };
}

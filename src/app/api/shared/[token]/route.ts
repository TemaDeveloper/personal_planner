import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import WorkSession from "@/lib/models/work-session";
import GymAttendance from "@/lib/models/gym-attendance";
import { Habit, HabitLog } from "@/lib/models/habit";
import StudySession from "@/lib/models/study-session";
import HobbySession from "@/lib/models/hobby-session";
import HouseworkLog from "@/lib/models/housework-log";
import HealthLog from "@/lib/models/health-log";
import Goal from "@/lib/models/goal";
import Book from "@/lib/models/book";
import JournalEntry from "@/lib/models/journal-entry";
import Expense from "@/lib/models/expense";
import ShoppingList from "@/lib/models/shopping-list";
import MealPlan from "@/lib/models/meal-plan";
import CustomEntry from "@/lib/models/custom-entry";
import SectionTemplate from "@/lib/models/section-template";
import User from "@/lib/models/user";
import ShareToken from "@/lib/models/share-token";
import Route from "@/lib/models/route";
import { buildMonthlyWorkReports } from "@/lib/work-report";
import { flattenEntryValue } from "@/lib/export-builders";
import { format } from "date-fns";

export interface WorkShareJobBreakdown {
  jobName: string;
  hours: number;
  rate: number;
  total: number;
}

export interface WorkShareSessionRow {
  jobName: string;
  date: Date | string;
  hours: number;
  note: string;
  total: number;
}

export interface WorkShareMonthSummary {
  /** Sortable "YYYY-MM" key, newest first. */
  monthKey: string;
  monthLabel: string;
  grossEarnings: number;
  gasCost: number;
  net: number;
  totalKm: number;
  litres: number;
  byJob: WorkShareJobBreakdown[];
  rows: WorkShareSessionRow[];
}

/**
 * Live-data path: every section (built-ins included) is a SectionTemplate whose
 * slug equals the section id, with rows stored as CustomEntry. Flattens
 * `entry.data` into display-labeled top-level columns so the viewer renders
 * readable cells, never nested objects. Returns null when the owner has no
 * template for the slug (caller falls back to legacy models).
 */
async function fetchTemplateData(
  slug: string,
  ownerId: string,
  scopeFilter: string | null
): Promise<{ data: Record<string, unknown>[]; entryCount: number } | null> {
  const template = await SectionTemplate.findOne({ slug }).lean();
  if (!template) return null;

  let entries = await CustomEntry.find({
    userId: ownerId,
    templateId: template._id,
  })
    .sort({ date: -1 })
    .lean();

  // Scoped shares (work "job" filter) apply against the entry data.
  if (scopeFilter && template.fields.some((f) => f.key === "job" || f.key === "jobName")) {
    entries = entries.filter((e) => {
      const data = (e.data ?? {}) as Record<string, unknown>;
      return data.job === scopeFilter || data.jobName === scopeFilter;
    });
  }

  const data = entries.map((e) => {
    const entryData = (e.data ?? {}) as Record<string, unknown>;
    const row: Record<string, unknown> = { Date: e.date };
    for (const f of template.fields) {
      row[f.label] = entryData[f.key] !== undefined ? flattenEntryValue(entryData[f.key]) : "";
    }
    return row;
  });

  return { data, entryCount: entries.length };
}

/** Legacy-model queries — kept only so pre-migration data still shares. */
async function fetchLegacySectionData(
  sectionType: string,
  ownerId: string,
  scopeFilter: string | null
): Promise<{
  data: unknown[];
  meta?: Record<string, unknown>;
  monthlySummaries?: WorkShareMonthSummary[] | null;
  routes?: Record<string, unknown>[] | null;
}> {
  switch (sectionType) {
    case "work": {
      const [sessions, routeDocs, owner] = await Promise.all([
        WorkSession.find({
          userId: ownerId,
          ...(scopeFilter ? { jobName: scopeFilter } : {}),
        })
          .sort({ date: -1 })
          .lean(),
        // Routes are not job-linked, but are still attributed to whichever
        // calendar month they fall in for the per-month gas deduction.
        Route.find({ userId: ownerId }).sort({ date: -1 }).lean(),
        User.findById(ownerId).select("workConfig").lean(),
      ]);

      const workConfig = owner?.workConfig;
      // One fully independent report per calendar month — a multi-month share
      // must show separate, self-contained monthly cards (e.g. for invoicing),
      // never a single all-time total.
      const monthlyReports = buildMonthlyWorkReports({
        sessions: sessions.map((s) => ({
          jobName: s.jobName,
          date: s.date,
          hours: s.hours,
          note: s.note ?? "",
        })),
        jobs: workConfig?.jobs ?? [],
        routes: routeDocs.map((r) => ({
          date: r.date,
          origin: r.origin,
          destination: r.destination,
          distanceKm: r.distanceKm,
        })),
        gasPriceCentsPerLitre: workConfig?.gasPrice ?? 0,
        carConsumptionLPer100km: workConfig?.carConsumption ?? 0,
      });

      // Display-keyed rows so the viewer shows readable headers and the Total column.
      const data = monthlyReports.flatMap((m) =>
        m.rows.map((r) => ({
          "Job Name": r.jobName,
          Date: r.date,
          Hours: r.hours,
          Note: r.note,
          Total: r.total,
        }))
      );

      const routes = monthlyReports.flatMap((m) =>
        m.routeRows.map((r) => ({
          Date: r.date,
          Origin: r.origin,
          Destination: r.destination,
          "Distance (km)": r.distanceKm,
        }))
      );

      const monthlySummaries: WorkShareMonthSummary[] = monthlyReports.map((m) => {
        const [year, month] = m.monthKey.split("-").map(Number);
        return {
          monthKey: m.monthKey,
          monthLabel: format(new Date(year, month - 1, 1), "MMMM yyyy"),
          grossEarnings: m.grossEarnings,
          gasCost: m.gas.totalCostDollars,
          net: m.net,
          totalKm: m.gas.totalKm,
          litres: m.gas.litresUsed,
          byJob: m.byJob,
          rows: m.rows.map((r) => ({
            jobName: r.jobName,
            date: r.date,
            hours: r.hours,
            note: r.note,
            total: r.total,
          })),
        };
      });

      return {
        data,
        monthlySummaries,
        routes,
      };
    }
    case "gym": {
      const data = await GymAttendance.find({ userId: ownerId })
        .sort({ date: -1 })
        .lean();
      return { data };
    }
    case "habits": {
      const habits = await Habit.find({ userId: ownerId, active: true }).lean();
      const habitIds = habits.map((h) => h._id);
      const habitMap = new Map(habits.map((h) => [String(h._id), h.name as string]));
      const logs = await HabitLog.find({ habitId: { $in: habitIds } })
        .sort({ date: -1 })
        .lean();
      // Project to readable rows so the viewer shows habit names, not ObjectIds
      const data = logs.map((l) => ({
        date: l.date,
        habit: habitMap.get(String(l.habitId)) ?? "Unknown",
        completed: "Yes",
      }));
      return { data, meta: { habits } };
    }
    case "study": {
      const data = await StudySession.find({ userId: ownerId })
        .sort({ date: -1 })
        .lean();
      return { data };
    }
    case "hobbies": {
      const data = await HobbySession.find({ userId: ownerId })
        .sort({ date: -1 })
        .lean();
      return { data };
    }
    case "housework": {
      const data = await HouseworkLog.find({ userId: ownerId })
        .sort({ date: -1 })
        .lean();
      return { data };
    }
    case "health": {
      const data = await HealthLog.find({ userId: ownerId })
        .sort({ date: -1 })
        .lean();
      return { data };
    }
    case "goals": {
      const data = await Goal.find({ userId: ownerId }).lean();
      return { data };
    }
    case "reading": {
      const data = await Book.find({ userId: ownerId }).lean();
      return { data };
    }
    case "journal": {
      const data = await JournalEntry.find({ userId: ownerId })
        .sort({ date: -1 })
        .lean();
      return { data };
    }
    case "finances": {
      const data = await Expense.find({ userId: ownerId })
        .sort({ date: -1 })
        .lean();
      return { data };
    }
    case "shopping": {
      const data = await ShoppingList.find({ userId: ownerId })
        .sort({ updatedAt: -1 })
        .lean();
      return { data };
    }
    case "mealprep": {
      const data = await MealPlan.find({ userId: ownerId })
        .sort({ date: -1 })
        .lean();
      return { data };
    }
    default: {
      return { data: [] };
    }
  }
}

async function fetchSectionData(
  sectionType: string,
  ownerId: string,
  scopeFilter: string | null
): Promise<{
  data: unknown[];
  meta?: Record<string, unknown>;
  monthlySummaries?: WorkShareMonthSummary[] | null;
  routes?: Record<string, unknown>[] | null;
}> {
  // Custom sections only ever lived in the template system.
  if (sectionType.startsWith("custom:")) {
    const live = await fetchTemplateData(sectionType.slice(7), ownerId, scopeFilter);
    return { data: live?.data ?? [] };
  }

  // Built-in sections migrated to SectionTemplate + CustomEntry too. Prefer
  // live data; fall back to the legacy models only when the owner has no
  // template for the slug or zero entries (pre-migration data).
  const live = await fetchTemplateData(sectionType, ownerId, scopeFilter);
  if (live && live.entryCount > 0) return { data: live.data };

  return fetchLegacySectionData(sectionType, ownerId, scopeFilter);
}

/** Masks an email for the restricted-share message: "a•••@company.com". */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  return `${local.slice(0, 1)}•••@${domain}`;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  await connectDB();
  const { token } = await params;
  const share = await ShareToken.findOne({ token }).lean();
  if (!share) return NextResponse.json({ error: "Share not found" }, { status: 404 });
  if (share.revokedAt) return NextResponse.json({ error: "This share has been revoked" }, { status: 410 });
  if (share.expiresAt && new Date(share.expiresAt) < new Date())
    return NextResponse.json({ error: "This share has expired" }, { status: 410 });

  // "Specific email" shares require a signed-in account matching the invitee.
  if (share.inviteeEmail) {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase();
    if (!email || email !== share.inviteeEmail.toLowerCase()) {
      return NextResponse.json(
        {
          error: `This share is restricted to a specific account — sign in as ${maskEmail(share.inviteeEmail)} to view it`,
        },
        { status: 403 }
      );
    }
  }

  const owner = await User.findById(share.ownerId).select("name email").lean();
  const { data, monthlySummaries, routes } = await fetchSectionData(
    share.sectionType,
    String(share.ownerId),
    share.scopeFilter ?? null
  );

  return NextResponse.json({
    sectionType: share.sectionType,
    scopeFilter: share.scopeFilter,
    ownerName: (owner?.name as string) || "Unknown",
    permission: share.permission,
    data: stripInternalFields(data),
    monthlySummaries: monthlySummaries ?? null,
    routes: routes ?? null,
  });
}

// Internal/identifying fields that must never leave the server in a public share.
const INTERNAL_FIELDS = new Set([
  "_id",
  "__v",
  "userId",
  "ownerId",
  "templateId",
  "habitId",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    (value.constructor === Object || value.constructor === undefined)
  );
}

/** Strips internal keys at every depth — nested arrays/objects included. */
function stripValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripValue);
  if (isPlainObject(value)) {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (!INTERNAL_FIELDS.has(key)) clean[key] = stripValue(val);
    }
    return clean;
  }
  return value;
}

function stripInternalFields(data: unknown[]): Record<string, unknown>[] {
  return data.map((row) => {
    if (!row || typeof row !== "object") return { value: row };
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      if (!INTERNAL_FIELDS.has(key)) clean[key] = stripValue(value);
    }
    return clean;
  });
}

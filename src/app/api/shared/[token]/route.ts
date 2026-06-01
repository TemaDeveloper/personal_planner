import { NextRequest, NextResponse } from "next/server";
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
import { buildWorkReport } from "@/lib/work-report";

export interface WorkShareSummary {
  grossEarnings: number;
  gasCost: number;
  net: number;
  totalKm: number;
  litres: number;
}

async function fetchSectionData(
  sectionType: string,
  ownerId: string,
  scopeFilter: string | null
): Promise<{
  data: unknown[];
  meta?: Record<string, unknown>;
  summary?: WorkShareSummary | null;
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
        // Routes are not job-linked: gas reflects all routes for all time.
        Route.find({ userId: ownerId }).sort({ date: -1 }).lean(),
        User.findById(ownerId).select("workConfig").lean(),
      ]);

      const workConfig = owner?.workConfig;
      const report = buildWorkReport({
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
      const data = report.rows.map((r) => ({
        "Job Name": r.jobName,
        Date: r.date,
        Hours: r.hours,
        Note: r.note,
        Total: r.total,
      }));

      const routes = report.routeRows.map((r) => ({
        Date: r.date,
        Origin: r.origin,
        Destination: r.destination,
        "Distance (km)": r.distanceKm,
      }));

      return {
        data,
        summary: {
          grossEarnings: report.grossEarnings,
          gasCost: report.gas.totalCostDollars,
          net: report.net,
          totalKm: report.gas.totalKm,
          litres: report.gas.litresUsed,
        },
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
      if (sectionType.startsWith("custom:")) {
        const slug = sectionType.slice(7);
        const template = await SectionTemplate.findOne({ slug }).lean();
        if (!template) return { data: [] };
        const entries = await CustomEntry.find({
          userId: ownerId,
          templateId: template._id,
        })
          .sort({ date: -1 })
          .lean();
        return { data: entries, meta: { template } };
      }
      return { data: [] };
    }
  }
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

  const owner = await User.findById(share.ownerId).select("name email").lean();
  const { data, summary, routes } = await fetchSectionData(
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
    summary: summary ?? null,
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

function stripInternalFields(data: unknown[]): Record<string, unknown>[] {
  return data.map((row) => {
    if (!row || typeof row !== "object") return { value: row };
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      if (!INTERNAL_FIELDS.has(key)) clean[key] = value;
    }
    return clean;
  });
}

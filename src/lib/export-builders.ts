import { format } from "date-fns";
import { ExcelColumn, ExcelOptions } from "@/lib/excel";
import { buildWorkReport } from "@/lib/work-report";
import User from "@/lib/models/user";
import Route from "@/lib/models/route";
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

export function fmtDate(d: unknown): string {
  if (!d) return "";
  try {
    return format(new Date(d as string), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

/**
 * Flattens a CustomEntry data value into something renderable in a table cell.
 * Arrays of objects (e.g. milestones/items) become readable joined strings —
 * never "[object Object]" or raw JSON.
 */
export function flattenEntryValue(val: unknown): string | number | boolean {
  if (val === null || val === undefined) return "";
  if (typeof val === "number" || typeof val === "boolean") return val;
  if (typeof val === "string") return val;
  if (val instanceof Date) return fmtDate(val);
  if (Array.isArray(val)) {
    return val
      .map((v) => String(flattenEntryValue(v)))
      .filter((s) => s !== "")
      .join(", ");
  }
  if (typeof val === "object") {
    return Object.entries(val as Record<string, unknown>)
      .filter(([k, v]) => k !== "_id" && k !== "userId" && v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${k}: ${flattenEntryValue(v)}`)
      .join(", ");
  }
  return String(val);
}

export interface BuiltExport {
  name: string;
  columns: ExcelColumn[];
  rows: Record<string, unknown>[];
  options?: ExcelOptions;
}

/**
 * Live-data export: SectionTemplate + CustomEntry. This is the source of
 * truth for all sections post-migration (built-ins included — their template
 * slug equals the section id). Returns null when the user has no template
 * for the slug, so callers can fall back to the legacy models.
 */
async function buildTemplateExport(
  slug: string,
  userId: string,
  job?: string
): Promise<(BuiltExport & { entryCount: number }) | null> {
  const template = await SectionTemplate.findOne({ slug }).lean();
  if (!template) return null;

  let entries = await CustomEntry.find({
    userId,
    templateId: template._id,
  })
    .sort({ date: -1 })
    .lean();

  // Scoped shares/exports (work "job" filter) apply against the entry data.
  if (job && template.fields.some((f) => f.key === "job" || f.key === "jobName")) {
    entries = entries.filter((e) => {
      const data = (e.data ?? {}) as Record<string, unknown>;
      return data.job === job || data.jobName === job;
    });
  }

  const columns: ExcelColumn[] = [
    { header: "Date", key: "date" },
    ...template.fields.map((f) => ({ header: f.label, key: f.key })),
  ];

  const rows = entries.map((e) => {
    const doc = e as unknown as Record<string, unknown>;
    const data = (doc.data ?? {}) as Record<string, unknown>;
    const row: Record<string, unknown> = { date: fmtDate(doc.date) };
    for (const f of template.fields) {
      row[f.key] = data[f.key] !== undefined ? flattenEntryValue(data[f.key]) : "";
    }
    return row;
  });

  return { name: template.name, columns, rows, entryCount: entries.length };
}

export async function buildExport(
  section: string,
  userId: string,
  job?: string
): Promise<BuiltExport> {
  // Custom sections only ever lived in the template system.
  if (section.startsWith("custom:")) {
    const slug = section.slice("custom:".length);
    const live = await buildTemplateExport(slug, userId, job);
    if (!live) return { name: "Unknown", columns: [], rows: [] };
    return { name: live.name, columns: live.columns, rows: live.rows };
  }

  // Built-in sections migrated to SectionTemplate + CustomEntry too. Prefer
  // live data; fall back to the legacy models only when the user has no
  // template for the slug or zero entries (pre-migration data).
  const live = await buildTemplateExport(section, userId, job);
  if (live && live.entryCount > 0) {
    return { name: live.name, columns: live.columns, rows: live.rows };
  }

  switch (section) {
    case "work": {
      const filter: Record<string, unknown> = { userId };
      if (job) filter.jobName = job;
      const [docs, routes, user] = await Promise.all([
        WorkSession.find(filter).sort({ date: -1 }).lean(),
        // Routes are not job-linked, so gas always reflects all routes for all time.
        Route.find({ userId }).sort({ date: -1 }).lean(),
        User.findById(userId).select("workConfig").lean(),
      ]);

      const workConfig = user?.workConfig;
      const report = buildWorkReport({
        sessions: docs.map((d) => ({
          jobName: d.jobName,
          date: d.date,
          hours: d.hours,
          note: d.note ?? "",
        })),
        jobs: workConfig?.jobs ?? [],
        routes: routes.map((r) => ({
          date: r.date,
          origin: r.origin,
          destination: r.destination,
          distanceKm: r.distanceKm,
        })),
        gasPriceCentsPerLitre: workConfig?.gasPrice ?? 0,
        carConsumptionLPer100km: workConfig?.carConsumption ?? 0,
      });

      const routeSection = {
        title: "Gas & Routes — all routes, all time",
        columns: [
          { header: "Date", key: "date" },
          { header: "Origin", key: "origin" },
          { header: "Destination", key: "destination" },
          { header: "Distance (km)", key: "distanceKm" },
        ] as ExcelColumn[],
        rows: report.routeRows.map((r) => ({
          date: fmtDate(r.date),
          origin: r.origin,
          destination: r.destination,
          distanceKm: r.distanceKm,
        })),
      };

      return {
        name: "Work Sessions",
        columns: [
          { header: "Job Name", key: "job" },
          { header: "Date", key: "date" },
          { header: "Hours", key: "hours" },
          { header: "Note", key: "note" },
          { header: "Total", key: "total" },
        ],
        rows: report.rows.map((r) => ({
          job: r.jobName,
          date: fmtDate(r.date),
          hours: r.hours,
          note: r.note,
          total: r.total,
        })),
        options: {
          summaryRows: [
            { label: "Gross earnings", value: report.grossEarnings, currency: true },
            { label: "Gas cost", value: report.gas.totalCostDollars, currency: true },
            { label: "Net (earnings − gas)", value: report.net, currency: true },
            { label: "Total distance (km)", value: report.gas.totalKm },
            { label: "Litres used", value: report.gas.litresUsed },
          ],
          sections: [routeSection],
        },
      };
    }

    case "gym": {
      const docs = await GymAttendance.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Gym Attendance",
        columns: [
          { header: "Date", key: "date" },
          { header: "Attended", key: "attended" },
        ],
        rows: docs.map((d) => ({
          date: fmtDate(d.date),
          attended: "Yes",
        })),
      };
    }

    case "habits": {
      const habits = await Habit.find({ userId, active: true }).lean();
      const logs = await HabitLog.find({ userId }).sort({ date: -1 }).lean();
      const habitMap = new Map(habits.map((h) => [h._id.toString(), h.name]));
      return {
        name: "Habits",
        columns: [
          { header: "Date", key: "date" },
          { header: "Habit", key: "habit" },
          { header: "Completed", key: "completed" },
        ],
        rows: logs.map((l) => ({
          date: fmtDate(l.date),
          habit: habitMap.get(l.habitId.toString()) ?? l.habitId.toString(),
          completed: "Yes",
        })),
      };
    }

    case "study": {
      const docs = await StudySession.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Study Sessions",
        columns: [
          { header: "Date", key: "date" },
          { header: "Subject", key: "subject" },
          { header: "Hours", key: "hours" },
          { header: "Notes", key: "notes" },
        ],
        rows: docs.map((d) => {
          const doc = d as unknown as Record<string, unknown>;
          return {
            date: fmtDate(doc.date),
            subject: doc.subject,
            hours: typeof doc.minutes === "number" ? doc.minutes / 60 : "",
            notes: doc.note ?? "",
          };
        }),
      };
    }

    case "hobbies": {
      const docs = await HobbySession.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Hobby Sessions",
        columns: [
          { header: "Date", key: "date" },
          { header: "Hobby", key: "hobby" },
          { header: "Hours", key: "hours" },
          { header: "Notes", key: "notes" },
        ],
        rows: docs.map((d) => {
          const doc = d as unknown as Record<string, unknown>;
          return {
            date: fmtDate(doc.date),
            hobby: doc.hobby,
            hours: typeof doc.minutes === "number" ? doc.minutes / 60 : "",
            notes: doc.note ?? "",
          };
        }),
      };
    }

    case "housework": {
      const docs = await HouseworkLog.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Housework",
        columns: [
          { header: "Date", key: "date" },
          { header: "Chore", key: "chore" },
          { header: "Completed", key: "completed" },
        ],
        rows: docs.map((d) => {
          const doc = d as unknown as Record<string, unknown>;
          return {
            date: fmtDate(doc.date),
            chore: doc.choreName,
            completed: doc.completed ? "Yes" : "No",
          };
        }),
      };
    }

    case "health": {
      const docs = await HealthLog.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Health Logs",
        columns: [
          { header: "Date", key: "date" },
          { header: "Water", key: "water" },
          { header: "Sleep", key: "sleep" },
          { header: "Weight", key: "weight" },
          { header: "Mood", key: "mood" },
        ],
        rows: docs.map((d) => {
          const doc = d as unknown as Record<string, unknown>;
          return {
            date: fmtDate(doc.date),
            water: doc.water,
            sleep: doc.sleepHours,
            weight: doc.weight ?? "",
            mood: doc.mood,
          };
        }),
      };
    }

    case "goals": {
      const docs = await Goal.find({ userId }).sort({ createdAt: -1 }).lean();
      return {
        name: "Goals",
        columns: [
          { header: "Name", key: "name" },
          { header: "Target Date", key: "targetDate" },
          { header: "Progress", key: "progress" },
          { header: "Status", key: "status" },
        ],
        rows: docs.map((d) => {
          const doc = d as unknown as Record<string, unknown>;
          return {
            name: doc.title,
            targetDate: fmtDate(doc.targetDate),
            progress: doc.progress,
            status: doc.status,
          };
        }),
      };
    }

    case "reading": {
      const docs = await Book.find({ userId }).sort({ createdAt: -1 }).lean();
      return {
        name: "Reading",
        columns: [
          { header: "Title", key: "title" },
          { header: "Author", key: "author" },
          { header: "Pages", key: "pages" },
          { header: "Status", key: "status" },
        ],
        rows: docs.map((d) => {
          const doc = d as unknown as Record<string, unknown>;
          return {
            title: doc.title,
            author: doc.author ?? "",
            pages: doc.totalPages,
            status: doc.status,
          };
        }),
      };
    }

    case "journal": {
      const docs = await JournalEntry.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Journal",
        columns: [
          { header: "Date", key: "date" },
          { header: "Mood", key: "mood" },
          { header: "Content", key: "content" },
        ],
        rows: docs.map((d) => {
          const doc = d as unknown as Record<string, unknown>;
          return {
            date: fmtDate(doc.date),
            mood: doc.mood,
            content: doc.content,
          };
        }),
      };
    }

    case "finances": {
      const docs = await Expense.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Finances",
        columns: [
          { header: "Date", key: "date" },
          { header: "Category", key: "category" },
          { header: "Amount", key: "amount" },
          { header: "Note", key: "note" },
        ],
        rows: docs.map((d) => {
          const doc = d as unknown as Record<string, unknown>;
          return {
            date: fmtDate(doc.date),
            category: doc.category,
            amount: doc.amount,
            note: doc.description ?? doc.note ?? "",
          };
        }),
      };
    }

    case "shopping": {
      const docs = await ShoppingList.find({ userId }).sort({ createdAt: -1 }).lean();
      return {
        name: "Shopping",
        columns: [
          { header: "Name", key: "name" },
          { header: "Items", key: "items" },
        ],
        rows: docs.map((d) => {
          const doc = d as unknown as Record<string, unknown>;
          const items = Array.isArray(doc.items)
            ? (doc.items as Array<{ name: string }>).map((i) => i.name).join(", ")
            : "";
          return {
            name: doc.name,
            items,
          };
        }),
      };
    }

    case "mealprep": {
      const docs = await MealPlan.find({ userId }).sort({ date: -1 }).lean();
      return {
        name: "Meal Prep",
        columns: [
          { header: "Date", key: "date" },
          { header: "Meals", key: "meals" },
        ],
        rows: docs.map((d) => {
          const doc = d as unknown as Record<string, unknown>;
          return {
            date: fmtDate(doc.date),
            meals: flattenEntryValue(doc.meals),
          };
        }),
      };
    }

    default: {
      // No legacy model for this slug — the template path (if any) already ran.
      if (live) return { name: live.name, columns: live.columns, rows: live.rows };
      return { name: "Unknown", columns: [], rows: [] };
    }
  }
}

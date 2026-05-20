import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import { generateExcel, ExcelColumn } from "@/lib/excel";
import { format } from "date-fns";
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

function fmtDate(d: unknown): string {
  if (!d) return "";
  try {
    return format(new Date(d as string), "yyyy-MM-dd");
  } catch {
    return "";
  }
}

async function buildExport(
  section: string,
  userId: string,
  job?: string
): Promise<{ name: string; columns: ExcelColumn[]; rows: Record<string, unknown>[] }> {
  switch (section) {
    case "work": {
      const filter: Record<string, unknown> = { userId };
      if (job) filter.jobName = job;
      const docs = await WorkSession.find(filter).sort({ date: -1 }).lean();
      return {
        name: "Work Sessions",
        columns: [
          { header: "Date", key: "date" },
          { header: "Job", key: "job" },
          { header: "Hours", key: "hours" },
          { header: "Note", key: "note" },
        ],
        rows: docs.map((d) => ({
          date: fmtDate(d.date),
          job: d.jobName,
          hours: d.hours,
          note: d.note ?? "",
        })),
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
            meals: JSON.stringify(doc.meals),
          };
        }),
      };
    }

    default: {
      if (section.startsWith("custom:")) {
        const slug = section.slice("custom:".length);
        const template = await SectionTemplate.findOne({ slug }).lean();
        if (!template) {
          return { name: "Unknown", columns: [], rows: [] };
        }
        const entries = await CustomEntry.find({
          userId,
          templateId: template._id,
        })
          .sort({ date: -1 })
          .lean();

        const columns: ExcelColumn[] = [
          { header: "Date", key: "date" },
          ...template.fields.map((f) => ({ header: f.label, key: f.key })),
        ];

        const rows = entries.map((e) => {
          const doc = e as unknown as Record<string, unknown>;
          const data = (doc.data ?? {}) as Record<string, unknown>;
          const row: Record<string, unknown> = { date: fmtDate(doc.date) };
          for (const f of template.fields) {
            row[f.key] = data[f.key] ?? "";
          }
          return row;
        });

        return { name: template.name, columns, rows };
      }

      return { name: "Unknown", columns: [], rows: [] };
    }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ section: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { section } = await params;
  const { searchParams } = new URL(req.url);
  const job = searchParams.get("job") || undefined;

  const { name, columns, rows } = await buildExport(section, String(userId), job);
  if (columns.length === 0) {
    return NextResponse.json({ error: "Unknown section" }, { status: 400 });
  }

  const buffer = await generateExcel(name, columns, rows);
  const filename = `${name.toLowerCase().replace(/\s+/g, "-")}-export.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

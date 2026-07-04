import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import WorkSession from "@/lib/models/work-session";
import GymAttendance from "@/lib/models/gym-attendance";
import Expense from "@/lib/models/expense";
import Route from "@/lib/models/route";
import StudySession from "@/lib/models/study-session";
import HobbySession from "@/lib/models/hobby-session";
import HouseworkLog from "@/lib/models/housework-log";
import HealthLog from "@/lib/models/health-log";
import Goal from "@/lib/models/goal";
import Book from "@/lib/models/book";
import JournalEntry from "@/lib/models/journal-entry";
import ShoppingList from "@/lib/models/shopping-list";
import MealPlan from "@/lib/models/meal-plan";
import CustomEntry from "@/lib/models/custom-entry";
import SectionTemplate from "@/lib/models/section-template";
import { generateCSV } from "@/lib/csv";
import { flattenEntryValue, fmtDate } from "@/lib/export-builders";

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const dateFilter: Record<string, Date> = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  let csv = "";
  let filename = "";

  // Sections (built-ins included) migrated to SectionTemplate + CustomEntry.
  // Prefer live data; fall through to the legacy-model switch only when the
  // user has no template for the slug or zero entries (pre-migration data).
  const slug = type?.startsWith("custom:") ? type.slice("custom:".length) : type;
  const template = slug ? await SectionTemplate.findOne({ slug }).lean() : null;
  if (template) {
    const entries = await CustomEntry.find({
      userId,
      templateId: template._id,
      ...(hasDateFilter ? { date: dateFilter } : {}),
    })
      .sort({ date: -1 })
      .lean();
    // Custom sections have no legacy fallback — always answer from the template
    // (headers-only CSV when empty). Built-ins fall through when empty.
    if (entries.length > 0 || type?.startsWith("custom:")) {
      csv = generateCSV(
        ["Date", ...template.fields.map((f) => f.label)],
        entries.map((e) => {
          const data = (e.data ?? {}) as Record<string, unknown>;
          return [
            fmtDate(e.date),
            ...template.fields.map((f) =>
              data[f.key] !== undefined ? String(flattenEntryValue(data[f.key])) : ""
            ),
          ];
        })
      );
      const filenameSlug = String(slug).replace(/[^a-z0-9-]/gi, "-");
      filename = `${filenameSlug}-${new Date().toISOString().split("T")[0]}.csv`;
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }
  }

  switch (type) {
    case "work": {
      const sessions = await WorkSession.find({
        userId,
        ...(hasDateFilter ? { date: dateFilter } : {}),
      }).sort({ date: -1 });

      csv = generateCSV(
        ["Date", "Job", "Hours", "Note"],
        sessions.map((s) => [
          s.date.toISOString().split("T")[0],
          s.jobName,
          s.hours.toString(),
          s.note || "",
        ])
      );
      filename = `work-sessions-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "gym": {
      const records = await GymAttendance.find({
        userId,
        ...(hasDateFilter ? { date: dateFilter } : {}),
      }).sort({ date: -1 });

      csv = generateCSV(
        ["Date"],
        records.map((r) => [r.date.toISOString().split("T")[0]])
      );
      filename = `gym-attendance-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "expenses": {
      const expenses = await Expense.find({
        userId,
        ...(hasDateFilter ? { date: dateFilter } : {}),
      }).sort({ date: -1 });

      csv = generateCSV(
        ["Date", "Amount", "Currency", "Description", "Category", "Reimbursed"],
        expenses.map((e) => [
          e.date.toISOString().split("T")[0],
          e.amount.toFixed(2),
          e.currency,
          e.description,
          e.category,
          e.reimbursed ? "Yes" : "No",
        ])
      );
      filename = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "routes": {
      const routes = await Route.find({
        userId,
        ...(hasDateFilter ? { date: dateFilter } : {}),
      }).sort({ date: -1 });

      csv = generateCSV(
        ["Date", "Origin", "Destination", "Distance (km)", "Note"],
        routes.map((r) => [
          r.date.toISOString().split("T")[0],
          r.origin,
          r.destination,
          r.distanceKm.toFixed(1),
          r.note || "",
        ])
      );
      filename = `routes-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "study": {
      const studySessions = await StudySession.find({
        userId,
        ...(hasDateFilter ? { date: dateFilter } : {}),
      }).sort({ date: -1 });

      csv = generateCSV(
        ["Date", "Subject", "Minutes", "Note"],
        studySessions.map((s) => [
          s.date.toISOString().split("T")[0],
          s.subject,
          s.minutes.toString(),
          s.note || "",
        ])
      );
      filename = `study-sessions-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "hobbies": {
      const sessions = await HobbySession.find({
        userId,
        ...(hasDateFilter ? { date: dateFilter } : {}),
      }).sort({ date: -1 });
      csv = generateCSV(
        ["Date", "Hobby", "Minutes", "Note"],
        sessions.map((s) => [
          s.date.toISOString().split("T")[0],
          s.hobby,
          s.minutes.toString(),
          s.note || "",
        ])
      );
      filename = `hobby-sessions-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "housework": {
      const logs = await HouseworkLog.find({
        userId,
        ...(hasDateFilter ? { date: dateFilter } : {}),
      }).sort({ date: -1 });
      csv = generateCSV(
        ["Date", "Task", "Recurring", "Completed"],
        logs.map((l) => [
          l.date.toISOString().split("T")[0],
          l.choreName,
          l.isRecurring ? "Yes" : "No",
          l.completed ? "Yes" : "No",
        ])
      );
      filename = `housework-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "health": {
      const logs = await HealthLog.find({
        userId,
        ...(hasDateFilter ? { date: dateFilter } : {}),
      }).sort({ date: -1 });
      csv = generateCSV(
        ["Date", "Water", "Sleep (hours)", "Weight (kg)", "Mood"],
        logs.map((l) => [
          l.date.toISOString().split("T")[0],
          l.water.toString(),
          l.sleepHours.toString(),
          l.weight?.toString() || "",
          l.mood.toString(),
        ])
      );
      filename = `health-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "goals": {
      const goals = await Goal.find({ userId }).sort({ createdAt: -1 });
      csv = generateCSV(
        ["Title", "Category", "Status", "Target Date", "Milestones Done", "Milestones Total"],
        goals.map((g) => [
          g.title,
          g.category,
          g.status,
          g.targetDate ? g.targetDate.toISOString().split("T")[0] : "",
          g.milestones.filter((m: { completed: boolean }) => m.completed).length.toString(),
          g.milestones.length.toString(),
        ])
      );
      filename = `goals-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "reading": {
      const books = await Book.find({ userId }).sort({ createdAt: -1 });
      csv = generateCSV(
        ["Title", "Author", "Status", "Current Page", "Total Pages", "Rating", "Notes"],
        books.map((b) => [
          b.title,
          b.author || "",
          b.status,
          b.currentPage.toString(),
          b.totalPages.toString(),
          b.rating?.toString() || "",
          b.notes || "",
        ])
      );
      filename = `reading-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "journal": {
      const entries = await JournalEntry.find({
        userId,
        ...(hasDateFilter ? { date: dateFilter } : {}),
      }).sort({ date: -1 });
      csv = generateCSV(
        ["Date", "Mood", "Content"],
        entries.map((e) => [
          e.date.toISOString().split("T")[0],
          e.mood.toString(),
          e.content,
        ])
      );
      filename = `journal-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "shopping": {
      const lists = await ShoppingList.find({ userId }).sort({ createdAt: -1 });
      const rows: string[][] = [];
      for (const list of lists) {
        for (const item of list.items) {
          rows.push([
            list.name,
            item.name,
            item.quantity.toString(),
            item.price?.toString() || "",
            item.checked ? "Yes" : "No",
          ]);
        }
      }
      csv = generateCSV(["List", "Item", "Quantity", "Price", "Checked"], rows);
      filename = `shopping-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    case "mealprep": {
      const plans = await MealPlan.find({
        userId,
        ...(hasDateFilter ? { date: dateFilter } : {}),
      }).sort({ date: -1 });
      const rows: string[][] = [];
      for (const p of plans) {
        for (const m of p.meals) {
          rows.push([
            p.date.toISOString().split("T")[0],
            `Day ${p.dayOfWeek}`,
            m.type,
            m.name,
            m.notes || "",
          ]);
        }
      }
      csv = generateCSV(["Date", "Day", "Meal Type", "Name", "Notes"], rows);
      filename = `meal-prep-${new Date().toISOString().split("T")[0]}.csv`;
      break;
    }
    default:
      return NextResponse.json(
        { error: "Invalid export type" },
        { status: 400 }
      );
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

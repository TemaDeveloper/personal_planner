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

async function fetchSectionData(
  sectionType: string,
  ownerId: string,
  scopeFilter: string | null
): Promise<{ data: unknown[]; meta?: Record<string, unknown> }> {
  switch (sectionType) {
    case "work": {
      const data = await WorkSession.find({
        userId: ownerId,
        ...(scopeFilter ? { jobName: scopeFilter } : {}),
      })
        .sort({ date: -1 })
        .lean();
      return { data };
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
      const logs = await HabitLog.find({ habitId: { $in: habitIds } })
        .sort({ date: -1 })
        .lean();
      return { data: logs, meta: { habits } };
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
  const { data, meta } = await fetchSectionData(
    share.sectionType,
    String(share.ownerId),
    share.scopeFilter ?? null
  );

  return NextResponse.json({
    sectionType: share.sectionType,
    scopeFilter: share.scopeFilter,
    ownerName: (owner?.name as string) || "Unknown",
    permission: share.permission,
    data,
    meta,
  });
}

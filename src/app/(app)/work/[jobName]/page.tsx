import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import WorkSession from "@/lib/models/work-session";
import Expense from "@/lib/models/expense";
import Route from "@/lib/models/route";
import { PageHeader } from "@/components/layout/page-header";
import { WorkTracker } from "@/components/work/work-tracker";
import { notFound } from "next/navigation";
import {
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";

export default async function JobPage({
  params,
}: {
  params: Promise<{ jobName: string }>;
}) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return null;

  const { jobName: encodedJobName } = await params;
  const jobNameParam = decodeURIComponent(encodedJobName);

  await connectDB();
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const job = user.workConfig?.jobs?.find(
    (j: { name: string }) => j.name.toLowerCase() === jobNameParam
  );

  if (!job) notFound();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const baseFilter = { userId, jobName: job.name };

  const [weekSessions, todaySessions, monthSessions, expenses, routes] =
    await Promise.all([
      WorkSession.find({
        ...baseFilter,
        date: { $gte: weekStart, $lte: weekEnd },
      })
        .sort({ date: -1 })
        .lean(),
      WorkSession.find({
        ...baseFilter,
        date: { $gte: todayStart, $lte: todayEnd },
      }).lean(),
      WorkSession.find({
        ...baseFilter,
        date: { $gte: monthStart, $lte: monthEnd },
      }).lean(),
      job.enableExpenseTracking
        ? Expense.find({
            userId,
            date: { $gte: monthStart, $lte: monthEnd },
          })
            .sort({ date: -1 })
            .lean()
        : Promise.resolve([]),
      job.enableExpenseTracking
        ? Route.find({
            userId,
            date: { $gte: monthStart, $lte: monthEnd },
          })
            .sort({ date: -1 })
            .lean()
        : Promise.resolve([]),
    ]);

  const todayHours = todaySessions.reduce((s: number, ws: { hours: number }) => s + ws.hours, 0);
  const weekHours = weekSessions.reduce((s: number, ws: { hours: number }) => s + ws.hours, 0);
  const monthHours = monthSessions.reduce((s: number, ws: { hours: number }) => s + ws.hours, 0);

  const serializedSessions = weekSessions.map((s) => ({
    _id: String(s._id),
    date: s.date.toISOString(),
    hours: s.hours,
    note: s.note || "",
    jobName: s.jobName,
  }));

  const serializedExpenses = expenses.map((e) => ({
    _id: String(e._id),
    date: e.date.toISOString(),
    amount: e.amount,
    currency: e.currency,
    description: e.description,
    category: e.category,
    reimbursed: e.reimbursed,
  }));

  const serializedRoutes = routes.map((r) => ({
    _id: String(r._id),
    date: r.date.toISOString(),
    origin: r.origin,
    destination: r.destination,
    distanceKm: r.distanceKm,
    note: r.note || "",
  }));

  return (
    <div className="animate-slide-up">
      <PageHeader
        title={job.name}
        description={`${job.weeklyTarget}h/week${job.hourlyRate > 0 ? ` · $${job.hourlyRate}/hr` : ""}`}
      />
      <WorkTracker
        jobName={job.name}
        hourlyRate={job.hourlyRate}
        weeklyTarget={job.weeklyTarget}
        enableExpenseTracking={job.enableExpenseTracking}
        todayHours={todayHours}
        weekHours={weekHours}
        monthHours={monthHours}
        sessions={serializedSessions}
        expenses={serializedExpenses}
        routes={serializedRoutes}
        gasPrice={user.workConfig?.gasPrice || 210.2}
        carConsumption={user.workConfig?.carConsumption || 9.0}
        currency={user.preferences?.currency || "CAD"}
      />
    </div>
  );
}

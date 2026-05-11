import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import WorkSession from "@/lib/models/work-session";
import Expense from "@/lib/models/expense";
import Route from "@/lib/models/route";
import { PageHeader } from "@/components/layout/page-header";
import { formatCurrency } from "@/lib/utils";
import { calculateGasCost } from "@/lib/gas-calculator";
import {
  startOfWeek,
  endOfWeek,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import { TrendingUp, TrendingDown, DollarSign, Receipt } from "lucide-react";

export default async function FinancesPage() {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) return null;

  await connectDB();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [user, todaySessions, weekSessions, monthSessions, monthExpenses, monthRoutes] =
    await Promise.all([
      User.findById(userId).lean(),
      WorkSession.find({ userId, date: { $gte: todayStart, $lte: todayEnd } }).lean(),
      WorkSession.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).lean(),
      WorkSession.find({ userId, date: { $gte: monthStart, $lte: monthEnd } }).lean(),
      Expense.find({ userId, date: { $gte: monthStart, $lte: monthEnd } }).lean(),
      Route.find({ userId, date: { $gte: monthStart, $lte: monthEnd } }).lean(),
    ]);

  if (!user) return null;

  const currency = user.preferences?.currency || "CAD";
  const jobs = user.workConfig?.jobs?.filter((j: { active: boolean }) => j.active) || [];
  const bills = user.bills?.filter((b: { active: boolean }) => b.active) || [];

  // Income calculations
  const incomeByJob = jobs.map((job: { name: string; hourlyRate: number }) => {
    const todayH = todaySessions.filter((s: { jobName: string }) => s.jobName === job.name).reduce((sum: number, s: { hours: number }) => sum + s.hours, 0);
    const weekH = weekSessions.filter((s: { jobName: string }) => s.jobName === job.name).reduce((sum: number, s: { hours: number }) => sum + s.hours, 0);
    const monthH = monthSessions.filter((s: { jobName: string }) => s.jobName === job.name).reduce((sum: number, s: { hours: number }) => sum + s.hours, 0);
    return {
      name: job.name,
      today: todayH * job.hourlyRate,
      week: weekH * job.hourlyRate,
      month: monthH * job.hourlyRate,
    };
  });

  const totalMonthIncome = incomeByJob.reduce((s: number, j: { month: number }) => s + j.month, 0);
  const totalWeekIncome = incomeByJob.reduce((s: number, j: { week: number }) => s + j.week, 0);
  const totalTodayIncome = incomeByJob.reduce((s: number, j: { today: number }) => s + j.today, 0);

  const totalBills = bills.reduce((s: number, b: { amount: number }) => s + b.amount, 0);
  const totalExpenses = monthExpenses.reduce((s: number, e: { amount: number }) => s + e.amount, 0);

  const totalKm = monthRoutes.reduce((s: number, r: { distanceKm: number }) => s + r.distanceKm, 0);
  const gasCalc = calculateGasCost(totalKm, {
    gasPriceCentsPerLitre: user.workConfig?.gasPrice || 210.2,
    carConsumptionLPer100km: user.workConfig?.carConsumption || 9.0,
  });

  const totalOutflows = totalBills + totalExpenses + gasCalc.totalCostDollars;
  const netIncome = totalMonthIncome - totalOutflows;

  return (
    <div className="animate-slide-up">
      <PageHeader title="Finances" description="Income, bills, and expenses overview" />

      {/* Net income */}
      <div className="planner-surface p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign size={16} style={{ color: "var(--accent-color)" }} />
          <span className="stat-label">Net income this month</span>
        </div>
        <p
          className="stat-value text-3xl"
          style={{ color: netIncome >= 0 ? "var(--accent-color)" : "var(--destructive)" }}
        >
          {formatCurrency(netIncome, currency)}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} style={{ color: "var(--accent-color)" }} />
            <h2 className="text-sm font-semibold">Income</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="planner-surface p-3">
              <p className="stat-label">Today</p>
              <p className="text-lg font-semibold">{formatCurrency(totalTodayIncome, currency)}</p>
            </div>
            <div className="planner-surface p-3">
              <p className="stat-label">This week</p>
              <p className="text-lg font-semibold">{formatCurrency(totalWeekIncome, currency)}</p>
            </div>
            <div className="planner-surface p-3">
              <p className="stat-label">This month</p>
              <p className="text-lg font-semibold">{formatCurrency(totalMonthIncome, currency)}</p>
            </div>
          </div>

          {incomeByJob.length > 0 && (
            <div className="planner-surface p-4 space-y-3">
              {incomeByJob.map((job: { name: string; month: number; week: number }) => (
                <div key={job.name} className="flex items-center justify-between">
                  <span className="text-sm">{job.name}</span>
                  <span className="text-sm font-medium">
                    {formatCurrency(job.month, currency)}/mo
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Outflows */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-destructive" />
            <h2 className="text-sm font-semibold">Outflows</h2>
          </div>

          <div className="planner-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={14} className="text-muted-foreground" />
                <span className="text-sm">Monthly bills</span>
              </div>
              <span className="text-sm font-medium">
                {formatCurrency(totalBills, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={14} className="text-muted-foreground" />
                <span className="text-sm">Company expenses</span>
              </div>
              <span className="text-sm font-medium">
                {formatCurrency(totalExpenses, currency)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt size={14} className="text-muted-foreground" />
                <span className="text-sm">Gas ({totalKm.toFixed(0)} km)</span>
              </div>
              <span className="text-sm font-medium">
                {formatCurrency(gasCalc.totalCostDollars, currency)}
              </span>
            </div>
            <div
              className="pt-3 flex items-center justify-between"
              style={{ borderTop: "1px solid var(--border-subtle)" }}
            >
              <span className="text-sm font-semibold">Total</span>
              <span className="text-sm font-bold">
                {formatCurrency(totalOutflows, currency)}
              </span>
            </div>
          </div>

          {/* Bills list */}
          {bills.length > 0 && (
            <div className="planner-surface p-4">
              <h3 className="text-xs font-semibold text-muted-foreground mb-3">
                RECURRING BILLS
              </h3>
              <div className="space-y-2">
                {bills.map((bill: { name: string; amount: number; dueDay: number; category: string }, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <span>{bill.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        Due {bill.dueDay}th
                      </span>
                    </div>
                    <span className="font-medium">
                      {formatCurrency(bill.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

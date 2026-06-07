import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import User from "@/lib/models/user";
import WorkSession from "@/lib/models/work-session";
import Expense from "@/lib/models/expense";
import Route from "@/lib/models/route";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
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
import { TrendingUp, TrendingDown, DollarSign, Receipt, Download, Fuel } from "lucide-react";
import { SectionCustomFields } from "@/components/sections/custom-fields";

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

  const [
    user,
    todaySessions,
    weekSessions,
    monthSessions,
    monthExpenses,
    todayRoutes,
    weekRoutes,
    monthRoutes,
  ] = await Promise.all([
    User.findById(userId).lean(),
    WorkSession.find({ userId, date: { $gte: todayStart, $lte: todayEnd } }).lean(),
    WorkSession.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).lean(),
    WorkSession.find({ userId, date: { $gte: monthStart, $lte: monthEnd } }).lean(),
    Expense.find({ userId, date: { $gte: monthStart, $lte: monthEnd } }).lean(),
    Route.find({ userId, date: { $gte: todayStart, $lte: todayEnd } }).lean(),
    Route.find({ userId, date: { $gte: weekStart, $lte: weekEnd } }).lean(),
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

  const gasConfig = {
    gasPriceCentsPerLitre: user.workConfig?.gasPrice || 210.2,
    carConsumptionLPer100km: user.workConfig?.carConsumption || 9.0,
  };
  const sumKm = (routes: { distanceKm: number }[]) =>
    routes.reduce((s: number, r: { distanceKm: number }) => s + r.distanceKm, 0);

  const todayKm = sumKm(todayRoutes);
  const weekKm = sumKm(weekRoutes);
  const totalKm = sumKm(monthRoutes);

  const todayGas = calculateGasCost(todayKm, gasConfig);
  const weekGas = calculateGasCost(weekKm, gasConfig);
  const gasCalc = calculateGasCost(totalKm, gasConfig);

  const totalOutflows = totalBills + totalExpenses + gasCalc.totalCostDollars;
  const netIncome = totalMonthIncome - totalOutflows;

  const isPositiveNet = netIncome >= 0;

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Finances"
        description="Income, bills, and expenses overview"
        action={
          <a
            href="/api/export/finances"
            download
            className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-[var(--text-muted)] inline-flex"
            aria-label="Export to Excel"
          >
            <Download size={16} />
          </a>
        }
      />

      {/* HERO — net income this month */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign size={14} style={{ color: "var(--accent-color)" }} />
          <span className="stat-label">Net this month</span>
        </div>
        <StatBlock
          label=""
          value={formatCurrency(netIncome, currency)}
          sub={isPositiveNet ? "Positive cash flow" : "Outflows exceed income"}
          size="hero"
          className={isPositiveNet ? "text-[var(--good)]" : "text-[var(--alert)]"}
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} style={{ color: "var(--accent-color)" }} />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Income</h2>
          </div>

          {/* Income period tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card padding="sm">
              <StatBlock
                label="Today"
                value={formatCurrency(totalTodayIncome, currency)}
                size="sm"
              />
            </Card>
            <Card padding="sm">
              <StatBlock
                label="This week"
                value={formatCurrency(totalWeekIncome, currency)}
                size="sm"
              />
            </Card>
            <Card padding="sm">
              <StatBlock
                label="This month"
                value={formatCurrency(totalMonthIncome, currency)}
                size="sm"
              />
            </Card>
          </div>

          {/* Per-job breakdown */}
          {incomeByJob.length > 0 ? (
            <Card padding="md">
              <p className="stat-label mb-3">By job</p>
              <div className="space-y-3">
                {incomeByJob.map((job: { name: string; month: number; week: number }) => (
                  <div key={job.name} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-primary)]">{job.name}</span>
                    <span className="text-sm font-medium num text-[var(--text-primary)]">
                      {formatCurrency(job.month, currency)}/mo
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card padding="md">
              <div className="flex flex-col items-center py-6 text-center gap-2">
                <TrendingUp size={20} style={{ color: "var(--accent-color)" }} />
                <p className="text-sm text-[var(--text-muted)]">No active jobs configured</p>
              </div>
            </Card>
          )}
        </div>

        {/* Outflows column */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingDown size={14} style={{ color: "var(--alert)" }} />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Outflows</h2>
          </div>

          {/* Outflow summary */}
          <Card padding="md">
            <p className="stat-label mb-3">This month</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt size={13} style={{ color: "var(--text-muted)" }} />
                  <span className="text-sm text-[var(--text-primary)]">Monthly bills</span>
                </div>
                <span className="text-sm font-medium num text-[var(--text-primary)]">
                  {formatCurrency(totalBills, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt size={13} style={{ color: "var(--text-muted)" }} />
                  <span className="text-sm text-[var(--text-primary)]">Company expenses</span>
                </div>
                <span className="text-sm font-medium num text-[var(--text-primary)]">
                  {formatCurrency(totalExpenses, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel size={13} style={{ color: "var(--text-muted)" }} />
                  <span className="text-sm text-[var(--text-primary)]">
                    Gas{" "}
                    <span className="num text-[var(--text-muted)]">
                      ({totalKm.toFixed(0)} km)
                    </span>
                  </span>
                </div>
                <span className="text-sm font-medium num text-[var(--text-primary)]">
                  {formatCurrency(gasCalc.totalCostDollars, currency)}
                </span>
              </div>
              <div className="pt-3 flex items-center justify-between border-t border-[var(--border-subtle)]">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Total</span>
                <span className="text-sm font-bold num text-[var(--text-primary)]">
                  {formatCurrency(totalOutflows, currency)}
                </span>
              </div>
            </div>
          </Card>

          {/* Fuel breakdown */}
          <Card padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Fuel size={13} style={{ color: "var(--text-muted)" }} />
              <p className="stat-label">
                Fuel — <span className="num">{gasConfig.carConsumptionLPer100km.toFixed(1)}</span> L/100km
                {" "}@{" "}
                <span className="num">${(gasConfig.gasPriceCentsPerLitre / 100).toFixed(2)}</span>/L
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Today", km: todayKm, gas: todayGas },
                { label: "This week", km: weekKm, gas: weekGas },
                { label: "This month", km: totalKm, gas: gasCalc },
              ].map((f) => (
                <div key={f.label} className="min-w-0">
                  <p className="stat-label mb-1">{f.label}</p>
                  <p className="text-base font-semibold num text-[var(--text-primary)]">
                    {formatCurrency(f.gas.totalCostDollars, currency)}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] num mt-0.5 truncate">
                    <span className="num">{f.km.toFixed(0)}</span> km
                    {" · "}
                    <span className="num">{f.gas.litresUsed.toFixed(1)}</span> L
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Bills list */}
          {bills.length > 0 ? (
            <Card padding="md">
              <p className="stat-label mb-3">Recurring bills</p>
              <div className="space-y-2">
                {bills.map((bill: { name: string; amount: number; dueDay: number; category: string }, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm min-h-[44px]">
                    <div>
                      <span className="text-[var(--text-primary)]">{bill.name}</span>
                      <span className="text-xs text-[var(--text-muted)] ml-2">
                        Due <span className="num">{bill.dueDay}</span>th
                      </span>
                    </div>
                    <span className="font-medium num text-[var(--text-primary)]">
                      {formatCurrency(bill.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card padding="md">
              <div className="flex flex-col items-center py-6 text-center gap-2">
                <Receipt size={20} style={{ color: "var(--accent-color)" }} />
                <p className="text-sm text-[var(--text-muted)]">No recurring bills added yet</p>
              </div>
            </Card>
          )}
        </div>
      </div>
      <SectionCustomFields sectionKey="finances" />
    </div>
  );
}

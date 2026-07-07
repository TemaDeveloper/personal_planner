"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Clock, MapPin, Receipt, DollarSign } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatBlock } from "@/components/ui/stat-block";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { calculateGasCost } from "@/lib/gas-calculator";

interface Session {
  _id: string;
  date: string;
  hours: number;
  note: string;
  jobName: string;
}

interface ExpenseItem {
  _id: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
  category: string;
  reimbursed: boolean;
}

interface RouteItem {
  _id: string;
  date: string;
  origin: string;
  destination: string;
  distanceKm: number;
  note: string;
}

interface WorkTrackerProps {
  jobName: string;
  hourlyRate: number;
  weeklyTarget: number;
  enableExpenseTracking: boolean;
  todayHours: number;
  weekHours: number;
  monthHours: number;
  sessions: Session[];
  expenses: ExpenseItem[];
  routes: RouteItem[];
  gasPrice: number;
  carConsumption: number;
  currency: string;
}

export function WorkTracker({
  jobName,
  hourlyRate,
  weeklyTarget,
  enableExpenseTracking,
  todayHours,
  weekHours,
  monthHours,
  sessions,
  expenses,
  routes,
  gasPrice,
  carConsumption,
  currency,
}: WorkTrackerProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"hours" | "expenses" | "routes">("hours");
  const [showAddSession, setShowAddSession] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddRoute, setShowAddRoute] = useState(false);

  const progress = weeklyTarget > 0 ? Math.min((weekHours / weeklyTarget) * 100, 100) : 0;

  const totalKm = routes.reduce((sum, r) => sum + r.distanceKm, 0);
  const gasCalc = calculateGasCost(totalKm, {
    gasPriceCentsPerLitre: gasPrice,
    carConsumptionLPer100km: carConsumption,
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCompensation = totalExpenses + gasCalc.totalCostDollars;

  const segments = [
    { value: "hours" as const, label: "Hours", icon: Clock },
    ...(enableExpenseTracking
      ? [
          { value: "expenses" as const, label: "Expenses", icon: Receipt },
          { value: "routes" as const, label: "Routes & Gas", icon: MapPin },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Hours summary — hero = this week; supporting = today & month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* HERO: this week */}
        <Card padding="md" className="sm:col-span-1">
          <StatBlock
            label="This week"
            value={`${weekHours.toFixed(1)}h`}
            sub={hourlyRate > 0 ? formatCurrency(weekHours * hourlyRate, currency) : undefined}
            size="hero"
          />
          <div className="mt-3">
            <Progress value={progress} size="sm" />
            <p className="text-xs text-[var(--text-faint)] mt-1 num">
              {weekHours.toFixed(1)} / {weeklyTarget}h target
            </p>
          </div>
        </Card>

        <Card padding="md">
          <StatBlock
            label="Today"
            value={`${todayHours.toFixed(1)}h`}
            sub={hourlyRate > 0 ? formatCurrency(todayHours * hourlyRate, currency) : undefined}
            size="md"
          />
        </Card>

        <Card padding="md">
          <StatBlock
            label="This month"
            value={`${monthHours.toFixed(1)}h`}
            sub={hourlyRate > 0 ? formatCurrency(monthHours * hourlyRate, currency) : undefined}
            size="md"
          />
        </Card>

        <Card padding="md">
          <StatBlock
            label="Weekly goal"
            value={`${Math.round(progress)}%`}
            size="md"
          />
          <div className="mt-3">
            <Progress value={progress} size="sm" />
          </div>
        </Card>
      </div>

      {/* Compensation summary for expense-tracked jobs */}
      {enableExpenseTracking && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={15} style={{ color: "var(--accent-color)" }} />
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
              Compensation · This Month
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatBlock
              label="Expenses"
              value={formatCurrency(totalExpenses, currency)}
              size="lg"
            />
            <StatBlock
              label={`Gas (${totalKm.toFixed(0)} km)`}
              value={formatCurrency(gasCalc.totalCostDollars, currency)}
              size="lg"
            />
            <div>
              <p className="stat-label mb-1.5">Total owed</p>
              <p
                className="text-2xl sm:text-3xl stat-value num"
                style={{ color: "var(--accent-text)" }}
              >
                {formatCurrency(totalCompensation, currency)}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      {segments.length > 1 && (
        <SegmentedControl
          segments={segments}
          value={activeTab}
          onChange={setActiveTab}
          layoutId="work-tabs"
          className="w-full"
        />
      )}

      {/* Hours tab */}
      {activeTab === "hours" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              This week&apos;s sessions
            </h2>
            <Button size="sm" onClick={() => setShowAddSession(true)}>
              <Plus size={14} />
              Log hours
            </Button>
          </div>

          {sessions.length === 0 ? (
            <Card padding="lg">
              <EmptyState
                icon={Clock}
                title="No hours logged"
                description="Log your first session for this week."
                actionLabel="Log hours"
                onAction={() => setShowAddSession(true)}
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <Card key={s._id} variant="inset" padding="md" className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {new Date(s.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {s.note && (
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.note}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold num text-[var(--text-primary)]">
                      {s.hours}h
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete session"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/work/sessions/${s._id}`, { method: "DELETE" });
                          if (res.ok) {
                            toast.success("Session deleted");
                            router.refresh();
                          } else {
                            toast.error("Failed to delete session");
                          }
                        } catch {
                          toast.error("Failed to delete session");
                        }
                      }}
                      className="h-7 w-7 text-[var(--text-muted)] hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {showAddSession && (
            <AddSessionModal
              jobName={jobName}
              onClose={() => setShowAddSession(false)}
              onSuccess={() => {
                setShowAddSession(false);
                router.refresh();
              }}
            />
          )}
        </div>
      )}

      {/* Expenses tab */}
      {activeTab === "expenses" && enableExpenseTracking && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Company expenses · this month
            </h2>
            <Button size="sm" onClick={() => setShowAddExpense(true)}>
              <Plus size={14} />
              Add expense
            </Button>
          </div>

          {expenses.length === 0 ? (
            <Card padding="lg">
              <EmptyState
                icon={Receipt}
                title="No expenses recorded"
                description="Track company expenses to include them in your compensation summary."
                actionLabel="Add expense"
                onAction={() => setShowAddExpense(true)}
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {expenses.map((e) => (
                <Card key={e._id} variant="inset" padding="md" className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {e.description}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {new Date(e.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {" · "}
                      {e.category}
                      {e.reimbursed && (
                        <span
                          className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            color: "var(--good)",
                            background: "var(--good-wash)",
                          }}
                        >
                          Reimbursed
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold num text-[var(--text-primary)]">
                      {formatCurrency(e.amount, currency)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete expense"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/expenses/${e._id}`, { method: "DELETE" });
                          if (res.ok) {
                            toast.success("Expense deleted");
                            router.refresh();
                          } else {
                            toast.error("Failed to delete expense");
                          }
                        } catch {
                          toast.error("Failed to delete expense");
                        }
                      }}
                      className="h-7 w-7 text-[var(--text-muted)] hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {showAddExpense && (
            <AddExpenseModal
              currency={currency}
              onClose={() => setShowAddExpense(false)}
              onSuccess={() => {
                setShowAddExpense(false);
                router.refresh();
              }}
            />
          )}
        </div>
      )}

      {/* Routes & Gas tab */}
      {activeTab === "routes" && enableExpenseTracking && (
        <div>
          {/* Gas calculator card */}
          <Card padding="md" className="mb-6">
            <h2 className="stat-label mb-4">Gas Calculator · this month</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatBlock label="Total km" value={totalKm.toFixed(1)} size="md" />
              <StatBlock label="Fuel used" value={`${gasCalc.litresUsed.toFixed(1)} L`} size="md" />
              <StatBlock
                label="Gas cost"
                value={formatCurrency(gasCalc.totalCostDollars, currency)}
                size="md"
              />
              <StatBlock
                label="Per km"
                value={formatCurrency(gasCalc.costPerKm, currency)}
                size="md"
              />
            </div>
            <p className="text-xs text-[var(--text-faint)] mt-4 num">
              <span className="num">{gasPrice}</span> c/L · <span className="num">{carConsumption}</span> L/100km
            </p>
          </Card>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Routes · this month
            </h2>
            <Button size="sm" onClick={() => setShowAddRoute(true)}>
              <Plus size={14} />
              Add route
            </Button>
          </div>

          {routes.length === 0 ? (
            <Card padding="lg">
              <EmptyState
                icon={MapPin}
                title="No routes recorded"
                description="Add routes to calculate your gas costs automatically."
                actionLabel="Add route"
                onAction={() => setShowAddRoute(true)}
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {routes.map((r) => (
                <Card key={r._id} variant="inset" padding="md" className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">
                      {r.origin} → {r.destination}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {new Date(r.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {r.note && ` · ${r.note}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold num text-[var(--text-primary)]">
                      {r.distanceKm} km
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete route"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/routes/${r._id}`, { method: "DELETE" });
                          if (res.ok) {
                            toast.success("Route deleted");
                            router.refresh();
                          } else {
                            toast.error("Failed to delete route");
                          }
                        } catch {
                          toast.error("Failed to delete route");
                        }
                      }}
                      className="h-7 w-7 text-[var(--text-muted)] hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {showAddRoute && (
            <AddRouteModal
              onClose={() => setShowAddRoute(false)}
              onSuccess={() => {
                setShowAddRoute(false);
                router.refresh();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AddSessionModal({
  jobName,
  onClose,
  onSuccess,
}: {
  jobName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hours, setHours] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/work/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobName, date, hours: Number(hours), note }),
    });

    if (res.ok) {
      toast.success("Hours logged");
      onSuccess();
    } else {
      toast.error("Failed to log hours");
    }
    setLoading(false);
  };

  return (
    <Modal open onClose={onClose} title="Log Hours" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <FormInput
          label="Hours"
          type="number"
          step="0.25"
          min="0"
          max="24"
          placeholder="e.g. 4.5"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          required
        />
        <FormInput
          label="Note (optional)"
          type="text"
          placeholder="What did you work on?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AddExpenseModal({
  currency,
  onClose,
  onSuccess,
}: {
  currency: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, amount: Number(amount), description, category, currency }),
    });

    if (res.ok) {
      toast.success("Expense added");
      onSuccess();
    } else {
      toast.error("Failed to add expense");
    }
    setLoading(false);
  };

  return (
    <Modal open onClose={onClose} title="Add Expense" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <FormInput
          label={`Amount (${currency})`}
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <FormInput
          label="Description"
          type="text"
          placeholder="What was the expense for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <FormSelect
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="travel">Travel</option>
          <option value="equipment">Equipment</option>
          <option value="meals">Meals</option>
          <option value="office">Office</option>
          <option value="other">Other</option>
        </FormSelect>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function AddRouteModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, origin, destination, distanceKm: Number(distanceKm), note }),
    });

    if (res.ok) {
      toast.success("Route added");
      onSuccess();
    } else {
      toast.error("Failed to add route");
    }
    setLoading(false);
  };

  return (
    <Modal open onClose={onClose} title="Add Route" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
        <FormInput
          label="From"
          type="text"
          placeholder="Origin"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          required
        />
        <FormInput
          label="To"
          type="text"
          placeholder="Destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
        />
        <FormInput
          label="Distance (km)"
          type="number"
          step="0.1"
          min="0"
          placeholder="0.0"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
          required
        />
        <FormInput
          label="Note (optional)"
          type="text"
          placeholder="Trip details"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

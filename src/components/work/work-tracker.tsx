"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Clock, MapPin, Receipt, DollarSign } from "lucide-react";
import { Modal } from "@/components/ui/modal";
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

  const tabs = [
    { id: "hours" as const, label: "Hours", icon: Clock },
    ...(enableExpenseTracking
      ? [
          { id: "expenses" as const, label: "Expenses", icon: Receipt },
          { id: "routes" as const, label: "Routes & Gas", icon: MapPin },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Salary/hours summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="planner-surface p-4">
          <p className="stat-label">Today</p>
          <p className="stat-value text-xl">{todayHours.toFixed(1)}h</p>
          {hourlyRate > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(todayHours * hourlyRate, currency)}
            </p>
          )}
        </div>
        <div className="planner-surface p-4">
          <p className="stat-label">This week</p>
          <p className="stat-value text-xl">{weekHours.toFixed(1)}h</p>
          {hourlyRate > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(weekHours * hourlyRate, currency)}
            </p>
          )}
        </div>
        <div className="planner-surface p-4">
          <p className="stat-label">This month</p>
          <p className="stat-value text-xl">{monthHours.toFixed(1)}h</p>
          {hourlyRate > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(monthHours * hourlyRate, currency)}
            </p>
          )}
        </div>
        <div className="planner-surface p-4">
          <p className="stat-label">Weekly goal</p>
          <p className="stat-value text-xl">{Math.round(progress)}%</p>
          <div className="mt-2 h-1.5 rounded-full" style={{ background: "var(--surface-2)" }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "var(--accent-color)" }}
            />
          </div>
        </div>
      </div>

      {/* Compensation summary for expense-tracked jobs */}
      {enableExpenseTracking && (
        <div className="planner-surface p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={16} style={{ color: "var(--accent-color)" }} />
            <h3 className="text-sm font-semibold">Compensation Summary (This Month)</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="stat-label">Expenses</p>
              <p className="text-lg font-semibold">{formatCurrency(totalExpenses, currency)}</p>
            </div>
            <div>
              <p className="stat-label">Gas ({totalKm.toFixed(0)} km)</p>
              <p className="text-lg font-semibold">{formatCurrency(gasCalc.totalCostDollars, currency)}</p>
            </div>
            <div>
              <p className="stat-label">Total owed</p>
              <p className="text-lg font-semibold" style={{ color: "var(--accent-color)" }}>
                {formatCurrency(totalCompensation, currency)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center"
              style={{
                background: activeTab === tab.id ? "var(--surface-2)" : "transparent",
                color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-muted)",
              }}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Hours tab */}
      {activeTab === "hours" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">This week&apos;s sessions</h3>
            <button
              onClick={() => setShowAddSession(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground transition-all hover:-translate-y-0.5"
            >
              <Plus size={14} />
              Log hours
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="planner-surface-2 p-6 text-center">
              <p className="text-sm text-muted-foreground">No hours logged this week</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s._id} className="planner-surface-2 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(s.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    {s.note && <p className="text-xs text-muted-foreground mt-0.5">{s.note}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{s.hours}h</span>
                    <button
                      onClick={async () => {
                        await fetch(`/api/work/sessions/${s._id}`, { method: "DELETE" });
                        toast.success("Session deleted");
                        router.refresh();
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add session modal */}
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
            <h3 className="text-sm font-semibold">Company expenses (this month)</h3>
            <button
              onClick={() => setShowAddExpense(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground transition-all hover:-translate-y-0.5"
            >
              <Plus size={14} />
              Add expense
            </button>
          </div>

          {expenses.length === 0 ? (
            <div className="planner-surface-2 p-6 text-center">
              <p className="text-sm text-muted-foreground">No expenses recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((e) => (
                <div key={e._id} className="planner-surface-2 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{e.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" · "}
                      {e.category}
                      {e.reimbursed && " · Reimbursed"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatCurrency(e.amount, currency)}</span>
                    <button
                      onClick={async () => {
                        await fetch(`/api/expenses/${e._id}`, { method: "DELETE" });
                        toast.success("Expense deleted");
                        router.refresh();
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
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
          <div className="planner-surface p-5 mb-6">
            <h3 className="text-sm font-semibold mb-3">Gas Calculator</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="stat-label">Total km</p>
                <p className="text-lg font-semibold">{totalKm.toFixed(1)}</p>
              </div>
              <div>
                <p className="stat-label">Fuel used</p>
                <p className="text-lg font-semibold">{gasCalc.litresUsed.toFixed(1)} L</p>
              </div>
              <div>
                <p className="stat-label">Gas cost</p>
                <p className="text-lg font-semibold">{formatCurrency(gasCalc.totalCostDollars, currency)}</p>
              </div>
              <div>
                <p className="stat-label">Per km</p>
                <p className="text-lg font-semibold">{formatCurrency(gasCalc.costPerKm, currency)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {gasPrice} c/L · {carConsumption} L/100km
            </p>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Routes (this month)</h3>
            <button
              onClick={() => setShowAddRoute(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground transition-all hover:-translate-y-0.5"
            >
              <Plus size={14} />
              Add route
            </button>
          </div>

          {routes.length === 0 ? (
            <div className="planner-surface-2 p-6 text-center">
              <p className="text-sm text-muted-foreground">No routes recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {routes.map((r) => (
                <div key={r._id} className="planner-surface-2 p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.origin} → {r.destination}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {r.note && ` · ${r.note}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{r.distanceKm} km</span>
                    <button
                      onClick={async () => {
                        await fetch(`/api/routes/${r._id}`, { method: "DELETE" });
                        toast.success("Route deleted");
                        router.refresh();
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
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
        <FormField label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </FormField>
        <FormField label="Hours">
          <input
            type="number"
            step="0.25"
            min="0"
            max="24"
            placeholder="e.g. 4.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Note (optional)">
          <input
            type="text"
            placeholder="What did you work on?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </FormField>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
            {loading ? "Saving..." : "Save"}
          </button>
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
        <FormField label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </FormField>
        <FormField label={`Amount (${currency})`}>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Description">
          <input
            type="text"
            placeholder="What was the expense for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </FormField>
        <FormField label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="travel">Travel</option>
            <option value="equipment">Equipment</option>
            <option value="meals">Meals</option>
            <option value="office">Office</option>
            <option value="other">Other</option>
          </select>
        </FormField>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
            {loading ? "Saving..." : "Save"}
          </button>
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
        <FormField label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </FormField>
        <FormField label="From">
          <input type="text" placeholder="Origin" value={origin} onChange={(e) => setOrigin(e.target.value)} required />
        </FormField>
        <FormField label="To">
          <input type="text" placeholder="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} required />
        </FormField>
        <FormField label="Distance (km)">
          <input type="number" step="0.1" min="0" placeholder="0.0" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} required />
        </FormField>
        <FormField label="Note (optional)">
          <input type="text" placeholder="Trip details" value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
            Cancel
          </button>
          <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">{label}</label>
      <div
        className="[&>input]:w-full [&>input]:px-3 [&>input]:py-2.5 [&>input]:rounded-lg [&>input]:text-sm [&>input]:transition-all [&>input]:focus:outline-none [&>input]:focus:ring-2 [&>input]:focus:ring-primary/50 [&>select]:w-full [&>select]:px-3 [&>select]:py-2.5 [&>select]:rounded-lg [&>select]:text-sm"
        style={{ ['--field-bg' as string]: "var(--surface-2)", ['--field-border' as string]: "var(--border-subtle)" }}
      >
        <style>{`
          .form-field-wrap input, .form-field-wrap select {
            background: var(--surface-2);
            border: 1px solid var(--border-subtle);
            color: var(--text-primary);
          }
        `}</style>
        <div className="form-field-wrap">{children}</div>
      </div>
    </div>
  );
}

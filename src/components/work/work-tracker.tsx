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
      {/* Salary/hours summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card padding="md">
          <p className="stat-label">Today</p>
          <p className="stat-value text-xl">{todayHours.toFixed(1)}h</p>
          {hourlyRate > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(todayHours * hourlyRate, currency)}
            </p>
          )}
        </Card>
        <Card padding="md">
          <p className="stat-label">This week</p>
          <p className="stat-value text-xl">{weekHours.toFixed(1)}h</p>
          {hourlyRate > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(weekHours * hourlyRate, currency)}
            </p>
          )}
        </Card>
        <Card padding="md">
          <p className="stat-label">This month</p>
          <p className="stat-value text-xl">{monthHours.toFixed(1)}h</p>
          {hourlyRate > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(monthHours * hourlyRate, currency)}
            </p>
          )}
        </Card>
        <Card padding="md">
          <p className="stat-label">Weekly goal</p>
          <p className="stat-value text-xl">{Math.round(progress)}%</p>
          <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-2)]">
            <div
              className="h-full rounded-full transition-all duration-500 bg-[var(--accent-color)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Compensation summary for expense-tracked jobs */}
      {enableExpenseTracking && (
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={16} className="text-[var(--accent-color)]" />
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
              <p className="text-lg font-semibold text-[var(--accent-color)]">
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
            <h3 className="text-sm font-semibold">This week&apos;s sessions</h3>
            <Button size="sm" onClick={() => setShowAddSession(true)}>
              <Plus size={14} />
              Log hours
            </Button>
          </div>

          {sessions.length === 0 ? (
            <Card variant="inset" padding="lg" className="text-center">
              <p className="text-sm text-muted-foreground">No hours logged this week</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <Card key={s._id} variant="inset" padding="md" className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(s.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    {s.note && <p className="text-xs text-muted-foreground mt-0.5">{s.note}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{s.hours}h</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        await fetch(`/api/work/sessions/${s._id}`, { method: "DELETE" });
                        toast.success("Session deleted");
                        router.refresh();
                      }}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
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
            <Button size="sm" onClick={() => setShowAddExpense(true)}>
              <Plus size={14} />
              Add expense
            </Button>
          </div>

          {expenses.length === 0 ? (
            <Card variant="inset" padding="lg" className="text-center">
              <p className="text-sm text-muted-foreground">No expenses recorded</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {expenses.map((e) => (
                <Card key={e._id} variant="inset" padding="md" className="flex items-center justify-between">
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        await fetch(`/api/expenses/${e._id}`, { method: "DELETE" });
                        toast.success("Expense deleted");
                        router.refresh();
                      }}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
          </Card>

          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Routes (this month)</h3>
            <Button size="sm" onClick={() => setShowAddRoute(true)}>
              <Plus size={14} />
              Add route
            </Button>
          </div>

          {routes.length === 0 ? (
            <Card variant="inset" padding="lg" className="text-center">
              <p className="text-sm text-muted-foreground">No routes recorded</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {routes.map((r) => (
                <Card key={r._id} variant="inset" padding="md" className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{r.origin} → {r.destination}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {r.note && ` · ${r.note}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{r.distanceKm} km</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        await fetch(`/api/routes/${r._id}`, { method: "DELETE" });
                        toast.success("Route deleted");
                        router.refresh();
                      }}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
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

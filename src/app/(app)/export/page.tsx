"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

const EXPORT_TYPES = [
  { value: "work", label: "Work Sessions", desc: "Hours logged across all jobs" },
  { value: "gym", label: "Gym Workouts", desc: "Exercises, sets, reps, weight" },
  { value: "expenses", label: "Expenses", desc: "Company expenses from personal money" },
  { value: "routes", label: "Routes", desc: "Destinations and km tracked" },
  { value: "study", label: "Study Sessions", desc: "Time logged per subject" },
  { value: "hobbies", label: "Hobby Sessions", desc: "Time logged per hobby" },
  { value: "housework", label: "Housework", desc: "Chore completion logs" },
  { value: "health", label: "Health Logs", desc: "Water, sleep, weight & mood" },
  { value: "goals", label: "Goals", desc: "Goals, milestones & progress" },
  { value: "reading", label: "Reading List", desc: "Books, progress & ratings" },
  { value: "journal", label: "Journal", desc: "Daily journal entries" },
  { value: "shopping", label: "Shopping Lists", desc: "Lists, items & prices" },
  { value: "mealprep", label: "Meal Prep", desc: "Weekly meal plans" },
];

export default function ExportPage() {
  const [type, setType] = useState("work");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const handleExport = () => {
    const params = new URLSearchParams({ type });
    if (from) params.append("from", from);
    if (to) params.append("to", to);

    window.location.href = `/api/export?${params.toString()}`;
    toast.success("Download started");
  };

  return (
    <div className="animate-slide-up">
      <PageHeader
        title="Export"
        description="Download your data as CSV for Excel"
      />

      <div className="planner-surface p-6 space-y-6">
        {/* Type selection */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-3">
            What to export
          </label>
          <div className="space-y-2">
            {EXPORT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className="w-full p-4 rounded-lg text-left transition-all flex items-center gap-4"
                style={{
                  background:
                    type === t.value ? "var(--accent-glow)" : "var(--surface-2)",
                  border: `1px solid ${type === t.value ? "var(--accent-color)" : "var(--border-subtle)"}`,
                }}
              >
                <FileSpreadsheet
                  size={18}
                  style={{
                    color:
                      type === t.value
                        ? "var(--accent-color)"
                        : "var(--text-muted)",
                  }}
                />
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{
                      color:
                        type === t.value
                          ? "var(--text-primary)"
                          : "var(--text-muted)",
                    }}
                  >
                    {t.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-3">
            Date range (optional)
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Leave empty to export all data
          </p>
        </div>

        {/* Export button */}
        <button
          onClick={handleExport}
          className="w-full py-3 rounded-lg text-sm font-semibold bg-primary text-primary-foreground flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <Download size={16} />
          Download CSV
        </button>
      </div>
    </div>
  );
}

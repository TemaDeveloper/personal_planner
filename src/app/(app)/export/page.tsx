"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { PageTransition } from "@/components/ui/page-transition";

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

  const dateError = from && to && from > to ? "\"From\" date must be before \"To\" date" : "";

  const handleExport = () => {
    if (dateError) {
      toast.error(dateError);
      return;
    }

    const params = new URLSearchParams({ type });
    if (from) params.append("from", from);
    if (to) params.append("to", to);

    window.location.href = `/api/export?${params.toString()}`;
    toast.success("Download started");
  };

  return (
    <PageTransition>
      <PageHeader
        title="Export"
        description="Download your data as Excel"
      />

      <Card padding="lg" className="space-y-8">
        {/* Dataset selection */}
        <div>
          <p className="stat-label mb-3">What to export</p>
          <div className="space-y-2">
            {EXPORT_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={
                  "w-full min-h-[44px] px-4 py-3 rounded-md text-left transition-colors flex items-center gap-4 border " +
                  (type === t.value
                    ? "bg-[var(--accent-glow)] border-[var(--accent-color)]"
                    : "bg-[var(--surface-2)] border-[var(--border-subtle)] hover:border-[var(--border)]")
                }
              >
                <FileSpreadsheet
                  size={18}
                  className={
                    type === t.value
                      ? "text-[var(--accent-color)] shrink-0"
                      : "text-[var(--text-muted)] shrink-0"
                  }
                />
                <div className="min-w-0">
                  <p
                    className={
                      "text-sm font-medium leading-snug " +
                      (type === t.value
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-muted)]")
                    }
                  >
                    {t.label}
                  </p>
                  <p className="text-xs text-[var(--text-faint)] mt-0.5 truncate">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div>
          <p className="stat-label mb-3">Date range <span className="normal-case font-normal text-[var(--text-faint)]">(optional)</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput
              label="From"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <FormInput
              label="To"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          {dateError ? (
            <p className="text-xs text-[var(--alert)] mt-2">{dateError}</p>
          ) : (
            <p className="text-xs text-[var(--text-faint)] mt-2">
              Leave empty to export all data
            </p>
          )}
        </div>

        {/* Export button */}
        <Button
          onClick={handleExport}
          size="lg"
          className="w-full"
          disabled={!!dateError}
        >
          <Download size={16} />
          Download Excel
        </Button>
      </Card>
    </PageTransition>
  );
}

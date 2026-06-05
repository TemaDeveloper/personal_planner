"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, FileSpreadsheet, CheckSquare, Square } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Card } from "@/components/ui/card";
import type { SectionId } from "@/lib/constants";

const EXPORT_TYPES: { value: string; label: string; desc: string; section?: SectionId }[] = [
  { value: "work",     label: "Work Sessions",  desc: "Hours logged across all jobs",       section: "work" },
  { value: "gym",      label: "Gym Workouts",   desc: "Exercises, sets, reps, weight",      section: "gym" },
  { value: "expenses", label: "Expenses",        desc: "Company expenses from personal money" },
  { value: "routes",   label: "Routes",          desc: "Destinations and km tracked" },
  { value: "study",    label: "Study Sessions",  desc: "Time logged per subject",            section: "study" },
  { value: "hobbies",  label: "Hobby Sessions",  desc: "Time logged per hobby",              section: "hobbies" },
  { value: "housework",label: "Housework",       desc: "Chore completion logs",              section: "housework" },
  { value: "health",   label: "Health Logs",     desc: "Water, sleep, weight & mood",        section: "health" },
  { value: "goals",    label: "Goals",           desc: "Goals, milestones & progress",       section: "goals" },
  { value: "reading",  label: "Reading List",    desc: "Books, progress & ratings",          section: "reading" },
  { value: "journal",  label: "Journal",         desc: "Daily journal entries",              section: "journal" },
  { value: "shopping", label: "Shopping Lists",  desc: "Lists, items & prices",             section: "shopping" },
  { value: "mealprep", label: "Meal Prep",       desc: "Weekly meal plans",                 section: "mealprep" as SectionId },
];

type DateRange = "all" | "month" | "quarter" | "year" | "custom";

const DATE_RANGE_SEGMENTS: { value: DateRange; label: string }[] = [
  { value: "all",     label: "All time" },
  { value: "month",   label: "This month" },
  { value: "quarter", label: "90 days" },
  { value: "year",    label: "This year" },
  { value: "custom",  label: "Custom" },
];

function getDateRange(range: DateRange): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (range === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: fmt(first), to: fmt(now) };
  }
  if (range === "quarter") {
    const from = new Date(now);
    from.setDate(from.getDate() - 89);
    return { from: fmt(from), to: fmt(now) };
  }
  if (range === "year") {
    const first = new Date(now.getFullYear(), 0, 1);
    return { from: fmt(first), to: fmt(now) };
  }
  return { from: "", to: "" };
}

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  enabledSections: SectionId[];
}

export function ExportModal({ open, onClose, enabledSections }: ExportModalProps) {
  const [selected, setSelected] = useState<Set<string>>(() => {
    const defaults = new Set<string>();
    EXPORT_TYPES.forEach((t) => {
      if (!t.section || enabledSections.includes(t.section)) {
        defaults.add(t.value);
      }
    });
    return defaults;
  });
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const visibleTypes = EXPORT_TYPES.filter(
    (t) => !t.section || enabledSections.includes(t.section)
  );

  const toggleItem = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const allChecked = visibleTypes.every((t) => selected.has(t.value));
  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleTypes.map((t) => t.value)));
    }
  };

  const handleExport = () => {
    const toExport = [...selected];
    if (toExport.length === 0) {
      toast.error("Select at least one data type to export");
      return;
    }

    let { from, to } = getDateRange(dateRange);
    if (dateRange === "custom") {
      from = customFrom;
      to = customTo;
      if (from && to && from > to) {
        toast.error('"From" date must be before "To" date');
        return;
      }
    }

    // Trigger a download for each selected type (reuse the existing /api/export endpoint)
    toExport.forEach((type, i) => {
      setTimeout(() => {
        const params = new URLSearchParams({ type });
        if (from) params.append("from", from);
        if (to) params.append("to", to);
        window.location.href = `/api/export?${params.toString()}`;
      }, i * 300);
    });

    toast.success(
      toExport.length === 1
        ? "Download started"
        : `${toExport.length} downloads started`
    );
    onClose();
  };

  const dateError =
    dateRange === "custom" && customFrom && customTo && customFrom > customTo
      ? '"From" date must be before "To" date'
      : "";

  return (
    <Modal open={open} onClose={onClose} title="Export data" maxWidth="max-w-md">
      <div className="space-y-5 pt-1">
        {/* Section checklist */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="stat-label">Data to include</span>
            <button
              onClick={toggleAll}
              className="flex items-center gap-1 text-xs cursor-pointer"
              style={{ color: "var(--accent-text)" }}
            >
              {allChecked ? <CheckSquare size={13} /> : <Square size={13} />}
              {allChecked ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="space-y-1">
            {visibleTypes.map((t) => {
              const checked = selected.has(t.value);
              return (
                <button
                  key={t.value}
                  onClick={() => toggleItem(t.value)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-colors cursor-pointer hover:bg-[var(--surface-1)]"
                >
                  {checked ? (
                    <CheckSquare
                      size={16}
                      style={{ color: "var(--accent-color)", flexShrink: 0 }}
                    />
                  ) : (
                    <Square
                      size={16}
                      style={{ color: "var(--text-faint)", flexShrink: 0 }}
                    />
                  )}
                  <FileSpreadsheet
                    size={14}
                    style={{
                      color: checked ? "var(--accent-color)" : "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  />
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium leading-tight"
                      style={{
                        color: checked ? "var(--text-primary)" : "var(--text-muted)",
                      }}
                    >
                      {t.label}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>
                      {t.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date range */}
        <div>
          <span className="stat-label block mb-2">Date range</span>
          <SegmentedControl
            segments={DATE_RANGE_SEGMENTS}
            value={dateRange}
            onChange={setDateRange}
            layoutId="export-date-range"
            className="w-full"
          />
          {dateRange === "custom" && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <FormInput
                label="From"
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <FormInput
                label="To"
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
              {dateError && (
                <p className="col-span-2 text-xs text-destructive">{dateError}</p>
              )}
            </div>
          )}
          {dateRange === "all" && (
            <p className="mt-1.5 text-xs" style={{ color: "var(--text-faint)" }}>
              Exports all data with no date filter
            </p>
          )}
        </div>

        <Button
          onClick={handleExport}
          variant="primary"
          className="w-full"
          disabled={selected.size === 0 || !!dateError}
        >
          <Download size={15} />
          Export (.csv)
        </Button>
      </div>
    </Modal>
  );
}

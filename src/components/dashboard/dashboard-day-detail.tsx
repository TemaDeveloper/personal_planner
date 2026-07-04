"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SECTION_META, type SectionId } from "@/lib/constants";
import { Plus, Trash2, ArrowUpRight, Star } from "lucide-react";
import { ICON_MAP } from "@/lib/icon-map";
import { RenderedLayout } from "@/components/sections/rendered-layout";
import { CustomEntryForm } from "@/components/sections/custom-entry-form";

// Every section — built-in or AI-generated — is rendered uniformly from its
// template + CustomEntry rows (the same store the /sections pages read/write).
// The day view is read-only apart from add (opens the section's entry form) and
// delete (unified entries API); editing happens on the section page itself.

interface CustomField {
  key: string;
  label: string;
  type: "boolean" | "number" | "text" | "select" | "date";
  options?: string[];
  required?: boolean;
}

interface SectionData {
  template: { name: string; slug: string; icon: string; fields: CustomField[]; layoutHtml?: string };
  entries: { _id: string; date: string; data: Record<string, unknown> }[];
}

type DayData = Record<string, SectionData>;

interface DayDetailProps {
  date: string; // yyyy-MM-dd
  onDataChange: () => void;
}

// Built-in sections first (in canonical order), then custom sections after.
const BUILTIN_ORDER = Object.keys(SECTION_META);
function orderSections(slugs: string[]): string[] {
  return [...slugs].sort((a, b) => {
    const ai = BUILTIN_ORDER.indexOf(a);
    const bi = BUILTIN_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export function DashboardDayDetail({ date, onDataChange }: DayDetailProps) {
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/dashboard/day-detail?date=${date}`)
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((d) => {
        setData(d.sections || {});
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [date]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchData manages its own state transitions for data loading
  useEffect(() => { fetchData(); }, [fetchData]);

  const refresh = () => { fetchData(); onDataChange(); };

  const dateLabel = format(new Date(date + "T00:00:00"), "EEEE, MMM d");

  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 rounded-lg surface-inset text-center space-y-2">
        <p className="text-sm text-[var(--text-muted)]">Couldn&apos;t load {dateLabel}.</p>
        <button onClick={fetchData} className="text-xs font-medium text-[var(--accent-color)] hover:underline">
          Try again
        </button>
      </div>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="mt-4 p-4 rounded-lg surface-inset text-center">
        <p className="text-sm text-[var(--text-muted)]">No activity on {dateLabel}</p>
      </div>
    );
  }

  const sections = orderSections(Object.keys(data));

  return (
    <motion.div
      className="mt-4 space-y-3"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <p className="text-xs font-medium text-[var(--accent-color)]">{dateLabel}</p>
      {sections.map((slug) => (
        <SectionCard key={slug} section={data[slug]} date={date} onRefresh={refresh} />
      ))}
    </motion.div>
  );
}

function SectionCard({ section, date, onRefresh }: {
  section: SectionData; date: string; onRefresh: () => void;
}) {
  const { template } = section;
  const [adding, setAdding] = useState(false);

  const iconName = SECTION_META[template.slug as SectionId]?.icon || template.icon;
  const Icon = ICON_MAP[iconName] || Star;
  const href = SECTION_META[template.slug as SectionId]?.href || `/sections/${template.slug}`;

  return (
    <Card padding="md" className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon size={16} style={{ color: "var(--accent-color)" }} />
          <span className="text-sm font-semibold">{template.name}</span>
        </div>
        <Link
          href={href}
          className="flex items-center gap-0.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent-color)] transition-colors"
        >
          Open <ArrowUpRight size={12} />
        </Link>
      </div>

      <SectionEntries section={section} onRefresh={onRefresh} />

      {adding ? (
        <CustomEntryForm
          slug={template.slug}
          fields={template.fields}
          initialDate={date}
          onClose={() => setAdding(false)}
          onSuccess={() => { setAdding(false); onRefresh(); }}
        />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-color)] transition-colors mt-1"
        >
          <Plus size={12} /> Add entry
        </button>
      )}
    </Card>
  );
}

function SectionEntries({ section, onRefresh }: {
  section: SectionData; onRefresh: () => void;
}) {
  const { template, entries } = section;

  const del = async (id: string) => {
    const res = await fetch(`/api/sections/${template.slug}/entries/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); onRefresh(); }
    else toast.error("Couldn't delete entry");
  };

  if (template.layoutHtml) {
    const summaryData: Record<string, unknown> = {};
    for (const field of template.fields) {
      if (field.type === "number") {
        summaryData[field.key] = entries.reduce((sum, e) => sum + (Number(e.data[field.key]) || 0), 0);
      } else if (entries.length > 0) {
        summaryData[field.key] = entries[0].data[field.key];
      }
    }
    return (
      <RenderedLayout
        layoutHtml={template.layoutHtml}
        data={summaryData}
        fields={template.fields}
        entries={entries.map((e) => e.data)}
      />
    );
  }

  const displayFields = template.fields.filter((f) => f.type !== "boolean");
  const booleanFields = template.fields.filter((f) => f.type === "boolean");

  const formatValue = (field: CustomField, value: unknown): string => {
    if (value === undefined || value === null || value === "") return "—";
    if (field.type === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => (
        <div key={entry._id} className="flex items-center justify-between text-sm group">
          <div className="flex flex-wrap gap-2 items-center">
            {displayFields.map((f) => (
              <span key={f.key}>
                <span className="text-[var(--text-muted)] text-xs">{f.label}:</span>{" "}
                <span className="font-medium">{formatValue(f, entry.data[f.key])}</span>
              </span>
            ))}
            {booleanFields.map((f) =>
              entry.data[f.key] ? (
                <span key={f.key} className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: "var(--accent-glow)", color: "var(--accent-color)" }}>
                  {f.label}
                </span>
              ) : null
            )}
          </div>
          <button
            onClick={() => del(entry._id)}
            className="p-1 rounded hover:bg-[var(--surface-1)] text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete entry"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

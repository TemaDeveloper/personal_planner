"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CustomEntryForm } from "@/components/sections/custom-entry-form";
import { TableView } from "@/components/sections/table-view";
import { Plus, Trash2, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { ICON_MAP } from "@/lib/icon-map";
import { startOfWeek, addWeeks, addDays, format } from "date-fns";

interface FieldDef {
  key: string;
  label: string;
  type: "boolean" | "number" | "text" | "select" | "date";
  options?: string[];
  formula?: string;
}

interface Template {
  _id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  viewType?: "weekly-cards" | "table" | "grid";
  fields: FieldDef[];
}

interface Entry {
  _id: string;
  date: string;
  data: Record<string, unknown>;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function CustomSectionPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  useEffect(() => {
    const ws = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
    fetch(`/api/sections/${slug}/entries?weekOf=${ws.toISOString()}`)
      .then((r) => r.json())
      .then((d) => {
        setTemplate(d.template || null);
        setEntries(d.entries || []);
        setLoading(false);
      });
  }, [slug, weekOffset]);

  const getEntryForDay = (dayDate: Date) => {
    const dayStr = format(dayDate, "yyyy-MM-dd");
    return entries.find((e) => format(new Date(e.date), "yyyy-MM-dd") === dayStr);
  };

  const deleteEntry = async (id: string) => {
    await fetch(`/api/sections/${slug}/entries/${id}`, { method: "DELETE" });
    toast.success("Entry deleted");
    setEntries((prev) => prev.filter((e) => e._id !== id));
  };

  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;

  if (loading) {
    return (
      <div className="animate-slide-up">
        <Card padding="lg" className="h-32 animate-pulse" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Section not found" />
      </div>
    );
  }

  const Icon = ICON_MAP[template.icon] || ICON_MAP.Star;

  return (
    <div className="animate-slide-up">
      <PageHeader
        title={template.name}
        description={template.description}
        action={
          template.viewType !== "table" ? (
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} />
              Add
            </Button>
          ) : undefined
        }
      />

      {/* Table view for item-based sections */}
      {template.viewType === "table" ? (
        <TableView
          slug={slug}
          fields={template.fields}
          entries={entries}
          onAdd={() => setShowForm(true)}
          onRefresh={() => {
            const ws = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
            fetch(`/api/sections/${slug}/entries?weekOf=${ws.toISOString()}`)
              .then((r) => r.json())
              .then((d) => setEntries(d.entries || []));
          }}
        />
      ) : (
      <>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((p) => p - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <span className="text-sm font-medium">{weekLabel}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setWeekOffset((p) => p + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Weekly grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {DAYS.map((day, idx) => {
          const dayDate = addDays(weekStart, idx);
          const entry = getEntryForDay(dayDate);

          return (
            <Card key={day} padding="md" className="min-h-[120px] flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className={
                    "text-xs font-semibold " +
                    (entry ? "text-[var(--accent-color)]" : "text-[var(--text-muted)]")
                  }>
                    {day.slice(0, 3)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{format(dayDate, "MMM d")}</p>
                </div>
                {entry && (
                  <Icon size={14} className="text-[var(--accent-color)]" />
                )}
              </div>

              {entry ? (
                <div className="flex-1 space-y-1">
                  {template.fields.map((field) => {
                    const val = entry.data[field.key];
                    if (val === undefined || val === null || val === "") return null;
                    return (
                      <div key={field.key} className="text-xs">
                        <span className="text-muted-foreground">{field.label}: </span>
                        {field.type === "boolean" ? (
                          <Check size={10} className="inline text-[var(--accent-color)]" />
                        ) : (
                          <span>{String(val)}</span>
                        )}
                      </div>
                    );
                  })}
                  <button onClick={() => deleteEntry(entry._id)}
                    className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 mt-1 p-1">
                    <Trash2 size={10} /> Remove
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">—</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      </>
      )}

      {showForm && template && (
        <CustomEntryForm
          slug={slug}
          fields={template.fields}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            setWeekOffset(weekOffset); // trigger re-fetch
            // Re-fetch entries
            const ws = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
            fetch(`/api/sections/${slug}/entries?weekOf=${ws.toISOString()}`)
              .then((r) => r.json())
              .then((d) => setEntries(d.entries || []));
          }}
        />
      )}
    </div>
  );
}

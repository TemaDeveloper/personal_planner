"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2, NotebookPen, Check } from "lucide-react";
import { format } from "date-fns";
import { CustomEntryForm } from "@/components/sections/custom-entry-form";
import { useSectionEntries, type SectionFieldDef } from "@/components/sections/use-section-entries";
import { resolveComputed } from "@/lib/compute/primitives";
import { formatComputed } from "@/lib/compute/format";

export function DailyLogView({ slug, fields }: { slug: string; fields: SectionFieldDef[] }) {
  const { entries, loading, refresh } = useSectionEntries(slug);
  const [showForm, setShowForm] = useState(false);

  const remove = async (id: string) => {
    const res = await fetch(`/api/sections/${slug}/entries/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); refresh(); } else toast.error("Failed to delete");
  };

  if (loading) return <Card padding="lg">Loading…</Card>;

  const byDateDesc = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setShowForm(true)}><Plus size={14} /> Add</Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={NotebookPen} title="No entries yet" description="Add your first log entry." actionLabel="Add" onAction={() => setShowForm(true)} />
      ) : (
        <div className="space-y-3">
          {byDateDesc.map((entry) => (
            <Card key={entry._id} padding="md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: "var(--accent-color)" }}>
                  {format(new Date(entry.date), "EEE, MMM d")}
                </span>
                <button onClick={() => remove(entry._id)} aria-label="Delete"
                  className="text-[var(--text-muted)] hover:text-[var(--alert)] cursor-pointer p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="space-y-1">
                {fields.map((f) => {
                  if (f.computation) {
                    const cv = resolveComputed(f.computation, entry.data);
                    if (!cv) return null;
                    const fc = formatComputed(cv);
                    return (
                      <div key={f.key} className="text-sm">
                        <span className="text-[var(--text-muted)]">{f.label}: </span>
                        <span className="num font-semibold" style={{ color: fc.warn ? "var(--alert)" : "var(--accent-text)" }}>{fc.text}</span>
                      </div>
                    );
                  }
                  const v = entry.data[f.key];
                  if (v === undefined || v === null || v === "") return null;
                  return (
                    <div key={f.key} className="text-sm">
                      <span className="text-[var(--text-muted)]">{f.label}: </span>
                      {f.type === "boolean" ? (
                        v ? <Check size={13} className="inline" style={{ color: "var(--accent-color)" }} /> : <span className="text-[var(--text-faint)]">—</span>
                      ) : (
                        <span className={f.type === "number" ? "num text-[var(--text-primary)]" : "text-[var(--text-primary)]"}>{String(v)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <CustomEntryForm slug={slug} fields={fields} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); refresh(); }} />
      )}
    </>
  );
}

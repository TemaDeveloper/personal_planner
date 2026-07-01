"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2, Target } from "lucide-react";
import { CustomEntryForm } from "@/components/sections/custom-entry-form";
import { useSectionEntries, type SectionFieldDef } from "@/components/sections/use-section-entries";
import { resolveComputed } from "@/lib/compute/primitives";
import { formatComputed } from "@/lib/compute/format";

export function GoalProgressView({ slug, fields }: { slug: string; fields: SectionFieldDef[] }) {
  const { entries, loading, refresh } = useSectionEntries(slug);
  const [showForm, setShowForm] = useState(false);

  const titleField = fields.find((f) => f.type === "text");
  const computed = fields.filter((f) => f.computation);
  const plainFields = fields.filter((f) => !f.computation && f !== titleField);

  const remove = async (id: string) => {
    const res = await fetch(`/api/sections/${slug}/entries/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); refresh(); } else toast.error("Failed to delete");
  };

  if (loading) return <Card padding="lg">Loading…</Card>;

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setShowForm(true)}><Plus size={14} /> Add</Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={Target} title="Nothing here yet" description="Add your first item to track progress." actionLabel="Add" onAction={() => setShowForm(true)} />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <Card key={entry._id} padding="md">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {titleField ? String(entry.data[titleField.key] ?? "Untitled") : "Item"}
                </p>
                <button onClick={() => remove(entry._id)} aria-label="Delete"
                  className="text-[var(--text-muted)] hover:text-[var(--alert)] cursor-pointer p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <Trash2 size={12} />
                </button>
              </div>

              {computed.map((f) => {
                const cv = resolveComputed(f.computation!, entry.data);
                if (!cv) return null;
                if (cv.kind === "target_progress") {
                  const pct = cv.value.pct;
                  return (
                    <div key={f.key} className="mt-2">
                      <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                        <span>{f.label}</span><span className="num">{pct}%</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--accent-color)" }} />
                      </div>
                    </div>
                  );
                }
                const fc = formatComputed(cv);
                return (
                  <div key={f.key} className="mt-2 text-xs">
                    <span className="text-[var(--text-muted)]">{f.label}: </span>
                    <span className="num font-semibold" style={{ color: fc.warn ? "var(--alert)" : "var(--accent-text)" }}>{fc.text}</span>
                  </div>
                );
              })}

              {plainFields.some((f) => entry.data[f.key] !== undefined && entry.data[f.key] !== "") && (
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {plainFields.map((f) => {
                    const v = entry.data[f.key];
                    if (v === undefined || v === null || v === "") return null;
                    return (
                      <span key={f.key} className="text-xs text-[var(--text-muted)]">
                        {f.label}: <span className="text-[var(--text-primary)]">{String(v)}</span>
                      </span>
                    );
                  })}
                </div>
              )}
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

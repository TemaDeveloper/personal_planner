"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { CustomEntryForm } from "@/components/sections/custom-entry-form";
import { useSectionEntries, type SectionFieldDef } from "@/components/sections/use-section-entries";
import { evalFormula } from "@/lib/compute/formula";

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export function WorkEarningsView({ slug, fields }: { slug: string; fields: SectionFieldDef[] }) {
  const { entries, loading, refresh } = useSectionEntries(slug);
  const [showForm, setShowForm] = useState(false);

  const remove = async (id: string) => {
    const res = await fetch(`/api/sections/${slug}/entries/${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); refresh(); } else toast.error("Failed to delete");
  };

  const gross = (d: Record<string, unknown>) => evalFormula("hours * hourly_rate", d) ?? 0;

  const totals = entries.reduce(
    (acc, e) => {
      acc.hours += n(e.data.hours);
      acc.gross += gross(e.data);
      acc.fuel += n(e.data.fuel);
      return acc;
    },
    { hours: 0, gross: 0, fuel: 0 }
  );
  const net = Math.round((totals.gross - totals.fuel) * 100) / 100;

  // Per-job breakdown
  const byJob = new Map<string, { hours: number; gross: number }>();
  for (const e of entries) {
    const job = String(e.data.job ?? "—");
    const cur = byJob.get(job) ?? { hours: 0, gross: 0 };
    cur.hours += n(e.data.hours);
    cur.gross += gross(e.data);
    byJob.set(job, cur);
  }
  const jobs = [...byJob.entries()].sort((a, b) => b[1].gross - a[1].gross);

  if (loading) return <Card padding="lg">Loading…</Card>;

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setShowForm(true)}><Plus size={14} /> Log hours</Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={Briefcase} title="No hours logged" description="Log a shift to track your earnings." actionLabel="Log hours" onAction={() => setShowForm(true)} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <Card padding="md"><p className="stat-label">Hours</p><p className="text-xl font-semibold num text-[var(--text-primary)]">{totals.hours}</p></Card>
            <Card padding="md"><p className="stat-label">Gross</p><p className="text-xl font-semibold num text-[var(--text-primary)]">{totals.gross.toFixed(2)}</p></Card>
            <Card padding="md"><p className="stat-label">Fuel</p><p className="text-xl font-semibold num text-[var(--text-primary)]">{totals.fuel.toFixed(2)}</p></Card>
            <Card padding="md"><p className="stat-label">Net</p><p className="text-xl font-semibold num" style={{ color: net < 0 ? "var(--alert)" : "var(--accent-text)" }}>{net.toFixed(2)}</p></Card>
          </div>

          {jobs.length > 1 && (
            <Card padding="md" className="mb-4">
              <p className="stat-label mb-2">By job</p>
              {jobs.map(([job, v]) => (
                <div key={job} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-[var(--text-primary)]">{job}</span>
                  <span className="text-[var(--text-muted)]"><span className="num">{v.hours}</span>h · <span className="num">{v.gross.toFixed(2)}</span></span>
                </div>
              ))}
            </Card>
          )}

          <Card padding="lg">
            <div className="space-y-1">
              {entries.map((e) => {
                const g = gross(e.data);
                const rowNet = Math.round((g - n(e.data.fuel)) * 100) / 100;
                return (
                  <div key={e._id} className="flex items-center py-2 border-b text-sm" style={{ borderColor: "var(--border-subtle)" }}>
                    <span className="w-20 text-xs text-[var(--text-muted)]">{format(new Date(e.date), "MMM d")}</span>
                    <span className="flex-1 text-[var(--text-primary)]">{String(e.data.job ?? "")}</span>
                    <span className="w-14 text-right num text-[var(--text-muted)]">{n(e.data.hours)}h</span>
                    <span className="w-20 text-right num font-medium" style={{ color: "var(--accent-text)" }}>{rowNet.toFixed(2)}</span>
                    <button onClick={() => remove(e._id)} aria-label="Delete" className="ml-2 text-[var(--text-muted)] hover:text-[var(--alert)] cursor-pointer p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {showForm && (
        <CustomEntryForm slug={slug} fields={fields} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); refresh(); }} />
      )}
    </>
  );
}

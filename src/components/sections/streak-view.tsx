"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Flame } from "lucide-react";
import { format } from "date-fns";
import { CustomEntryForm } from "@/components/sections/custom-entry-form";
import {
  useSectionEntries,
  sortByDateAsc,
  type SectionFieldDef,
} from "@/components/sections/use-section-entries";
import { dayStreak, isDone } from "@/lib/compute/aggregates";

export function StreakView({ slug, fields }: { slug: string; fields: SectionFieldDef[] }) {
  const { entries, loading, refresh } = useSectionEntries(slug);
  const [showForm, setShowForm] = useState(false);

  const boolField = fields.find((f) => f.type === "boolean");
  const asc = sortByDateAsc(entries);
  // An entry counts as "done" if it has no boolean field (mere presence) or the flag is truthy.
  const entryDone = (e: (typeof asc)[number]) =>
    boolField ? isDone(e.data[boolField.key]) : true;
  // Streak is by calendar day (gaps break it), not by row count.
  const { current, longest } = dayStreak(asc.filter(entryDone).map((e) => e.date));
  const recent = asc.slice(-28);

  if (loading) return <Card padding="lg">Loading…</Card>;

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button size="sm" onClick={() => setShowForm(true)}><Plus size={14} /> Add</Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState icon={Flame} title="No streak yet" description="Log a day to start your streak." actionLabel="Add" onAction={() => setShowForm(true)} />
      ) : (
        <Card padding="lg">
          <div className="flex gap-8">
            <div>
              <p className="stat-label">Current streak</p>
              <p className="text-3xl font-semibold num" style={{ color: "var(--accent-color)" }}>{current}</p>
            </div>
            <div>
              <p className="stat-label">Longest</p>
              <p className="text-3xl font-semibold num text-[var(--text-primary)]">{longest}</p>
            </div>
            <div>
              <p className="stat-label">Logged</p>
              <p className="text-3xl font-semibold num text-[var(--text-primary)]">{entries.length}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-6">
            {recent.map((e) => (
              <div
                key={e._id}
                title={format(new Date(e.date), "MMM d")}
                className="w-6 h-6 rounded"
                style={{ background: entryDone(e) ? "var(--accent-color)" : "var(--surface-2)" }}
              />
            ))}
          </div>
        </Card>
      )}

      {showForm && (
        <CustomEntryForm slug={slug} fields={fields} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); refresh(); }} />
      )}
    </>
  );
}

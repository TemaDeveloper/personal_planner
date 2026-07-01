"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { CustomEntryForm } from "@/components/sections/custom-entry-form";
import {
  useSectionEntries,
  sortByDateAsc,
  type SectionFieldDef,
} from "@/components/sections/use-section-entries";

export function TrendView({ slug, fields }: { slug: string; fields: SectionFieldDef[] }) {
  const { entries, loading, refresh } = useSectionEntries(slug);
  const [showForm, setShowForm] = useState(false);

  const numericFields = fields.filter((f) => f.type === "number" && !f.computation);
  const [activeKey, setActiveKey] = useState<string>(numericFields[0]?.key ?? "");
  const key = activeKey || numericFields[0]?.key || "";
  const activeLabel = numericFields.find((f) => f.key === key)?.label ?? "Value";

  const data = sortByDateAsc(entries)
    .map((e) => ({ date: format(new Date(e.date), "MMM d"), value: Number(e.data[key]) }))
    .filter((d) => Number.isFinite(d.value));

  if (loading) return <Card padding="lg">Loading…</Card>;

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {numericFields.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveKey(f.key)}
              className="text-xs px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              style={{
                background: "var(--surface-2)",
                border: `1px solid ${key === f.key ? "var(--accent-color)" : "var(--border-subtle)"}`,
                color: key === f.key ? "var(--accent-color)" : "var(--text-muted)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}><Plus size={14} /> Add</Button>
      </div>

      {data.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No data yet" description="Log a few entries to see the trend." actionLabel="Add" onAction={() => setShowForm(true)} />
      ) : (
        <Card padding="lg">
          <p className="stat-label mb-3">{activeLabel}</p>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="var(--accent-color)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {showForm && (
        <CustomEntryForm slug={slug} fields={fields} onClose={() => setShowForm(false)} onSuccess={() => { setShowForm(false); refresh(); }} />
      )}
    </>
  );
}

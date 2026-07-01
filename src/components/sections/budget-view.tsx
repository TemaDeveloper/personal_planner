"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2, Wallet } from "lucide-react";
import { format } from "date-fns";
import { CustomEntryForm } from "@/components/sections/custom-entry-form";
import { useSectionEntries, type SectionFieldDef } from "@/components/sections/use-section-entries";

export function BudgetView({ slug, fields }: { slug: string; fields: SectionFieldDef[] }) {
  const { entries, loading, refresh } = useSectionEntries(slug);
  const [showForm, setShowForm] = useState(false);

  const amountField = fields.find((f) => f.type === "number");
  const typeField = fields.find((f) => f.type === "select" && (f.options || []).includes("income"));
  const labelField = fields.find((f) => f.type === "text");

  const amountKey = amountField?.key ?? "amount";
  const typeKey = typeField?.key ?? "type";

  let income = 0;
  let expense = 0;
  for (const e of entries) {
    const amt = Number(e.data[amountKey]) || 0;
    if (String(e.data[typeKey]) === "income") income += amt;
    else expense += amt;
  }
  const net = Math.round((income - expense) * 100) / 100;

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
        <EmptyState icon={Wallet} title="No entries yet" description="Add income or an expense to see your balance." actionLabel="Add" onAction={() => setShowForm(true)} />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Card padding="md"><p className="stat-label">Income</p><p className="text-xl font-semibold num" style={{ color: "var(--positive, #2e6b4f)" }}>{income.toFixed(2)}</p></Card>
            <Card padding="md"><p className="stat-label">Expense</p><p className="text-xl font-semibold num text-[var(--text-primary)]">{expense.toFixed(2)}</p></Card>
            <Card padding="md"><p className="stat-label">Net</p><p className="text-xl font-semibold num" style={{ color: net < 0 ? "var(--alert)" : "var(--accent-text)" }}>{net.toFixed(2)}</p></Card>
          </div>

          <Card padding="lg">
            <div className="space-y-1">
              {entries.map((e) => (
                <div key={e._id} className="flex items-center py-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
                  <span className="w-20 text-xs text-[var(--text-muted)]">{format(new Date(e.date), "MMM d")}</span>
                  <span className="flex-1 text-sm text-[var(--text-primary)]">{labelField ? String(e.data[labelField.key] ?? "") : ""}</span>
                  <span className="num text-sm font-medium" style={{ color: String(e.data[typeKey]) === "income" ? "var(--positive, #2e6b4f)" : "var(--text-primary)" }}>
                    {String(e.data[typeKey]) === "income" ? "+" : "−"}{(Number(e.data[amountKey]) || 0).toFixed(2)}
                  </span>
                  <button onClick={() => remove(e._id)} aria-label="Delete" className="ml-2 text-[var(--text-muted)] hover:text-[var(--alert)] cursor-pointer p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
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

"use client";

import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus, Trash2, Check, TableIcon } from "lucide-react";
import { format } from "date-fns";

interface FieldDef {
  key: string;
  label: string;
  type: string;
  formula?: string;
}

interface Entry {
  _id: string;
  date: string;
  data: Record<string, unknown>;
}

interface TableViewProps {
  slug: string;
  fields: FieldDef[];
  entries: Entry[];
  onAdd: () => void;
  onRefresh: () => void;
}

export function TableView({ slug, fields, entries, onAdd, onRefresh }: TableViewProps) {
  const deleteEntry = async (id: string) => {
    const res = await fetch(`/api/sections/${slug}/entries/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Entry deleted");
      onRefresh();
    } else {
      toast.error("Failed to delete");
    }
  };

  // Calculate totals for number fields
  const totals: Record<string, number> = {};
  for (const f of fields) {
    if (f.type === "number") {
      totals[f.key] = entries.reduce((sum, e) => sum + (Number(e.data[f.key]) || 0), 0);
    }
  }

  return (
    <Card className="overflow-x-auto" padding="lg">
      <div className="flex items-center justify-between mb-4">
        <p className="stat-label">
          <span className="num">{entries.length}</span> entries
        </p>
        <Button size="sm" onClick={onAdd}>
          <Plus size={14} />
          Add Entry
        </Button>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={TableIcon}
          title="No entries yet"
          description="Click Add Entry to start tracking data in this section."
          actionLabel="Add Entry"
          onAction={onAdd}
        />
      ) : (
        <div className="min-w-[600px]">
          {/* Header row */}
          <div className="flex border-b pb-2 mb-1" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="w-24 flex-shrink-0 stat-label">
              Date
            </div>
            {fields.map((f) => (
              <div
                key={f.key}
                className="flex-1 min-w-[100px] stat-label px-2"
              >
                {f.label}
              </div>
            ))}
            <div className="w-10 flex-shrink-0" />
          </div>

          {/* Data rows */}
          {entries.map((entry) => (
            <div
              key={entry._id}
              className="flex items-center py-2 border-b hover:bg-[var(--surface-1)] transition-colors"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="w-24 flex-shrink-0 text-xs font-medium text-[var(--text-muted)]">
                {format(new Date(entry.date), "MMM d")}
              </div>
              {fields.map((f) => {
                const val = entry.data[f.key];
                return (
                  <div key={f.key} className="flex-1 min-w-[100px] text-sm px-2 text-[var(--text-primary)]">
                    {f.type === "boolean" ? (
                      val ? (
                        <Check size={14} style={{ color: "var(--accent-color)" }} />
                      ) : (
                        <span className="text-[var(--text-faint)]">—</span>
                      )
                    ) : f.type === "number" ? (
                      <span
                        className={f.formula ? "font-semibold num" : "num"}
                        style={f.formula ? { color: "var(--accent-text)" } : undefined}
                      >
                        {val !== undefined && val !== null ? Number(val).toFixed(2) : "—"}
                      </span>
                    ) : (
                      <span>{val ? String(val) : <span className="text-[var(--text-faint)]">—</span>}</span>
                    )}
                  </div>
                );
              })}
              <div className="w-10 flex-shrink-0 flex items-center justify-center">
                <button
                  onClick={() => deleteEntry(entry._id)}
                  className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--alert)] transition-colors cursor-pointer"
                  title="Delete entry"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          {/* Totals row */}
          <div
            className="flex items-center py-3 font-semibold border-t-2"
            style={{ borderColor: "var(--border-subtle)" }}
          >
            <div className="w-24 flex-shrink-0 stat-label">
              Total
            </div>
            {fields.map((f) => (
              <div key={f.key} className="flex-1 min-w-[100px] text-sm px-2">
                {f.type === "number" ? (
                  <span className="num font-semibold text-[var(--accent-text)]">
                    {totals[f.key]?.toFixed(2) ?? "—"}
                  </span>
                ) : (
                  <span />
                )}
              </div>
            ))}
            <div className="w-10 flex-shrink-0" />
          </div>
        </div>
      )}
    </Card>
  );
}

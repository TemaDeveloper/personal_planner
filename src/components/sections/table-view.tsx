"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check } from "lucide-react";
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
    <Card className="overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          {entries.length} entries
        </p>
        <Button size="sm" onClick={onAdd}>
          <Plus size={14} />
          Add Entry
        </Button>
      </div>

      <div className="min-w-[600px]">
        {/* Header row */}
        <div className="flex border-b pb-2 mb-1" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="w-24 flex-shrink-0 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            Date
          </div>
          {fields.map((f) => (
            <div
              key={f.key}
              className="flex-1 min-w-[100px] text-[10px] font-semibold uppercase tracking-wider px-2"
              style={{ color: "var(--text-muted)" }}
            >
              {f.label}
            </div>
          ))}
          <div className="w-10 flex-shrink-0" />
        </div>

        {/* Data rows */}
        {entries.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No entries yet. Click Add Entry to start tracking.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry._id}
              className="flex items-center py-2 border-b hover:bg-[var(--surface-1)] transition-colors"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="w-24 flex-shrink-0 text-xs font-medium">
                {format(new Date(entry.date), "MMM d")}
              </div>
              {fields.map((f) => {
                const val = entry.data[f.key];
                return (
                  <div key={f.key} className="flex-1 min-w-[100px] text-sm px-2">
                    {f.type === "boolean" ? (
                      val ? <Check size={14} style={{ color: "var(--accent-color)" }} /> : <span className="text-muted-foreground">—</span>
                    ) : f.type === "number" ? (
                      <span className={f.formula ? "font-semibold" : ""} style={f.formula ? { color: "var(--accent-color)" } : undefined}>
                        {val !== undefined && val !== null ? Number(val).toFixed(2) : "—"}
                      </span>
                    ) : (
                      <span>{val ? String(val) : "—"}</span>
                    )}
                  </div>
                );
              })}
              <div className="w-10 flex-shrink-0">
                <button
                  onClick={() => deleteEntry(entry._id)}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  title="Delete entry"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}

        {/* Totals row */}
        {entries.length > 0 && (
          <div className="flex items-center py-3 font-semibold border-t" style={{ borderColor: "var(--accent-color)", borderTopWidth: 2 }}>
            <div className="w-24 flex-shrink-0 text-xs uppercase tracking-wider" style={{ color: "var(--accent-color)" }}>
              Total
            </div>
            {fields.map((f) => (
              <div key={f.key} className="flex-1 min-w-[100px] text-sm px-2">
                {f.type === "number" ? (
                  <span style={{ color: "var(--accent-color)" }}>
                    {totals[f.key]?.toFixed(2) ?? "—"}
                  </span>
                ) : (
                  <span />
                )}
              </div>
            ))}
            <div className="w-10 flex-shrink-0" />
          </div>
        )}
      </div>
    </Card>
  );
}

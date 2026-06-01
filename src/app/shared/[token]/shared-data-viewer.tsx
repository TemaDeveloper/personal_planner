"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

interface WorkSummary {
  grossEarnings: number;
  gasCost: number;
  net: number;
  totalKm: number;
  litres: number;
}

interface SharedData {
  sectionType: string;
  scopeFilter: string | null;
  ownerName: string;
  data: Record<string, unknown>[];
  meta?: Record<string, unknown>;
  summary?: WorkSummary | null;
  routes?: Record<string, unknown>[] | null;
}

const HIDDEN_KEYS = ["_id", "__v", "userId", "createdAt", "updatedAt", "templateId"];
// Columns whose numeric values should display as money.
const CURRENCY_KEYS = new Set(["Total", "Amount"]);

function money(n: number): string {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });
}

function formatCell(key: string, val: unknown): string {
  if (CURRENCY_KEYS.has(key) && typeof val === "number") return money(val);
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    try {
      return format(new Date(val), "MMM d, yyyy");
    } catch {
      /* keep raw */
    }
  }
  return String(val ?? "");
}

function DataTable({ rows }: { rows: Record<string, unknown>[] }) {
  const keys = Object.keys(rows[0]).filter((k) => !HIDDEN_KEYS.includes(k));

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              {keys.map((key) => (
                <th
                  key={key}
                  className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider"
                >
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                {keys.map((key) => (
                  <td key={key} className="px-4 py-3 text-white/80">
                    {formatCell(key, row[key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ summary }: { summary: WorkSummary }) {
  const items: { label: string; value: string; accent?: boolean }[] = [
    { label: "Gross earnings", value: money(summary.grossEarnings) },
    { label: "Gas cost", value: money(summary.gasCost) },
    { label: "Net", value: money(summary.net), accent: true },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
        >
          <p className="text-xs uppercase tracking-wider text-white/40">{it.label}</p>
          <p
            className={
              "mt-1 text-lg font-semibold " +
              (it.accent ? "text-indigo-300" : "text-white")
            }
          >
            {it.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function SharedDataViewer({ token }: { token: string }) {
  const [shared, setShared] = useState<SharedData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/shared/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setShared)
      .catch(() => setError("Failed to load shared data"));
  }, [token]);

  if (error) return <p className="text-red-400 text-sm">{error}</p>;
  if (!shared) return <p className="text-white/40 text-sm animate-pulse">Loading...</p>;

  const rows = Array.isArray(shared.data) ? shared.data : [];
  const routes = Array.isArray(shared.routes) ? shared.routes : [];

  return (
    <div className="space-y-8">
      {rows.length === 0 ? (
        <p className="text-white/40 text-sm">No data to show yet.</p>
      ) : (
        <DataTable rows={rows} />
      )}

      {shared.summary && (
        <div className="space-y-3">
          <SummaryCard summary={shared.summary} />
          <p className="text-xs text-white/40">
            {`Net = earnings − gas · ${shared.summary.totalKm} km driven · ${shared.summary.litres} L used`}
          </p>
        </div>
      )}

      {routes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/70">
            Gas &amp; Routes — all routes, all time
          </h2>
          <DataTable rows={routes} />
        </div>
      )}
    </div>
  );
}

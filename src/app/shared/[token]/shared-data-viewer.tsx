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

function isNumericKey(key: string, rows: Record<string, unknown>[]): boolean {
  if (CURRENCY_KEYS.has(key)) return true;
  const vals = rows
    .map((r) => r[key])
    .filter((v) => v !== "" && v !== null && v !== undefined);
  return vals.length > 0 && vals.every((v) => typeof v === "number");
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
  const numeric = Object.fromEntries(keys.map((k) => [k, isNumericKey(k, rows)]));

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden bg-white/[0.02]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-white/[0.05]">
              {keys.map((key) => (
                <th
                  key={key}
                  className={
                    "px-4 py-3 text-xs font-semibold text-white/50 uppercase tracking-wider whitespace-nowrap " +
                    (numeric[key] ? "text-right" : "text-left")
                  }
                >
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className="border-t border-white/5 transition-colors hover:bg-indigo-400/10"
              >
                {keys.map((key) => (
                  <td
                    key={key}
                    className={
                      "px-4 py-3 text-white/85 whitespace-nowrap " +
                      (numeric[key] ? "text-right tabular-nums font-medium" : "text-left")
                    }
                  >
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

function SummaryCards({ summary }: { summary: WorkSummary }) {
  const items: { label: string; value: string; accent?: boolean }[] = [
    { label: "Gross earnings", value: money(summary.grossEarnings), accent: true },
    { label: "Gas cost", value: money(summary.gasCost) },
    { label: "Net", value: money(summary.net) },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className={
            "rounded-xl border p-4 " +
            (it.accent
              ? "border-indigo-400/40 bg-indigo-500/10 ring-1 ring-indigo-400/20"
              : "border-white/10 bg-white/[0.03]")
          }
        >
          <p
            className={
              "text-xs uppercase tracking-wider " +
              (it.accent ? "text-indigo-200/80" : "text-white/40")
            }
          >
            {it.label}
          </p>
          <p
            className={
              "mt-1 text-2xl font-bold tabular-nums " +
              (it.accent ? "text-indigo-200" : "text-white")
            }
          >
            {it.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Dot-leader breakdown: label .......... value, with a totalled bottom line. */
function EarningsBreakdown({ summary }: { summary: WorkSummary }) {
  const lines: { label: string; value: number; sign?: "minus" }[] = [
    { label: "Gross earnings", value: summary.grossEarnings },
    { label: "Gas & fuel", value: summary.gasCost, sign: "minus" },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <h2 className="text-sm font-semibold text-white/70 mb-4">Earnings breakdown</h2>
      <div className="space-y-2.5 max-w-md">
        {lines.map((l) => (
          <div key={l.label} className="flex items-baseline gap-2 text-sm">
            <span className="text-white/70">{l.label}</span>
            <span className="flex-1 border-b border-dotted border-white/20 translate-y-[-3px]" />
            <span
              className={
                "tabular-nums font-medium " +
                (l.sign === "minus" ? "text-rose-300" : "text-white/90")
              }
            >
              {l.sign === "minus" ? "−" : ""}
              {money(l.value)}
            </span>
          </div>
        ))}
        <div className="flex items-baseline gap-2 pt-2.5 mt-1 border-t border-white/15">
          <span className="font-semibold text-white uppercase tracking-wide text-sm">
            Net total
          </span>
          <span className="flex-1 border-b border-dotted border-white/20 translate-y-[-3px]" />
          <span className="tabular-nums font-bold text-lg text-indigo-200">
            {money(summary.net)}
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs text-white/40">
        {`${summary.totalKm} km driven · ${summary.litres} L used`}
      </p>
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
      <div className="flex items-center justify-end">
        <a
          href={`/api/shared/${token}/export`}
          download
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export to Excel
        </a>
      </div>

      {shared.summary && (
        <div className="space-y-6">
          <SummaryCards summary={shared.summary} />
          <EarningsBreakdown summary={shared.summary} />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-white/40 text-sm">No data to show yet.</p>
      ) : (
        <DataTable rows={rows} />
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

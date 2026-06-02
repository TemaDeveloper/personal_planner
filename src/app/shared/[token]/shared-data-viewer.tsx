"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

interface WorkJobBreakdown {
  jobName: string;
  hours: number;
  rate: number;
  total: number;
}

interface WorkSummary {
  grossEarnings: number;
  gasCost: number;
  net: number;
  totalKm: number;
  litres: number;
  byJob: WorkJobBreakdown[];
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

function fmtDate(val: unknown): string {
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
    try {
      return format(new Date(val), "MMM d, yyyy");
    } catch {
      /* keep raw */
    }
  }
  return String(val ?? "");
}

function formatCell(key: string, val: unknown): string {
  if (CURRENCY_KEYS.has(key) && typeof val === "number") return money(val);
  return fmtDate(val);
}

/* ---------- Data table ---------- */
function DataTable({ rows }: { rows: Record<string, unknown>[] }) {
  const keys = Object.keys(rows[0]).filter((k) => !HIDDEN_KEYS.includes(k));
  const numeric = Object.fromEntries(keys.map((k) => [k, isNumericKey(k, rows)]));

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/[0.02]">
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
                className="border-t border-white/5 transition-colors duration-200 hover:bg-indigo-400/10"
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

interface BreakdownItem {
  key: string;
  primary: string;
  secondary: string;
  value: number;
}

/**
 * Builds the itemized lines under "Gross earnings".
 * - Single job: one line per session (the task note, with date + hours as context).
 * - Multiple jobs: one line per job (name, with hours × rate as context).
 */
function buildBreakdown(
  summary: WorkSummary,
  rows: Record<string, unknown>[]
): BreakdownItem[] {
  if (summary.byJob.length <= 1) {
    return rows.map((r, i) => {
      const note = typeof r["Note"] === "string" ? r["Note"].trim() : "";
      const date = fmtDate(r["Date"]);
      const hours = typeof r["Hours"] === "number" ? `${r["Hours"]}h` : "";
      return {
        key: String(i),
        primary: note || date || `Session ${i + 1}`,
        secondary: [note ? date : "", hours].filter(Boolean).join(" · "),
        value: typeof r["Total"] === "number" ? r["Total"] : 0,
      };
    });
  }
  return summary.byJob.map((j) => ({
    key: j.jobName,
    primary: j.jobName,
    secondary: `${j.hours}h × ${money(j.rate)}/h`,
    value: j.total,
  }));
}

/* ---------- The single earnings card: every money number lives here ---------- */
function EarningsCard({
  summary,
  rows,
}: {
  summary: WorkSummary;
  rows: Record<string, unknown>[];
}) {
  const items = buildBreakdown(summary, rows);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
      {/* Gross earnings — the highlighted headline */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold uppercase tracking-wider text-indigo-300">
          Gross earnings
        </span>
        <span className="tabular-nums text-2xl font-bold text-indigo-200">
          {money(summary.grossEarnings)}
        </span>
      </div>

      <div className="my-4 border-t border-white/10" />

      {/* Itemized lines */}
      <div className="space-y-3 text-sm">
        {items.length === 0 ? (
          <p className="text-white/40">No sessions recorded.</p>
        ) : (
          items.map((it) => (
            <div key={it.key} className="flex items-baseline gap-3">
              <span className="min-w-0 truncate text-white/80">
                {it.primary}
                {it.secondary && (
                  <span className="text-white/35"> · {it.secondary}</span>
                )}
              </span>
              <span className="flex-1 border-b border-dotted border-white/15 translate-y-[-4px]" />
              <span className="tabular-nums font-medium text-white/90">
                {money(it.value)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Gas deduction */}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-baseline gap-3 text-sm">
        <span className="text-white/60">
          Gas &amp; fuel
          <span className="text-white/35"> · {summary.totalKm} km · {summary.litres} L</span>
        </span>
        <span className="flex-1 border-b border-dotted border-white/15 translate-y-[-4px]" />
        <span className="tabular-nums font-medium text-rose-300">
          −{money(summary.gasCost)}
        </span>
      </div>

      {/* Net total — the bottom line */}
      <div className="mt-4 pt-4 border-t-2 border-white/20 flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold uppercase tracking-wide text-white">Total</span>
        <span className="tabular-nums text-3xl font-bold text-emerald-300">
          {money(summary.net)}
        </span>
      </div>
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
  const summary = shared.summary ?? null;
  // For a single-job share the earnings card already itemizes every session,
  // so the sessions table would only repeat it — show it only for multi-job.
  const showSessions = summary
    ? rows.length > 0 && summary.byJob.length > 1
    : rows.length > 0;
  const sessionsTitle = summary ? "Sessions" : "Records";

  const exportButton = (
    <a
      href={`/api/shared/${token}/export`}
      download
      className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/80 transition-colors duration-200 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Export to Excel
    </a>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">{exportButton}</div>

      {summary && <EarningsCard summary={summary} rows={rows} />}

      {showSessions || routes.length > 0 ? (
        <div
          className={
            "grid gap-6 " +
            (showSessions && routes.length > 0 ? "lg:grid-cols-2" : "grid-cols-1")
          }
        >
          {showSessions && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                {sessionsTitle}
              </h2>
              <DataTable rows={rows} />
            </div>
          )}
          {routes.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Routes
              </h2>
              <DataTable rows={routes} />
            </div>
          )}
        </div>
      ) : (
        !summary && <p className="text-white/40 text-sm">No data to show yet.</p>
      )}
    </div>
  );
}

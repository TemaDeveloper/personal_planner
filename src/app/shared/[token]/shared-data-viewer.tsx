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

/* ---------- A single dot-leader line: label .......... value ---------- */
function LeaderLine({
  label,
  value,
  sign,
  emphasis,
}: {
  label: React.ReactNode;
  value: number;
  sign?: "minus";
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span
        className={
          emphasis
            ? "font-semibold text-white"
            : "text-white/65"
        }
      >
        {label}
      </span>
      <span className="flex-1 border-b border-dotted border-white/15 translate-y-[-4px]" />
      <span
        className={
          "tabular-nums " +
          (sign === "minus"
            ? "text-rose-300"
            : emphasis
            ? "font-bold text-indigo-200"
            : "font-medium text-white/90")
        }
      >
        {sign === "minus" ? "−" : ""}
        {money(value)}
      </span>
    </div>
  );
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

/* ---------- Stat card (used in the bento row) ---------- */
function StatCard({
  label,
  value,
  hero,
  icon,
}: {
  label: string;
  value: string;
  hero?: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={
        "relative overflow-hidden rounded-2xl border p-5 " +
        (hero
          ? "sm:col-span-2 border-indigo-400/40 bg-gradient-to-br from-indigo-500/25 to-indigo-600/5 ring-1 ring-indigo-400/20"
          : "border-white/10 bg-white/[0.03]")
      }
    >
      <div className="flex items-center justify-between">
        <p
          className={
            "text-xs uppercase tracking-wider " +
            (hero ? "text-indigo-200/80" : "text-white/40")
          }
        >
          {label}
        </p>
        <span className={hero ? "text-indigo-200/70" : "text-white/30"}>{icon}</span>
      </div>
      <p
        className={
          "mt-2 tabular-nums font-bold " +
          (hero ? "text-3xl sm:text-4xl text-indigo-100" : "text-2xl text-white")
        }
      >
        {value}
      </p>
    </div>
  );
}

/* ---------- Earnings summary: bento stat row + full-width breakdown ---------- */
function EarningsSection({ summary }: { summary: WorkSummary }) {
  return (
    <div className="space-y-6">
      {/* Bento stat row — Gross is the hero, spanning two columns */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <StatCard
          hero
          label="Gross earnings"
          value={money(summary.grossEarnings)}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
        />
        <StatCard
          label="Gas cost"
          value={money(summary.gasCost)}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="22" x2="15" y2="22" />
              <line x1="4" y1="9" x2="14" y2="9" />
              <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
              <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
            </svg>
          }
        />
        <StatCard
          label="Net total"
          value={money(summary.net)}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          }
        />
      </div>

      {/* Full-width earnings breakdown with dot leaders, per job */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            Earnings breakdown
          </h2>
          <span className="text-xs text-white/40">
            {summary.totalKm} km · {summary.litres} L
          </span>
        </div>

        <div className="space-y-3 text-sm">
          {summary.byJob.length === 0 ? (
            <p className="text-white/40">No earnings recorded.</p>
          ) : (
            summary.byJob.map((j) => (
              <LeaderLine
                key={j.jobName}
                label={
                  <span>
                    {j.jobName}
                    <span className="text-white/40">
                      {" "}
                      · {j.hours}h × {money(j.rate)}/h
                    </span>
                  </span>
                }
                value={j.total}
              />
            ))
          )}

          {/* Gross subtotal */}
          <div className="pt-3 border-t border-white/10">
            <LeaderLine label="Gross earnings" value={summary.grossEarnings} emphasis />
          </div>

          {/* Gas deduction */}
          <LeaderLine label="Gas & fuel" value={summary.gasCost} sign="minus" />

          {/* Net total */}
          <div className="pt-3 mt-1 border-t-2 border-white/20">
            <div className="flex items-baseline gap-3">
              <span className="font-bold text-white uppercase tracking-wide">
                Net total
              </span>
              <span className="flex-1 border-b border-dotted border-white/15 translate-y-[-4px]" />
              <span className="tabular-nums font-bold text-2xl text-indigo-200">
                {money(summary.net)}
              </span>
            </div>
          </div>
        </div>
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end">
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
      </div>

      {shared.summary && <EarningsSection summary={shared.summary} />}

      {rows.length === 0 ? (
        <p className="text-white/40 text-sm">No data to show yet.</p>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            Sessions
          </h2>
          <DataTable rows={rows} />
        </div>
      )}

      {routes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
            Gas &amp; Routes — all routes, all time
          </h2>
          <DataTable rows={routes} />
        </div>
      )}
    </div>
  );
}

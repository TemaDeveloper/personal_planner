"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Download, FileText, Route, BarChart2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
import { EmptyState } from "@/components/ui/empty-state";

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
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--hair-strong)" }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--surface-2)" }}>
              {keys.map((key) => (
                <th
                  key={key}
                  className={
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap stat-label " +
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
                className="transition-colors duration-150"
                style={{ borderTop: "1px solid var(--hair-strong)" }}
              >
                {keys.map((key) => (
                  <td
                    key={key}
                    className={
                      "px-4 py-3 whitespace-nowrap " +
                      (numeric[key] ? "text-right num font-medium" : "text-left")
                    }
                    style={{ color: "var(--text-primary)" }}
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
    <Card padding="lg">
      {/* Hero metric — Net earnings */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <StatBlock
          label="Net earnings"
          value={money(summary.net)}
          sub={`After ${money(summary.gasCost)} gas deduction`}
          size="hero"
        />
        <StatBlock
          label="Gross"
          value={money(summary.grossEarnings)}
          size="lg"
          className="sm:text-right"
        />
      </div>

      {/* Divider */}
      <div className="mb-4" style={{ borderTop: "1px solid var(--hair-strong)" }} />

      {/* Itemized lines */}
      <div className="space-y-3 text-sm">
        {items.length === 0 ? (
          <p style={{ color: "var(--text-faint)" }}>No sessions recorded.</p>
        ) : (
          items.map((it) => (
            <div key={it.key} className="flex items-baseline gap-3">
              <span className="min-w-0 truncate" style={{ color: "var(--text-primary)" }}>
                {it.primary}
                {it.secondary && (
                  <span style={{ color: "var(--text-faint)" }}> · {it.secondary}</span>
                )}
              </span>
              <span
                className="flex-1 border-b border-dotted translate-y-[-4px]"
                style={{ borderColor: "var(--hair-strong)" }}
              />
              <span className="num font-medium" style={{ color: "var(--text-primary)" }}>
                {money(it.value)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Gas deduction row */}
      <div
        className="mt-4 pt-4 flex items-baseline gap-3 text-sm"
        style={{ borderTop: "1px solid var(--hair-strong)" }}
      >
        <span style={{ color: "var(--text-muted)" }}>
          Gas &amp; fuel
          <span style={{ color: "var(--text-faint)" }}>
            {" "}· <span className="num">{summary.totalKm}</span> km ·{" "}
            <span className="num">{summary.litres}</span> L
          </span>
        </span>
        <span
          className="flex-1 border-b border-dotted translate-y-[-4px]"
          style={{ borderColor: "var(--hair-strong)" }}
        />
        <span className="num font-medium" style={{ color: "var(--alert)" }}>
          −{money(summary.gasCost)}
        </span>
      </div>
    </Card>
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

  if (error) {
    return (
      <EmptyState
        icon={FileText}
        title="Unable to load"
        description="Failed to load shared data. The link may be invalid."
      />
    );
  }

  if (!shared) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 rounded-md animate-pulse"
            style={{ background: "var(--surface-2)" }}
          />
        ))}
      </div>
    );
  }

  const rows = Array.isArray(shared.data) ? shared.data : [];
  const routes = Array.isArray(shared.routes) ? shared.routes : [];
  const summary = shared.summary ?? null;
  // For a single-job share the earnings card already itemizes every session,
  // so the sessions table would only repeat it — show it only for multi-job.
  const showSessions = summary
    ? rows.length > 0 && summary.byJob.length > 1
    : rows.length > 0;
  const sessionsTitle = summary ? "Sessions" : "Records";

  const hasContent = summary || showSessions || routes.length > 0;

  const exportButton = (
    <a
      href={`/api/shared/${token}/export`}
      download
      className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors duration-150 min-h-[44px]"
      style={{
        border: "1px solid var(--hair-strong)",
        background: "var(--surface-2)",
        color: "var(--accent-text)",
      }}
    >
      <Download size={15} aria-hidden />
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
            (showSessions && routes.length > 0 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")
          }
        >
          {showSessions && (
            <div className="space-y-3">
              <h2
                className="text-xs font-semibold uppercase tracking-wider stat-label flex items-center gap-2"
              >
                <BarChart2 size={13} style={{ color: "var(--accent-color)" }} aria-hidden />
                {sessionsTitle}
              </h2>
              <DataTable rows={rows} />
            </div>
          )}
          {routes.length > 0 && (
            <div className="space-y-3">
              <h2
                className="text-xs font-semibold uppercase tracking-wider stat-label flex items-center gap-2"
              >
                <Route size={13} style={{ color: "var(--accent-color)" }} aria-hidden />
                Routes
              </h2>
              <DataTable rows={routes} />
            </div>
          )}
        </div>
      ) : (
        !hasContent && (
          <EmptyState
            icon={FileText}
            title="No data yet"
            description="The owner hasn't recorded any data for this section."
          />
        )
      )}
    </div>
  );
}

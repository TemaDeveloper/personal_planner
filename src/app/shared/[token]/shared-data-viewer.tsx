"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

interface SharedData {
  sectionType: string;
  scopeFilter: string | null;
  ownerName: string;
  data: Record<string, unknown>[];
  meta?: Record<string, unknown>;
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
  if (rows.length === 0) return <p className="text-white/40 text-sm">No data to show yet.</p>;

  const keys = Object.keys(rows[0]).filter(
    (k) => !["_id", "__v", "userId", "createdAt", "updatedAt", "templateId"].includes(k)
  );

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              {keys.map((key) => (
                <th key={key} className="px-4 py-3 text-left text-xs font-medium text-white/40 uppercase tracking-wider">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                {keys.map((key) => {
                  let val = (row as Record<string, unknown>)[key];
                  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                    try { val = format(new Date(val), "MMM d, yyyy"); } catch { /* keep */ }
                  }
                  return (
                    <td key={key} className="px-4 py-3 text-white/80">
                      {String(val ?? "")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// src/components/dashboard/dashboard-metrics.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";

interface MetricCard {
  id: string;
  label: string;
  value: string;
  sub?: string;
  stale?: boolean;
}

export function DashboardMetrics() {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/metrics")
      .then((r) => r.json())
      .then((data) => {
        // Stale metrics point at a section/template that no longer exists —
        // don't render dead "—" tiles for them.
        setMetrics(((data.metrics ?? []) as MetricCard[]).filter((m) => !m.stale));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const remove = useCallback(async (id: string) => {
    // Optimistic remove — remember the tile and its position so a failed
    // delete can restore it in place.
    let removed: MetricCard | undefined;
    let removedIndex = -1;
    setMetrics((prev) => {
      removedIndex = prev.findIndex((m) => m.id === id);
      removed = prev[removedIndex];
      return prev.filter((m) => m.id !== id);
    });
    const restore = () => {
      setMetrics((prev) => {
        if (!removed || prev.some((m) => m.id === id)) return prev;
        const next = [...prev];
        next.splice(Math.min(Math.max(removedIndex, 0), next.length), 0, removed);
        return next;
      });
      toast.error("Failed to remove metric");
    };
    try {
      const res = await fetch(`/api/dashboard/metrics/${id}`, { method: "DELETE" });
      if (!res.ok) restore();
    } catch {
      restore();
    }
  }, []);

  if (!loaded || metrics.length === 0) return null;

  return (
    <div
      className="grid gap-3 mb-6"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
      }}
    >
      {metrics.map((m) => (
        <Card key={m.id} padding="md" className="relative group">
          <StatBlock label={m.label} value={m.value} sub={m.sub} size="lg" />
          <button
            onClick={() => remove(m.id)}
            aria-label={`Remove ${m.label}`}
            className="absolute top-2 right-2 w-[44px] h-[44px] flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-lg"
            style={{ color: "var(--text-faint)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--alert)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)")
            }
          >
            <span aria-hidden="true" style={{ fontSize: "16px", lineHeight: 1 }}>×</span>
          </button>
        </Card>
      ))}
    </div>
  );
}

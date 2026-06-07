"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { StatBlock } from "@/components/ui/stat-block";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Droplets, Moon, Weight, Smile, Heart, Download } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { PageTransition } from "@/components/ui/page-transition";
import { SectionCustomFields } from "@/components/sections/custom-fields";

interface HealthLog {
  _id: string;
  date: string;
  water: number;
  sleepHours: number;
  weight?: number;
  mood: number;
}

const MOODS = [
  { value: 1, emoji: "\u{1F61E}", label: "Bad" },
  { value: 2, emoji: "\u{1F615}", label: "Meh" },
  { value: 3, emoji: "\u{1F610}", label: "Okay" },
  { value: 4, emoji: "\u{1F642}", label: "Good" },
  { value: 5, emoji: "\u{1F604}", label: "Great" },
];

export default function HealthPage() {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Today's form
  const [water, setWater] = useState("0");
  const [sleepHours, setSleepHours] = useState("0");
  const [weight, setWeight] = useState("");
  const [mood, setMood] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => {
        const allLogs = data.logs || [];
        setLogs(allLogs);

        // Pre-fill today's data if exists
        const today = format(new Date(), "yyyy-MM-dd");
        const todayLog = allLogs.find(
          (l: HealthLog) => format(new Date(l.date), "yyyy-MM-dd") === today
        );
        if (todayLog) {
          setWater(String(todayLog.water));
          setSleepHours(String(todayLog.sleepHours));
          setWeight(todayLog.weight ? String(todayLog.weight) : "");
          setMood(todayLog.mood);
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: new Date().toISOString(),
        water: Number(water),
        sleepHours: Number(sleepHours),
        weight: weight ? Number(weight) : undefined,
        mood,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("Health log saved");
      setLogs((prev) => {
        const today = format(new Date(), "yyyy-MM-dd");
        const filtered = prev.filter(
          (l) => format(new Date(l.date), "yyyy-MM-dd") !== today
        );
        return [data.log, ...filtered];
      });
    } else {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  // Weekly avg sleep
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekLogs = useMemo(
    () =>
      logs.filter((l) => {
        const d = new Date(l.date);
        return d >= weekStart && d <= weekEnd;
      }),
    [logs, weekStart, weekEnd]
  );
  const avgSleep =
    weekLogs.length > 0
      ? (weekLogs.reduce((s, l) => s + l.sleepHours, 0) / weekLogs.length).toFixed(1)
      : "—";

  const avgWater =
    weekLogs.length > 0
      ? (weekLogs.reduce((s, l) => s + l.water, 0) / weekLogs.length).toFixed(0)
      : "—";

  const avgMoodEmoji =
    weekLogs.length > 0
      ? MOODS[Math.round(weekLogs.reduce((s, l) => s + l.mood, 0) / weekLogs.length) - 1]?.emoji || "—"
      : "—";

  if (loading) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Health" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-48" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Health"
        description="Water, sleep & wellness"
        action={
          <button
            onClick={() => { window.location.href = "/api/export/health"; }}
            className="p-2 rounded-md hover:bg-[var(--surface-1)] transition-colors text-[var(--text-muted)]"
            aria-label="Export to Excel"
          >
            <Download size={16} />
          </button>
        }
      />

      {/* Hero metric — avg sleep this week */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-6">
          <StatBlock
            label="Avg Sleep This Week"
            value={avgSleep === "—" ? "—" : `${avgSleep}h`}
            sub={weekLogs.length > 0 ? `${weekLogs.length} entr${weekLogs.length === 1 ? "y" : "ies"} logged` : "No entries this week"}
            size="hero"
          />
          <div className="grid grid-cols-2 gap-6 sm:gap-8 pb-0.5">
            <StatBlock
              label="Avg Water"
              value={avgWater === "—" ? "—" : `${avgWater} gl`}
              size="lg"
            />
            <StatBlock
              label="Avg Mood"
              value={avgMoodEmoji}
              sub={`${weekLogs.length} this week`}
              size="lg"
            />
          </div>
        </div>
      </Card>

      {/* Log today */}
      <Card className="mb-6">
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Log Today</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <FormInput
            label={
              <>
                <Droplets size={12} className="inline mr-1.5 align-[-1px]" style={{ color: "var(--accent-color)" }} />
                Water (glasses)
              </>
            }
            type="number"
            min={0}
            value={water}
            onChange={(e) => setWater(e.target.value)}
          />
          <FormInput
            label={
              <>
                <Moon size={12} className="inline mr-1.5 align-[-1px]" style={{ color: "var(--accent-color)" }} />
                Sleep (hours)
              </>
            }
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={sleepHours}
            onChange={(e) => setSleepHours(e.target.value)}
          />
          <FormInput
            label={
              <>
                <Weight size={12} className="inline mr-1.5 align-[-1px]" style={{ color: "var(--text-faint)" }} />
                Weight (kg, optional)
              </>
            }
            type="number"
            min={0}
            step={0.1}
            placeholder="—"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
          <div>
            <label className="stat-label block mb-1.5">
              <Smile size={12} className="inline mr-1.5 align-[-1px]" />
              Mood
            </label>
            <div className="flex gap-1.5">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className="flex-1 py-2.5 rounded-md text-lg transition-all active:scale-95"
                  style={{
                    background: mood === m.value ? "var(--accent-glow)" : "var(--surface-2)",
                    border: `1px solid ${mood === m.value ? "var(--accent-color)" : "var(--border-subtle)"}`,
                    opacity: mood === m.value ? 1 : 0.5,
                    minHeight: "44px",
                  }}
                  title={m.label}
                  aria-label={`Set mood to ${m.label}`}
                  aria-pressed={mood === m.value}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </Card>

      {/* Recent history */}
      <Card>
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-4">Recent History</h2>
        {logs.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="No health logs yet"
            description="Start logging water, sleep, weight, and mood above."
          />
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 14).map((log) => (
              <div
                key={log._id}
                className="flex items-center gap-4 px-3 py-2.5 rounded-md text-xs border border-[var(--border-subtle)] bg-[var(--surface-1)]"
              >
                <span className="font-medium w-20 flex-shrink-0 text-[var(--text-primary)]">
                  {format(new Date(log.date), "MMM d")}
                </span>
                <span className="flex items-center gap-1 text-[var(--text-muted)]">
                  <Droplets size={10} style={{ color: "var(--accent-color)" }} />
                  <span className="num">{log.water}</span>
                </span>
                <span className="flex items-center gap-1 text-[var(--text-muted)]">
                  <Moon size={10} style={{ color: "var(--accent-color)" }} />
                  <span className="num">{log.sleepHours}h</span>
                </span>
                {log.weight && (
                  <span className="flex items-center gap-1 text-[var(--text-muted)]">
                    <Weight size={10} />
                    <span className="num">{log.weight}kg</span>
                  </span>
                )}
                <span className="ml-auto">{MOODS[log.mood - 1]?.emoji}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <SectionCustomFields sectionKey="health" />
    </PageTransition>
  );
}

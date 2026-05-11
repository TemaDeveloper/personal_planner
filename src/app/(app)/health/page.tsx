"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Droplets, Moon, Weight, Smile } from "lucide-react";
import { format, subDays, startOfWeek, endOfWeek } from "date-fns";

interface HealthLog {
  _id: string;
  date: string;
  water: number;
  sleepHours: number;
  weight?: number;
  mood: number;
}

const MOODS = [
  { value: 1, emoji: "😞", label: "Bad" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 5, emoji: "😄", label: "Great" },
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

  if (loading) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Health" />
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="planner-surface p-6 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <PageHeader title="Health" description="Water, sleep & wellness" />

      {/* Log today */}
      <div className="planner-surface p-6 mb-6">
        <h3 className="text-sm font-semibold mb-4">Log Today</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Droplets size={12} /> Water (glasses)
            </label>
            <input
              type="number"
              min="0"
              value={water}
              onChange={(e) => setWater(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Moon size={12} /> Sleep (hours)
            </label>
            <input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Weight size={12} /> Weight (kg, optional)
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              placeholder="—"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
              <Smile size={12} /> Mood
            </label>
            <div className="flex gap-1">
              {MOODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMood(m.value)}
                  className="flex-1 py-2 rounded-lg text-lg transition-all"
                  style={{
                    background: mood === m.value ? "var(--accent-glow)" : "var(--surface-2)",
                    border: `1px solid ${mood === m.value ? "var(--accent-color)" : "var(--border-subtle)"}`,
                    opacity: mood === m.value ? 1 : 0.5,
                  }}
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50 transition-all hover:-translate-y-0.5"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* Weekly summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Avg Sleep", value: `${avgSleep}h`, icon: Moon },
          {
            label: "Avg Water",
            value: weekLogs.length > 0
              ? `${(weekLogs.reduce((s, l) => s + l.water, 0) / weekLogs.length).toFixed(0)} glasses`
              : "—",
            icon: Droplets,
          },
          {
            label: "Avg Mood",
            value: weekLogs.length > 0
              ? MOODS[Math.round(weekLogs.reduce((s, l) => s + l.mood, 0) / weekLogs.length) - 1]?.emoji || "—"
              : "—",
            icon: Smile,
          },
          {
            label: "Entries",
            value: `${weekLogs.length} this week`,
            icon: Weight,
          },
        ].map((stat) => (
          <div key={stat.label} className="planner-surface p-4 text-center">
            <stat.icon size={16} className="mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent history */}
      <div className="planner-surface p-6">
        <h3 className="text-sm font-semibold mb-4">Recent History</h3>
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No entries yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 14).map((log) => (
              <div
                key={log._id}
                className="flex items-center gap-4 p-3 rounded-lg text-xs"
                style={{ background: "var(--surface-2)" }}
              >
                <span className="font-medium w-24 flex-shrink-0">
                  {format(new Date(log.date), "MMM d")}
                </span>
                <span className="flex items-center gap-1">
                  <Droplets size={10} /> {log.water}
                </span>
                <span className="flex items-center gap-1">
                  <Moon size={10} /> {log.sleepHours}h
                </span>
                {log.weight && (
                  <span className="flex items-center gap-1">
                    <Weight size={10} /> {log.weight}kg
                  </span>
                )}
                <span>{MOODS[log.mood - 1]?.emoji}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

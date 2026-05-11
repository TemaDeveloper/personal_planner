"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Trash2, NotebookPen } from "lucide-react";
import { format } from "date-fns";

interface JournalEntry {
  _id: string;
  date: string;
  content: string;
  mood: number;
}

const MOODS = [
  { value: 1, emoji: "😞" },
  { value: 2, emoji: "😕" },
  { value: 3, emoji: "😐" },
  { value: 4, emoji: "🙂" },
  { value: 5, emoji: "😄" },
];

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Today's form
  const [content, setContent] = useState("");
  const [mood, setMood] = useState(3);
  const [saving, setSaving] = useState(false);
  const [todayId, setTodayId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/journal")
      .then((r) => r.json())
      .then((data) => {
        const allEntries = data.entries || [];
        setEntries(allEntries);

        const today = format(new Date(), "yyyy-MM-dd");
        const todayEntry = allEntries.find(
          (e: JournalEntry) => format(new Date(e.date), "yyyy-MM-dd") === today
        );
        if (todayEntry) {
          setContent(todayEntry.content);
          setMood(todayEntry.mood);
          setTodayId(todayEntry._id);
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    if (!content.trim()) return;
    setSaving(true);

    const res = await fetch("/api/journal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: new Date().toISOString(),
        content,
        mood,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("Journal saved");
      setTodayId(data.entry._id);
      setEntries((prev) => {
        const today = format(new Date(), "yyyy-MM-dd");
        const filtered = prev.filter(
          (e) => format(new Date(e.date), "yyyy-MM-dd") !== today
        );
        return [data.entry, ...filtered];
      });
    } else {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Journal" />
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
      <PageHeader title="Journal" description="Daily journal" />

      {/* Today's entry */}
      <div className="planner-surface p-6 mb-6">
        <h3 className="text-sm font-semibold mb-4">
          {format(new Date(), "EEEE, MMM d, yyyy")}
        </h3>

        <div className="mb-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">
            How are you feeling?
          </label>
          <div className="flex gap-1">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className="flex-1 py-2 rounded-lg text-lg transition-all max-w-[56px]"
                style={{
                  background: mood === m.value ? "var(--accent-glow)" : "var(--surface-2)",
                  border: `1px solid ${mood === m.value ? "var(--accent-color)" : "var(--border-subtle)"}`,
                  opacity: mood === m.value ? 1 : 0.5,
                }}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>

        <textarea
          placeholder="Write about your day..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="w-full px-4 py-3 rounded-lg text-sm resize-none mb-4"
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        />

        <button
          onClick={handleSave}
          disabled={saving || !content.trim()}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50 transition-all hover:-translate-y-0.5"
        >
          {saving ? "Saving..." : todayId ? "Update entry" : "Save entry"}
        </button>
      </div>

      {/* Past entries */}
      <div className="planner-surface p-6">
        <h3 className="text-sm font-semibold mb-4">Past Entries</h3>
        {entries.length === 0 ? (
          <div className="text-center py-6">
            <NotebookPen size={32} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">No entries yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <div
                key={entry._id}
                className="p-4 rounded-lg"
                style={{ background: "var(--surface-2)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {format(new Date(entry.date), "MMM d, yyyy")}
                    </span>
                    <span className="text-sm">
                      {MOODS[entry.mood - 1]?.emoji}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      await fetch(`/api/journal/${entry._id}`, { method: "DELETE" });
                      setEntries((prev) => prev.filter((e) => e._id !== entry._id));
                      if (entry._id === todayId) {
                        setContent("");
                        setMood(3);
                        setTodayId(null);
                      }
                      toast.success("Entry deleted");
                    }}
                    className="p-1.5 min-w-[28px] min-h-[28px] text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                  {entry.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

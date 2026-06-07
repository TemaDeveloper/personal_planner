"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Trash2, NotebookPen, Download } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTransition } from "@/components/ui/page-transition";
import { SectionCustomFields } from "@/components/sections/custom-fields";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormTextarea } from "@/components/ui/form-input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatBlock } from "@/components/ui/stat-block";
import { Skeleton } from "@/components/ui/skeleton";

interface JournalEntry {
  _id: string;
  date: string;
  content: string;
  mood: number;
}

const MOODS = [
  { value: 1, emoji: "\u{1F61E}", label: "sad" },
  { value: 2, emoji: "\u{1F615}", label: "confused" },
  { value: 3, emoji: "\u{1F610}", label: "neutral" },
  { value: 4, emoji: "\u{1F642}", label: "good" },
  { value: 5, emoji: "\u{1F604}", label: "great" },
];

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Today's form
  const [content, setContent] = useState("");
  const [mood, setMood] = useState(3);
  const [saving, setSaving] = useState(false);
  const [todayId, setTodayId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
          <Skeleton className="h-64" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Journal"
        description="Daily journal"
        action={
          <button
            onClick={() => { window.location.href = "/api/export/journal"; }}
            className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-[var(--text-muted)] min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Export to Excel"
          >
            <Download size={16} />
          </button>
        }
      />

      {/* Hero metric */}
      <Card padding="lg" className="mb-6">
        <StatBlock
          label="Total Entries"
          value={String(entries.length)}
          sub={entries.length === 1 ? "1 entry written" : `${entries.length} entries written`}
          size="hero"
        />
      </Card>

      {/* Today's entry */}
      <Card padding="lg" className="mb-6">
        <p className="stat-label mb-4">{format(new Date(), "EEEE, MMM d, yyyy")}</p>

        <div className="mb-4">
          <p className="stat-label mb-2">How are you feeling?</p>
          <div className="flex gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(m.value)}
                className="flex-1 py-2 rounded-md text-lg transition-colors min-h-[44px] max-w-[56px]"
                style={{
                  background: mood === m.value ? "var(--accent-wash)" : "var(--surface-2)",
                  borderWidth: "1px",
                  borderStyle: "solid",
                  borderColor: mood === m.value ? "var(--accent-color)" : "var(--border-subtle)",
                  opacity: mood === m.value ? 1 : 0.55,
                }}
                aria-label={`Set mood to ${m.label}`}
                aria-pressed={mood === m.value}
              >
                {m.emoji}
              </button>
            ))}
          </div>
        </div>

        <FormTextarea
          placeholder="Write about your day..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          className="mb-4"
        />

        <Button
          onClick={handleSave}
          disabled={saving || !content.trim()}
        >
          {saving ? "Saving..." : todayId ? "Update entry" : "Save entry"}
        </Button>
      </Card>

      {/* Past entries */}
      <Card padding="lg">
        <p className="stat-label mb-4">Past Entries</p>
        {entries.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            title="No entries yet"
            description="Write your first journal entry above to start reflecting."
          />
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <Card
                key={entry._id}
                variant="inset"
                padding="md"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--text-primary)] num">
                      {format(new Date(entry.date), "MMM d, yyyy")}
                    </span>
                    <span className="text-sm" aria-label={MOODS[entry.mood - 1]?.label}>
                      {MOODS[entry.mood - 1]?.emoji}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete entry"
                    onClick={() => setDeleteTarget(entry._id)}
                    className="text-[var(--text-muted)] hover:text-[var(--alert)] min-h-[44px] min-w-[44px]"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <p className="text-xs text-[var(--text-muted)] whitespace-pre-wrap line-clamp-4">
                  {entry.content}
                </p>
              </Card>
            ))}
          </div>
        )}
      </Card>
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleting(true);
          try {
            const res = await fetch(`/api/journal/${deleteTarget}`, { method: "DELETE" });
            if (!res.ok) {
              toast.error("Failed to delete entry");
              return;
            }
            setEntries((prev) => prev.filter((e) => e._id !== deleteTarget));
            if (deleteTarget === todayId) {
              setContent("");
              setMood(3);
              setTodayId(null);
            }
            toast.success("Entry deleted");
            setDeleteTarget(null);
          } catch {
            toast.error("Failed to delete entry");
          } finally {
            setDeleting(false);
          }
        }}
        message="This will permanently delete this journal entry."
        loading={deleting}
      />
      <SectionCustomFields sectionKey="journal" />
    </PageTransition>
  );
}

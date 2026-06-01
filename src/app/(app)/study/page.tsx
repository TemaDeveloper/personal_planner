"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  GraduationCap,
  Clock,
  BookOpen,
  FileText,
  Plus,
  Trash2,
  Check,
  Download,
} from "lucide-react";
import { ACADEMIC_ITEM_TYPES } from "@/lib/constants";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageTransition } from "@/components/ui/page-transition";

interface StudySession {
  _id: string;
  subject: string;
  date: string;
  minutes: number;
  note?: string;
}

interface Homework {
  _id: string;
  subject: string;
  title: string;
  dueDate?: string;
  completed: boolean;
}

interface AcademicItem {
  _id: string;
  type: string;
  subject: string;
  title: string;
  dueDate: string;
  completed: boolean;
  grade?: number;
  note?: string;
}

interface Subject {
  name: string;
  color: string;
  active: boolean;
}

const TABS = [
  { value: "overview" as const, label: "Overview", icon: GraduationCap },
  { value: "log" as const, label: "Log Time", icon: Clock },
  { value: "homework" as const, label: "Homework", icon: BookOpen },
  { value: "academic" as const, label: "Academic", icon: FileText },
];

type Tab = (typeof TABS)[number]["value"];

export default function StudyPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [academicItems, setAcademicItems] = useState<AcademicItem[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/study/sessions").then((r) => r.json()),
      fetch("/api/study/homework").then((r) => r.json()),
      fetch("/api/study/academic").then((r) => r.json()),
      fetch("/api/user/preferences").then((r) => r.json()),
    ]).then(([sessData, hwData, acData, prefData]) => {
      setSessions(sessData.sessions || []);
      setHomework(hwData.homework || []);
      setAcademicItems(acData.items || []);
      setSubjects(
        prefData.studyConfig?.subjects?.filter((s: Subject) => s.active) || []
      );
      setLoading(false);
    });
  }, []);

  const totalMinutesThisWeek = sessions.reduce((sum, s) => {
    const d = new Date(s.date);
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    weekStart.setHours(0, 0, 0, 0);
    return d >= weekStart ? sum + s.minutes : sum;
  }, 0);

  const pendingHomework = homework.filter((h) => !h.completed).length;
  const upcomingItems = academicItems
    .filter((a) => !a.completed && new Date(a.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  if (loading) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Study" description="Subjects, homework & grades" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Study"
        description="Subjects, homework & grades"
        action={
          <button
            onClick={() => { window.location.href = "/api/export/study"; }}
            className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-[var(--text-muted)]"
            aria-label="Export to Excel"
          >
            <Download size={16} />
          </button>
        }
      />

      {/* Tabs */}
      <SegmentedControl
        segments={TABS}
        value={tab}
        onChange={setTab}
        layoutId="study-tabs"
        className="w-full mb-6"
      />

      {subjects.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="No study sessions yet"
          description="Log your first study session to start tracking."
        />
      )}

      {tab === "overview" && (
        <OverviewTab
          totalMinutesThisWeek={totalMinutesThisWeek}
          pendingHomework={pendingHomework}
          upcomingItems={upcomingItems}
          sessions={sessions}
          subjects={subjects}
        />
      )}
      {tab === "log" && (
        <LogTimeTab
          sessions={sessions}
          setSessions={setSessions}
          subjects={subjects}
        />
      )}
      {tab === "homework" && (
        <HomeworkTab
          homework={homework}
          setHomework={setHomework}
          subjects={subjects}
        />
      )}
      {tab === "academic" && (
        <AcademicTab
          items={academicItems}
          setItems={setAcademicItems}
          subjects={subjects}
        />
      )}
    </PageTransition>
  );
}

function OverviewTab({
  totalMinutesThisWeek,
  pendingHomework,
  upcomingItems,
  sessions,
  subjects,
}: {
  totalMinutesThisWeek: number;
  pendingHomework: number;
  upcomingItems: AcademicItem[];
  sessions: StudySession[];
  subjects: Subject[];
}) {
  const hours = Math.floor(totalMinutesThisWeek / 60);
  const mins = totalMinutesThisWeek % 60;

  const perSubject = subjects.map((s) => {
    const total = sessions
      .filter((sess) => {
        const d = new Date(sess.date);
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
        weekStart.setHours(0, 0, 0, 0);
        return sess.subject === s.name && d >= weekStart;
      })
      .reduce((sum, sess) => sum + sess.minutes, 0);
    return { name: s.name, color: s.color, minutes: total };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} style={{ color: "var(--accent-color)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Study this week</span>
          </div>
          <div className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {hours}h {mins}m
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} style={{ color: "var(--accent-color)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Pending homework</span>
          </div>
          <div className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{pendingHomework}</div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} style={{ color: "var(--accent-color)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Upcoming items</span>
          </div>
          <div className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>{upcomingItems.length}</div>
        </Card>
      </div>

      {perSubject.length > 0 && (
        <Card>
          <h3 className="text-xs font-semibold mb-4" style={{ color: "var(--text-muted)" }}>
            TIME PER SUBJECT THIS WEEK
          </h3>
          <div className="space-y-3">
            {perSubject.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="text-sm" style={{ color: "var(--text-primary)" }}>{s.name}</span>
                </div>
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  {Math.floor(s.minutes / 60)}h {s.minutes % 60}m
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {upcomingItems.length > 0 && (
        <Card>
          <h3 className="text-xs font-semibold mb-4" style={{ color: "var(--text-muted)" }}>
            UPCOMING DEADLINES
          </h3>
          <div className="space-y-2">
            {upcomingItems.slice(0, 5).map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <span className="font-medium truncate block" style={{ color: "var(--text-primary)" }}>{item.title}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {item.subject} · {item.type}
                  </span>
                </div>
                <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {new Date(item.dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function LogTimeTab({
  sessions,
  setSessions,
  subjects,
}: {
  sessions: StudySession[];
  setSessions: React.Dispatch<React.SetStateAction<StudySession[]>>;
  subjects: Subject[];
}) {
  const [subject, setSubject] = useState(subjects[0]?.name || "");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !minutes) return;
    setSaving(true);

    const res = await fetch("/api/study/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, date, minutes: Number(minutes), note: note || undefined }),
    });

    if (res.ok) {
      const data = await res.json();
      setSessions((prev) => [data.session, ...prev]);
      setMinutes("");
      setNote("");
      toast.success("Study session logged");
    } else {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/study/sessions/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setSessions((prev) => prev.filter((s) => s._id !== deleteTarget));
      toast.success("Session removed");
    } catch {
      toast.error("Failed to delete session");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <FormSelect
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {subjects.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </FormSelect>
            <FormInput
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <FormInput
              label="Minutes"
              type="number"
              min="1"
              placeholder="45"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
            <FormInput
              label="Note"
              type="text"
              placeholder="Optional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={saving || !subject || !minutes}>
            <Plus size={14} />
            {saving ? "Saving..." : "Log session"}
          </Button>
        </form>
      </Card>

      <div className="space-y-2">
        {sessions.slice(0, 30).map((s) => (
          <Card key={s._id} padding="md" className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.subject}</span>
              <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
                {new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              {s.note && (
                <span className="text-xs ml-2 truncate" style={{ color: "var(--text-muted)" }}>· {s.note}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {Math.floor(s.minutes / 60) > 0 && `${Math.floor(s.minutes / 60)}h `}
                {s.minutes % 60}m
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteTarget(s._id)}
                className="hover:text-destructive"
                aria-label="Delete session"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message="This will permanently delete this study session."
        loading={deleting}
      />
    </div>
  );
}

function HomeworkTab({
  homework,
  setHomework,
  subjects,
}: {
  homework: Homework[];
  setHomework: React.Dispatch<React.SetStateAction<Homework[]>>;
  subjects: Subject[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState(subjects[0]?.name || "");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !title) return;
    setSaving(true);

    const res = await fetch("/api/study/homework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, title, dueDate: dueDate || undefined }),
    });

    if (res.ok) {
      const data = await res.json();
      setHomework((prev) => [...prev, data.homework]);
      setTitle("");
      setDueDate("");
      setShowForm(false);
      toast.success("Homework added");
    } else {
      toast.error("Failed to add");
    }
    setSaving(false);
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/study/homework/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setHomework((prev) =>
        prev.map((h) => (h._id === id ? { ...h, completed: !completed } : h))
      );
    } catch {
      toast.error("Failed to update homework");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/study/homework/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setHomework((prev) => prev.filter((h) => h._id !== deleteTarget));
      toast.success("Homework removed");
    } catch {
      toast.error("Failed to delete homework");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const pending = homework.filter((h) => !h.completed);
  const completed = homework.filter((h) => h.completed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {pending.length} pending
        </h3>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={14} />
          Add
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormSelect
                label="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </FormSelect>
              <FormInput
                label="Title"
                type="text"
                placeholder="Chapter 5 problems"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <FormInput
                label="Due date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !title}>
                {saving ? "Adding..." : "Add homework"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {pending.map((h) => (
          <Card key={h._id} padding="md" className="flex items-center gap-3">
            <button
              onClick={() => toggleComplete(h._id, h.completed)}
              className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
              style={{ border: "2px solid var(--border-subtle)" }}
              aria-label="Mark as complete"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{h.title}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {h.subject}
                {h.dueDate && ` · Due ${new Date(h.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTarget(h._id)}
              className="hover:text-destructive"
              aria-label="Delete homework"
            >
              <Trash2 size={14} />
            </Button>
          </Card>
        ))}
      </div>

      {completed.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold mb-3" style={{ color: "var(--text-muted)" }}>COMPLETED</h3>
          <div className="space-y-2">
            {completed.map((h) => (
              <Card key={h._id} padding="md" className="flex items-center gap-3 opacity-60">
                <button
                  onClick={() => toggleComplete(h._id, h.completed)}
                  className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
                  style={{ background: "var(--accent-color)" }}
                  aria-label="Mark as incomplete"
                >
                  <Check size={12} className="text-white" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-through truncate" style={{ color: "var(--text-primary)" }}>{h.title}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{h.subject}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteTarget(h._id)}
                  className="hover:text-destructive"
                  aria-label="Delete homework"
                >
                  <Trash2 size={14} />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message="This will permanently delete this homework item."
        loading={deleting}
      />
    </div>
  );
}

function AcademicTab({
  items,
  setItems,
  subjects,
}: {
  items: AcademicItem[];
  setItems: React.Dispatch<React.SetStateAction<AcademicItem[]>>;
  subjects: Subject[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [formType, setFormType] = useState<string>("assignment");
  const [formSubject, setFormSubject] = useState(subjects[0]?.name || "");
  const [formTitle, setFormTitle] = useState("");
  const [formDueDate, setFormDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [formGrade, setFormGrade] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = typeFilter === "all" ? items : items.filter((i) => i.type === typeFilter);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSubject || !formTitle || !formDueDate) return;
    setSaving(true);

    const res = await fetch("/api/study/academic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: formType,
        subject: formSubject,
        title: formTitle,
        dueDate: formDueDate,
        grade: formGrade ? Number(formGrade) : undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setItems((prev) => [...prev, data.item]);
      setFormTitle("");
      setFormDueDate("");
      setFormGrade("");
      setShowForm(false);
      toast.success("Item added");
    } else {
      toast.error("Failed to add");
    }
    setSaving(false);
  };

  const toggleComplete = async (id: string, completed: boolean) => {
    try {
      const res = await fetch(`/api/study/academic/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !completed }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setItems((prev) =>
        prev.map((i) => (i._id === id ? { ...i, completed: !completed } : i))
      );
    } catch {
      toast.error("Failed to update item");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/study/academic/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setItems((prev) => prev.filter((i) => i._id !== deleteTarget));
      toast.success("Item removed");
    } catch {
      toast.error("Failed to delete item");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filterSegments = [
    { value: "all", label: "All" },
    ...ACADEMIC_ITEM_TYPES.map((t) => ({
      value: t,
      label: t.charAt(0).toUpperCase() + t.slice(1),
    })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {filterSegments.map((t) => (
            <Button
              key={t.value}
              variant={typeFilter === t.value ? "primary" : "secondary"}
              size="sm"
              onClick={() => setTypeFilter(t.value)}
            >
              {t.label}
            </Button>
          ))}
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={14} />
          Add
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleAdd} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <FormSelect
                label="Type"
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
              >
                {ACADEMIC_ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </FormSelect>
              <FormSelect
                label="Subject"
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </FormSelect>
              <FormInput
                label="Title"
                type="text"
                placeholder="Midterm exam"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
              <FormInput
                label="Due date"
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !formTitle || !formDueDate}>
                {saving ? "Adding..." : "Add item"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((item) => (
          <Card key={item._id} padding="md" className="flex items-center gap-3">
            <button
              onClick={() => toggleComplete(item._id, item.completed)}
              className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
              style={{
                background: item.completed ? "var(--accent-color)" : "transparent",
                border: item.completed ? "none" : "2px solid var(--border-subtle)",
              }}
              aria-label={item.completed ? "Mark as incomplete" : "Mark as complete"}
            >
              {item.completed && <Check size={12} className="text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${item.completed ? "line-through opacity-60" : ""}`} style={{ color: "var(--text-primary)" }}>
                {item.title}
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {item.subject} · {item.type}
                {item.grade !== undefined && item.grade !== null && ` · Grade: ${item.grade}%`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteTarget(item._id)}
                className="hover:text-destructive"
                aria-label="Delete item"
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <EmptyState
            icon={FileText}
            title={`No ${typeFilter === "all" ? "academic items" : `${typeFilter}s`} yet`}
            description="Track your assignments, exams, and other academic items here."
            actionLabel="Add Item"
            onAction={() => setShowForm(true)}
          />
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        message="This will permanently delete this academic item."
        loading={deleting}
      />
    </div>
  );
}

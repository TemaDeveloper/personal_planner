"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import {
  GraduationCap,
  Clock,
  BookOpen,
  FileText,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import { ACADEMIC_ITEM_TYPES } from "@/lib/constants";

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

const TABS = ["overview", "log", "homework", "academic"] as const;
type Tab = (typeof TABS)[number];

const TAB_META: Record<Tab, { label: string; icon: React.ElementType }> = {
  overview: { label: "Overview", icon: GraduationCap },
  log: { label: "Log Time", icon: Clock },
  homework: { label: "Homework", icon: BookOpen },
  academic: { label: "Academic", icon: FileText },
};

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
            <div key={i} className="planner-surface p-6 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <PageHeader title="Study" description="Subjects, homework & grades" />

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: "var(--surface-1)" }}>
        {TABS.map((t) => {
          const Icon = TAB_META[t].icon;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: tab === t ? "var(--accent-glow)" : "transparent",
                color: tab === t ? "var(--accent-color)" : "var(--text-muted)",
                border: tab === t ? "1px solid var(--accent-color)" : "1px solid transparent",
              }}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{TAB_META[t].label}</span>
            </button>
          );
        })}
      </div>

      {subjects.length === 0 && (
        <div className="planner-surface p-8 text-center mb-6">
          <GraduationCap size={32} className="mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground text-sm mb-4">
            No subjects configured yet.
          </p>
          <a
            href="/settings"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Add subjects in Settings
          </a>
        </div>
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
    </div>
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
        <div className="planner-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} style={{ color: "var(--accent-color)" }} />
            <span className="stat-label">Study this week</span>
          </div>
          <div className="stat-value text-xl">
            {hours}h {mins}m
          </div>
        </div>
        <div className="planner-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} style={{ color: "var(--accent-color)" }} />
            <span className="stat-label">Pending homework</span>
          </div>
          <div className="stat-value text-xl">{pendingHomework}</div>
        </div>
        <div className="planner-surface p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} style={{ color: "var(--accent-color)" }} />
            <span className="stat-label">Upcoming items</span>
          </div>
          <div className="stat-value text-xl">{upcomingItems.length}</div>
        </div>
      </div>

      {perSubject.length > 0 && (
        <div className="planner-surface p-5">
          <h3 className="text-xs font-semibold text-muted-foreground mb-4">
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
                  <span className="text-sm">{s.name}</span>
                </div>
                <span className="text-sm font-medium">
                  {Math.floor(s.minutes / 60)}h {s.minutes % 60}m
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {upcomingItems.length > 0 && (
        <div className="planner-surface p-5">
          <h3 className="text-xs font-semibold text-muted-foreground mb-4">
            UPCOMING DEADLINES
          </h3>
          <div className="space-y-2">
            {upcomingItems.slice(0, 5).map((item) => (
              <div
                key={item._id}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <span className="font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {item.subject} · {item.type}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.dueDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
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

  const handleDelete = async (id: string) => {
    await fetch(`/api/study/sessions/${id}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s._id !== id));
    toast.success("Session removed");
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="planner-surface p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            >
              {subjects.map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Minutes
            </label>
            <input
              type="number"
              min="1"
              placeholder="45"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Note
            </label>
            <input
              type="text"
              placeholder="Optional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !subject || !minutes}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
        >
          <Plus size={14} />
          {saving ? "Saving..." : "Log session"}
        </button>
      </form>

      <div className="space-y-2">
        {sessions.slice(0, 30).map((s) => (
          <div key={s._id} className="planner-surface p-4 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">{s.subject}</span>
              <span className="text-xs text-muted-foreground ml-2">
                {new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              {s.note && (
                <span className="text-xs text-muted-foreground ml-2">· {s.note}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold">
                {Math.floor(s.minutes / 60) > 0 && `${Math.floor(s.minutes / 60)}h `}
                {s.minutes % 60}m
              </span>
              <button
                onClick={() => handleDelete(s._id)}
                className="p-1 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
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
    const res = await fetch(`/api/study/homework/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    if (res.ok) {
      setHomework((prev) =>
        prev.map((h) => (h._id === id ? { ...h, completed: !completed } : h))
      );
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/study/homework/${id}`, { method: "DELETE" });
    setHomework((prev) => prev.filter((h) => h._id !== id));
    toast.success("Homework removed");
  };

  const pending = homework.filter((h) => !h.completed);
  const completed = homework.filter((h) => h.completed);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {pending.length} pending
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-all hover:-translate-y-0.5"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="planner-surface p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                {subjects.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title</label>
              <input
                type="text"
                placeholder="Chapter 5 problems"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !title} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
              {saving ? "Adding..." : "Add homework"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {pending.map((h) => (
          <div key={h._id} className="planner-surface p-4 flex items-center gap-3">
            <button
              onClick={() => toggleComplete(h._id, h.completed)}
              className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
              style={{ border: "2px solid var(--border-subtle)" }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{h.title}</p>
              <p className="text-xs text-muted-foreground">
                {h.subject}
                {h.dueDate && ` · Due ${new Date(h.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
              </p>
            </div>
            <button onClick={() => handleDelete(h._id)} className="p-1 text-muted-foreground hover:text-destructive">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {completed.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground mb-3">COMPLETED</h3>
          <div className="space-y-2">
            {completed.map((h) => (
              <div key={h._id} className="planner-surface p-4 flex items-center gap-3 opacity-60">
                <button
                  onClick={() => toggleComplete(h._id, h.completed)}
                  className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center"
                  style={{ background: "var(--accent-color)" }}
                >
                  <Check size={12} className="text-white" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm line-through truncate">{h.title}</p>
                  <p className="text-xs text-muted-foreground">{h.subject}</p>
                </div>
                <button onClick={() => handleDelete(h._id)} className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
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
    const res = await fetch(`/api/study/academic/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    if (res.ok) {
      setItems((prev) =>
        prev.map((i) => (i._id === id ? { ...i, completed: !completed } : i))
      );
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/study/academic/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i._id !== id));
    toast.success("Item removed");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {["all", ...ACADEMIC_ITEM_TYPES].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: typeFilter === t ? "var(--accent-glow)" : "var(--surface-2)",
                border: `1px solid ${typeFilter === t ? "var(--accent-color)" : "var(--border-subtle)"}`,
                color: typeFilter === t ? "var(--accent-color)" : "var(--text-muted)",
              }}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-all hover:-translate-y-0.5"
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="planner-surface p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                {ACADEMIC_ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Subject</label>
              <select
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              >
                {subjects.map((s) => (
                  <option key={s.name} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Title</label>
              <input
                type="text"
                placeholder="Midterm exam"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Due date</label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: "var(--text-muted)" }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !formTitle || !formDueDate} className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50">
              {saving ? "Adding..." : "Add item"}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {filtered.map((item) => (
          <div key={item._id} className="planner-surface p-4 flex items-center gap-3">
            <button
              onClick={() => toggleComplete(item._id, item.completed)}
              className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
              style={{
                background: item.completed ? "var(--accent-color)" : "transparent",
                border: item.completed ? "none" : "2px solid var(--border-subtle)",
              }}
            >
              {item.completed && <Check size={12} className="text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate ${item.completed ? "line-through opacity-60" : ""}`}>
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.subject} · {item.type}
                {item.grade !== undefined && item.grade !== null && ` · Grade: ${item.grade}%`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {new Date(item.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <button onClick={() => handleDelete(item._id)} className="p-1 text-muted-foreground hover:text-destructive">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="planner-surface p-8 text-center">
            <FileText size={32} className="mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No {typeFilter === "all" ? "academic items" : `${typeFilter}s`} yet
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

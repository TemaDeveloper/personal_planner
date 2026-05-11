"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import {
  Plus,
  Trash2,
  Clock,
  FolderOpen,
  X,
  Palette,
  Settings2,
} from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface HobbySession {
  _id: string;
  hobby: string;
  date: string;
  minutes: number;
  note?: string;
}

interface HobbyProject {
  _id: string;
  hobby: string;
  name: string;
  description?: string;
  status: "in-progress" | "completed" | "paused";
  startDate: string;
}

interface HobbyConfig {
  name: string;
  color: string;
  active: boolean;
}

type Tab = "overview" | "log" | "projects";

const STATUS_COLORS: Record<string, string> = {
  "in-progress": "var(--accent-color)",
  completed: "#22c55e",
  paused: "var(--text-muted)",
};

const HOBBY_COLORS = ["#f59e0b", "#ef4444", "#3b82f6", "#22c55e", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export default function HobbiesPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [sessions, setSessions] = useState<HobbySession[]>([]);
  const [projects, setProjects] = useState<HobbyProject[]>([]);
  const [hobbies, setHobbies] = useState<HobbyConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const [showLogForm, setShowLogForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [newHobbyName, setNewHobbyName] = useState("");
  const [newHobbyColor, setNewHobbyColor] = useState(HOBBY_COLORS[0]);

  useEffect(() => {
    Promise.all([
      fetch("/api/hobbies/sessions").then((r) => r.json()),
      fetch("/api/hobbies/projects").then((r) => r.json()),
      fetch("/api/user/preferences").then((r) => r.json()),
    ]).then(([sessData, projData, userData]) => {
      setSessions(sessData.sessions || []);
      setProjects(projData.projects || []);
      setHobbies(userData.hobbiesConfig?.hobbies || []);
      setLoading(false);
    });
  }, []);

  const activeHobbies = useMemo(() => hobbies.filter((h) => h.active), [hobbies]);
  const hobbyNames = useMemo(() => activeHobbies.map((h) => h.name), [activeHobbies]);
  const hobbyColorMap = useMemo(
    () => Object.fromEntries(activeHobbies.map((h) => [h.name, h.color])),
    [activeHobbies]
  );

  const addHobby = async () => {
    if (!newHobbyName.trim()) return;
    if (hobbies.some((h) => h.name.toLowerCase() === newHobbyName.trim().toLowerCase())) {
      toast.error("Hobby already exists");
      return;
    }
    const updated = [...hobbies, { name: newHobbyName.trim(), color: newHobbyColor, active: true }];
    const res = await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hobbiesConfig: { hobbies: updated } }),
    });
    if (res.ok) {
      setHobbies(updated);
      setNewHobbyName("");
      setNewHobbyColor(HOBBY_COLORS[(updated.length) % HOBBY_COLORS.length]);
      toast.success("Hobby added");
    }
  };

  const removeHobby = async (name: string) => {
    const updated = hobbies.filter((h) => h.name !== name);
    const res = await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hobbiesConfig: { hobbies: updated } }),
    });
    if (res.ok) {
      setHobbies(updated);
      toast.success("Hobby removed");
    }
  };

  // Weekly stats
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weeklySessions = useMemo(
    () =>
      sessions.filter((s) => {
        const d = new Date(s.date);
        return d >= weekStart && d <= weekEnd;
      }),
    [sessions, weekStart, weekEnd]
  );

  const weeklyByHobby = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of weeklySessions) {
      map[s.hobby] = (map[s.hobby] || 0) + s.minutes;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [weeklySessions]);

  const totalWeeklyMinutes = weeklySessions.reduce((s, x) => s + x.minutes, 0);

  const TABS: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "log", label: "Log Time" },
    { id: "projects", label: "Projects" },
  ];

  if (loading) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Hobbies" />
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
      <PageHeader
        title="Hobbies"
        description="Track hobby time & projects"
        action={
          <button
            onClick={() => setShowManage((v) => !v)}
            className="p-2 rounded-lg transition-all"
            style={{
              background: showManage ? "var(--accent-glow)" : "var(--surface-1)",
              border: `1px solid ${showManage ? "var(--accent-color)" : "var(--border-subtle)"}`,
              color: showManage ? "var(--accent-color)" : "var(--text-muted)",
            }}
          >
            <Settings2 size={16} />
          </button>
        }
      />

      {/* Manage hobbies panel */}
      {showManage && (
        <div className="planner-surface p-4 mb-6 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Manage Hobbies</h3>
          {hobbies.map((h) => (
            <div
              key={h.name}
              className="flex items-center gap-3 p-2 rounded-lg"
              style={{ background: "var(--surface-2)" }}
            >
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: h.color }} />
              <span className="flex-1 text-sm font-medium">{h.name}</span>
              <button
                onClick={() => removeHobby(h.name)}
                className="p-1.5 min-w-[28px] min-h-[28px] text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="space-y-2 pt-1">
            <div className="flex gap-2 flex-wrap">
              {HOBBY_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewHobbyColor(c)}
                  className="w-6 h-6 rounded-full transition-all"
                  style={{
                    background: c,
                    opacity: newHobbyColor === c ? 1 : 0.35,
                    boxShadow: newHobbyColor === c ? `0 0 0 2px var(--background), 0 0 0 3px ${c}` : "none",
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New hobby name"
                value={newHobbyName}
                onChange={(e) => setNewHobbyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addHobby()}
                className="flex-1 px-3 py-2 rounded-lg text-sm min-w-0"
                style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
              <button
                onClick={addHobby}
                disabled={!newHobbyName.trim()}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground disabled:opacity-50 flex-shrink-0"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {activeHobbies.length === 0 && !showManage && (
        <div className="planner-surface p-8 text-center mb-6">
          <Palette size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-3">
            No hobbies configured yet.
          </p>
          <button
            onClick={() => setShowManage(true)}
            className="text-sm font-medium px-4 py-2 rounded-lg"
            style={{ background: "var(--accent-glow)", color: "var(--accent-color)", border: "1px solid var(--accent-color)" }}
          >
            Add your first hobby
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: "var(--surface-1)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? "var(--accent-glow)" : "transparent",
              color: tab === t.id ? "var(--accent-color)" : "var(--text-muted)",
              border: tab === t.id ? "1px solid var(--accent-color)" : "1px solid transparent",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-4">
          <div className="planner-surface p-6">
            <h3 className="text-sm font-semibold mb-4">This Week</h3>
            {weeklyByHobby.length === 0 ? (
              <p className="text-xs text-muted-foreground">No time logged this week.</p>
            ) : (
              <div className="space-y-3">
                {weeklyByHobby.map(([hobby, mins]) => {
                  const pct = totalWeeklyMinutes > 0 ? (mins / totalWeeklyMinutes) * 100 : 0;
                  return (
                    <div key={hobby}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium">{hobby}</span>
                        <span className="text-muted-foreground">
                          {Math.floor(mins / 60)}h {mins % 60}m
                        </span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: "var(--surface-2)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: hobbyColorMap[hobby] || "var(--accent-color)",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground pt-2">
                  Total: {Math.floor(totalWeeklyMinutes / 60)}h {totalWeeklyMinutes % 60}m
                </p>
              </div>
            )}
          </div>

          {/* Active projects summary */}
          <div className="planner-surface p-6">
            <h3 className="text-sm font-semibold mb-4">Active Projects</h3>
            {projects.filter((p) => p.status === "in-progress").length === 0 ? (
              <p className="text-xs text-muted-foreground">No active projects.</p>
            ) : (
              <div className="space-y-2">
                {projects
                  .filter((p) => p.status === "in-progress")
                  .map((p) => (
                    <div
                      key={p._id}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: hobbyColorMap[p.hobby] || "var(--accent-color)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.hobby}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Time tab */}
      {tab === "log" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowLogForm(true)}
            className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--surface-1)",
              border: "1px dashed var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            <Plus size={14} />
            Log time
          </button>

          {sessions.length === 0 ? (
            <div className="planner-surface p-8 text-center">
              <Clock size={32} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No sessions logged yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 50).map((s) => (
                <div key={s._id} className="planner-surface p-4 flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: hobbyColorMap[s.hobby] || "var(--accent-color)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{s.hobby}</span>
                      <span className="text-xs text-muted-foreground">
                        {Math.floor(s.minutes / 60)}h {s.minutes % 60}m
                      </span>
                    </div>
                    {s.note && (
                      <p className="text-xs text-muted-foreground truncate">{s.note}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(s.date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await fetch(`/api/hobbies/sessions/${s._id}`, { method: "DELETE" });
                      setSessions((prev) => prev.filter((x) => x._id !== s._id));
                      toast.success("Deleted");
                    }}
                    className="p-1.5 min-w-[28px] min-h-[28px] text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Projects tab */}
      {tab === "projects" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowProjectForm(true)}
            className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
            style={{
              background: "var(--surface-1)",
              border: "1px dashed var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            <Plus size={14} />
            New project
          </button>

          {projects.length === 0 ? (
            <div className="planner-surface p-8 text-center">
              <FolderOpen size={32} className="mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No projects yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((p) => (
                <div key={p._id} className="planner-surface p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                      style={{ background: hobbyColorMap[p.hobby] || "var(--accent-color)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{p.name}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: `${STATUS_COLORS[p.status]}20`,
                            color: STATUS_COLORS[p.status],
                          }}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.hobby}</p>
                      {p.description && (
                        <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <select
                        value={p.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          const res = await fetch(`/api/hobbies/projects/${p._id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ status: newStatus }),
                          });
                          if (res.ok) {
                            setProjects((prev) =>
                              prev.map((x) =>
                                x._id === p._id ? { ...x, status: newStatus as HobbyProject["status"] } : x
                              )
                            );
                          }
                        }}
                        className="text-xs rounded px-1 py-1"
                        style={{
                          background: "var(--surface-2)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="paused">Paused</option>
                      </select>
                      <button
                        onClick={async () => {
                          await fetch(`/api/hobbies/projects/${p._id}`, { method: "DELETE" });
                          setProjects((prev) => prev.filter((x) => x._id !== p._id));
                          toast.success("Deleted");
                        }}
                        className="p-1.5 min-w-[28px] min-h-[28px] text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log Time Modal */}
      {showLogForm && (
        <LogTimeModal
          hobbyNames={hobbyNames}
          onClose={() => setShowLogForm(false)}
          onSuccess={(s) => {
            setSessions((prev) => [s, ...prev]);
            setShowLogForm(false);
          }}
        />
      )}

      {/* New Project Modal */}
      {showProjectForm && (
        <ProjectModal
          hobbyNames={hobbyNames}
          onClose={() => setShowProjectForm(false)}
          onSuccess={(p) => {
            setProjects((prev) => [p, ...prev]);
            setShowProjectForm(false);
          }}
        />
      )}
    </div>
  );
}

function LogTimeModal({
  hobbyNames,
  onClose,
  onSuccess,
}: {
  hobbyNames: string[];
  onClose: () => void;
  onSuccess: (s: HobbySession) => void;
}) {
  const [hobby, setHobby] = useState(hobbyNames[0] || "");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hobby || !minutes) return;
    setSaving(true);

    const res = await fetch("/api/hobbies/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hobby, date, minutes: Number(minutes), note }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("Time logged");
      onSuccess(data.session);
    } else {
      toast.error("Failed to log time");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-xl p-6 animate-slide-up"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Log Time</h3>
          <button onClick={onClose}>
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Hobby</label>
            <select
              value={hobby}
              onChange={(e) => setHobby(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {hobbyNames.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Minutes</label>
              <input
                type="number"
                min="1"
                placeholder="60"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Note (optional)</label>
            <input
              type="text"
              placeholder="What did you work on?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !hobby || !minutes}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving..." : "Log time"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProjectModal({
  hobbyNames,
  onClose,
  onSuccess,
}: {
  hobbyNames: string[];
  onClose: () => void;
  onSuccess: (p: HobbyProject) => void;
}) {
  const [hobby, setHobby] = useState(hobbyNames[0] || "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hobby || !name.trim()) return;
    setSaving(true);

    const res = await fetch("/api/hobbies/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hobby, name, description }),
    });

    if (res.ok) {
      const data = await res.json();
      toast.success("Project created");
      onSuccess(data.project);
    } else {
      toast.error("Failed to create project");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-md rounded-xl p-6 animate-slide-up"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">New Project</h3>
          <button onClick={onClose}>
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Hobby</label>
            <select
              value={hobby}
              onChange={(e) => setHobby(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            >
              {hobbyNames.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Project name</label>
            <input
              type="text"
              placeholder="e.g. Oil painting landscape"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Description (optional)</label>
            <textarea
              placeholder="What's this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

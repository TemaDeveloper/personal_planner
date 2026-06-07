"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput, FormSelect, FormTextarea } from "@/components/ui/form-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Progress } from "@/components/ui/progress";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatBlock } from "@/components/ui/stat-block";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PageTransition } from "@/components/ui/page-transition";
import { SectionCustomFields } from "@/components/sections/custom-fields";
import {
  Plus,
  Trash2,
  Clock,
  FolderOpen,
  Palette,
  Settings2,
  Download,
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

// Status tokens: use semantic token pairs (text on wash background)
const STATUS_TOKENS: Record<string, { color: string; bg: string; label: string }> = {
  "in-progress": { color: "var(--accent-text)", bg: "var(--accent-glow)", label: "In Progress" },
  completed: { color: "var(--good)", bg: "var(--good-wash)", label: "Completed" },
  paused: { color: "var(--text-muted)", bg: "var(--surface-1)", label: "Paused" },
};

// Chart token colors for hobby swatches — no hardcoded hex
const HOBBY_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--accent-color)",
  "var(--warn)",
  "var(--alert)",
];

// Fallback hex values only used for visual swatch rendering where CSS vars can't be used in bg-color picker buttons
const HOBBY_COLORS_HEX = ["#f59e0b", "#ef4444", "#3b82f6", "#22c55e", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

const TAB_SEGMENTS: { value: Tab; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "log", label: "Log Time" },
  { value: "projects", label: "Projects" },
];

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
  const [newHobbyColor, setNewHobbyColor] = useState(HOBBY_COLORS_HEX[0]);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [deleteHobbyName, setDeleteHobbyName] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      setNewHobbyColor(HOBBY_COLORS_HEX[(updated.length) % HOBBY_COLORS_HEX.length]);
      toast.success("Hobby added");
    }
  };

  const removeHobby = async (name: string) => {
    setDeleting(true);
    try {
      const updated = hobbies.filter((h) => h.name !== name);
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hobbiesConfig: { hobbies: updated } }),
      });
      if (res.ok) {
        setHobbies(updated);
        toast.success("Hobby removed");
      } else {
        toast.error("Failed to remove hobby");
      }
    } catch {
      toast.error("Network error while removing hobby");
    }
    setDeleting(false);
    setDeleteHobbyName(null);
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
  const totalWeeklyHours = Math.floor(totalWeeklyMinutes / 60);
  const totalWeeklyRem = totalWeeklyMinutes % 60;

  if (loading) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Hobbies" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <PageHeader
        title="Hobbies"
        description="Track hobby time & projects"
        action={
          <>
            <button
              onClick={() => { window.location.href = "/api/export/hobbies"; }}
              className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-[var(--text-muted)]"
              aria-label="Export to Excel"
            >
              <Download size={16} />
            </button>
            <Button
              variant={showManage ? "primary" : "secondary"}
              size="icon"
              onClick={() => setShowManage((v) => !v)}
              aria-label="Manage hobbies"
            >
              <Settings2 size={16} />
            </Button>
          </>
        }
      />

      {/* Manage hobbies panel */}
      {showManage && (
        <Card className="mb-6">
          <div className="space-y-3">
            <p className="stat-label">Manage Hobbies</p>
            {hobbies.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">No hobbies configured yet.</p>
            )}
            {hobbies.map((h) => (
              <Card key={h.name} variant="inset" padding="sm" className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ background: h.color }}
                />
                <span className="flex-1 text-sm font-medium truncate text-[var(--text-primary)]">{h.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteHobbyName(h.name)}
                  className="hover:text-destructive"
                  aria-label="Delete hobby"
                >
                  <Trash2 size={14} />
                </Button>
              </Card>
            ))}
            <div className="space-y-2 pt-1">
              <div className="flex gap-2 flex-wrap">
                {HOBBY_COLORS_HEX.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewHobbyColor(c)}
                    className="w-7 h-7 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    style={{
                      background: "transparent",
                    }}
                    aria-label={`Choose hobby color ${c}`}
                    aria-pressed={newHobbyColor === c}
                  >
                    <span
                      className="w-5 h-5 rounded-full block"
                      style={{
                        background: c,
                        opacity: newHobbyColor === c ? 1 : 0.35,
                        outline: newHobbyColor === c ? `2px solid ${c}` : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <FormInput
                  type="text"
                  placeholder="New hobby name"
                  value={newHobbyName}
                  onChange={(e) => setNewHobbyName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHobby()}
                  className="flex-1 min-w-0"
                />
                <Button
                  onClick={addHobby}
                  disabled={!newHobbyName.trim()}
                  size="md"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {activeHobbies.length === 0 && !showManage && (
        <EmptyState
          icon={Palette}
          title="No hobbies configured"
          description="Add your hobbies via the settings button, then start logging time and projects."
          actionLabel="Set up hobbies"
          onAction={() => setShowManage(true)}
        />
      )}

      {/* Tabs */}
      <SegmentedControl
        segments={TAB_SEGMENTS}
        value={tab}
        onChange={setTab}
        layoutId="hobbies-tabs"
        className="w-full mb-6"
      />

      {/* Overview tab */}
      {tab === "overview" && (
        <div className="space-y-4">
          {/* Hero weekly stat */}
          <Card>
            <StatBlock
              label="This Week"
              value={`${totalWeeklyHours}h ${totalWeeklyRem}m`}
              sub={`${weeklySessions.length} session${weeklySessions.length !== 1 ? "s" : ""} across ${weeklyByHobby.length} hobb${weeklyByHobby.length !== 1 ? "ies" : "y"}`}
              size="hero"
              className="mb-4"
            />
            {weeklyByHobby.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No time logged this week.</p>
            ) : (
              <div className="space-y-3">
                {weeklyByHobby.map(([hobby, mins]) => {
                  const pct = totalWeeklyMinutes > 0 ? (mins / totalWeeklyMinutes) * 100 : 0;
                  const h = Math.floor(mins / 60);
                  const m = mins % 60;
                  return (
                    <div key={hobby}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-[var(--text-primary)]">{hobby}</span>
                        <span className="num text-[var(--text-muted)]">
                          {h}h {m}m
                        </span>
                      </div>
                      <Progress
                        value={pct}
                        size="md"
                        color={hobbyColorMap[hobby] || "var(--accent-color)"}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Active projects summary */}
          <Card>
            <p className="stat-label mb-3">Active Projects</p>
            {projects.filter((p) => p.status === "in-progress").length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No active projects"
                description="Start a new project in the Projects tab."
                actionLabel="New project"
                onAction={() => setTab("projects")}
              />
            ) : (
              <div className="space-y-2">
                {projects
                  .filter((p) => p.status === "in-progress")
                  .map((p) => (
                    <Card key={p._id} variant="inset" padding="sm" className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: hobbyColorMap[p.hobby] || "var(--accent-color)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[var(--text-primary)]">{p.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{p.hobby}</p>
                      </div>
                    </Card>
                  ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Log Time tab */}
      {tab === "log" && (
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => setShowLogForm(true)}
            className="w-full py-3 border-dashed"
          >
            <Plus size={14} />
            Log time
          </Button>

          {sessions.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No sessions logged yet"
              description="Log your first hobby session to start tracking time."
              actionLabel="Log time"
              onAction={() => setShowLogForm(true)}
            />
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 50).map((s) => (
                <Card key={s._id} padding="md" className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: hobbyColorMap[s.hobby] || "var(--accent-color)" }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{s.hobby}</span>
                      <span className="num text-xs text-[var(--text-muted)]">
                        {Math.floor(s.minutes / 60)}h {s.minutes % 60}m
                      </span>
                    </div>
                    {s.note && (
                      <p className="text-xs truncate text-[var(--text-muted)]">{s.note}</p>
                    )}
                    <p className="text-[10px] text-[var(--text-faint)]">
                      {format(new Date(s.date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteSessionId(s._id)}
                    className="hover:text-destructive"
                    aria-label="Delete session"
                  >
                    <Trash2 size={14} />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Projects tab */}
      {tab === "projects" && (
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => setShowProjectForm(true)}
            className="w-full py-3 border-dashed"
          >
            <Plus size={14} />
            New project
          </Button>

          {projects.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No projects yet"
              description="Create a project to track longer-term hobby work."
              actionLabel="New project"
              onAction={() => setShowProjectForm(true)}
            />
          ) : (
            <div className="space-y-2">
              {projects.map((p) => {
                const statusToken = STATUS_TOKENS[p.status] ?? STATUS_TOKENS["paused"];
                return (
                  <Card key={p._id} padding="md">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                        style={{ background: hobbyColorMap[p.hobby] || "var(--accent-color)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: statusToken.bg,
                              color: statusToken.color,
                            }}
                          >
                            {statusToken.label}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">{p.hobby}</p>
                        {p.description && (
                          <p className="text-xs mt-1 text-[var(--text-muted)]">{p.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <FormSelect
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
                          className="text-xs"
                        >
                          <option value="in-progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="paused">Paused</option>
                        </FormSelect>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteProjectId(p._id)}
                          className="hover:text-destructive"
                          aria-label="Delete project"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Log Time Modal */}
      <Modal open={showLogForm} onClose={() => setShowLogForm(false)} title="Log Time" maxWidth="max-w-md">
        <LogTimeForm
          hobbyNames={hobbyNames}
          onClose={() => setShowLogForm(false)}
          onSuccess={(s) => {
            setSessions((prev) => [s, ...prev]);
            setShowLogForm(false);
          }}
        />
      </Modal>

      {/* New Project Modal */}
      <Modal open={showProjectForm} onClose={() => setShowProjectForm(false)} title="New Project" maxWidth="max-w-md">
        <ProjectForm
          hobbyNames={hobbyNames}
          onClose={() => setShowProjectForm(false)}
          onSuccess={(p) => {
            setProjects((prev) => [p, ...prev]);
            setShowProjectForm(false);
          }}
        />
      </Modal>

      {/* Confirm delete session */}
      <ConfirmDialog
        open={!!deleteSessionId}
        onClose={() => setDeleteSessionId(null)}
        onConfirm={async () => {
          if (!deleteSessionId) return;
          setDeleting(true);
          try {
            const res = await fetch(`/api/hobbies/sessions/${deleteSessionId}`, { method: "DELETE" });
            if (res.ok) {
              setSessions((prev) => prev.filter((x) => x._id !== deleteSessionId));
              toast.success("Session deleted");
            } else {
              toast.error("Failed to delete session");
            }
          } catch {
            toast.error("Network error while deleting session");
          }
          setDeleting(false);
          setDeleteSessionId(null);
        }}
        message="This will permanently delete this hobby session."
        loading={deleting}
      />

      {/* Confirm delete project */}
      <ConfirmDialog
        open={!!deleteProjectId}
        onClose={() => setDeleteProjectId(null)}
        onConfirm={async () => {
          if (!deleteProjectId) return;
          setDeleting(true);
          try {
            const res = await fetch(`/api/hobbies/projects/${deleteProjectId}`, { method: "DELETE" });
            if (res.ok) {
              setProjects((prev) => prev.filter((x) => x._id !== deleteProjectId));
              toast.success("Project deleted");
            } else {
              toast.error("Failed to delete project");
            }
          } catch {
            toast.error("Network error while deleting project");
          }
          setDeleting(false);
          setDeleteProjectId(null);
        }}
        message="This will permanently delete this hobby project."
        loading={deleting}
      />

      {/* Confirm delete hobby */}
      <ConfirmDialog
        open={!!deleteHobbyName}
        onClose={() => setDeleteHobbyName(null)}
        onConfirm={() => {
          if (deleteHobbyName) removeHobby(deleteHobbyName);
        }}
        message="This will permanently remove this hobby and its configuration."
        confirmLabel="Remove"
        loading={deleting}
      />
      <SectionCustomFields sectionKey="hobbies" />
    </PageTransition>
  );
}

function LogTimeForm({
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormSelect
        label="Hobby"
        value={hobby}
        onChange={(e) => setHobby(e.target.value)}
      >
        {hobbyNames.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </FormSelect>

      <div className="grid grid-cols-2 gap-3">
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
          placeholder="60"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
      </div>

      <FormInput
        label="Note (optional)"
        type="text"
        placeholder="What did you work on?"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !hobby || !minutes} className="flex-1">
          {saving ? "Saving..." : "Log time"}
        </Button>
      </div>
    </form>
  );
}

function ProjectForm({
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormSelect
        label="Hobby"
        value={hobby}
        onChange={(e) => setHobby(e.target.value)}
      >
        {hobbyNames.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </FormSelect>

      <FormInput
        label="Project name"
        type="text"
        placeholder="e.g. Oil painting landscape"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <FormTextarea
        label="Description (optional)"
        placeholder="What's this project about?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
      />

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" type="button" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !name.trim()} className="flex-1">
          {saving ? "Creating..." : "Create project"}
        </Button>
      </div>
    </form>
  );
}

"use client";
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-input";
import { Skeleton } from "@/components/ui/skeleton";
import { SECTION_META, type SectionId } from "@/lib/constants";
import {
  Briefcase, Dumbbell, Flame, GraduationCap, Palette,
  Home, Heart, NotebookPen, DollarSign, UtensilsCrossed,
  Plus, Trash2, Pencil, Check, X, Car, Star,
} from "lucide-react";
import { ICON_MAP } from "@/lib/icon-map";
import { RenderedLayout } from "@/components/sections/rendered-layout";

// ---------- Types ----------

interface DayDetailProps {
  date: string; // yyyy-MM-dd
  onDataChange: () => void;
}

interface WorkEntry { _id: string; jobName: string; hours: number; note?: string }
interface GymEntry { _id: string; date: string }
interface HabitEntry { _id: string; name: string; emoji: string; color: string; completed: boolean }
interface StudyEntry { _id: string; subject: string; minutes: number; note?: string }
interface HobbyEntry { _id: string; hobby: string; minutes: number; note?: string }
interface HouseworkEntry { _id: string; choreName: string; completed: boolean }
interface HealthEntry { _id: string; water: number; sleepHours: number; weight?: number; mood: number }
interface JournalData { _id: string; content: string; mood: number }
interface ExpenseEntry { _id: string; amount: number; description: string; category?: string }
interface RouteEntry { _id: string; origin: string; destination: string; distanceKm: number }
interface MealPlanEntry { _id: string; meals: { type: string; name: string; notes?: string }[] }
interface CustomField { key: string; label: string; type: "boolean" | "number" | "text" | "select" | "date"; options?: string[] }
interface CustomSectionData {
  template: { name: string; slug: string; icon: string; fields: CustomField[]; layoutHtml?: string };
  entries: { _id: string; date: string; data: Record<string, unknown> }[];
}

interface DayData {
  work?: WorkEntry[];
  gym?: GymEntry[];
  habits?: HabitEntry[];
  study?: StudyEntry[];
  hobbies?: HobbyEntry[];
  housework?: HouseworkEntry[];
  health?: HealthEntry;
  journal?: JournalData;
  finances?: { expenses: ExpenseEntry[]; routes: RouteEntry[] };
  mealprep?: MealPlanEntry;
  [key: `custom:${string}`]: CustomSectionData;
}

const SECTION_COLORS: Record<string, string> = {
  work: "var(--chart-1)", gym: "var(--chart-2)", finances: "var(--chart-3)",
  habits: "var(--chart-5)", study: "var(--chart-2)", hobbies: "var(--chart-1)",
  housework: "var(--chart-4)", health: "var(--chart-5)", journal: "var(--chart-3)",
  mealprep: "var(--chart-4)",
};

const SECTION_ICONS: Record<string, React.ComponentType<{ size: number; className?: string; style?: React.CSSProperties }>> = {
  work: Briefcase, gym: Dumbbell, habits: Flame, study: GraduationCap,
  hobbies: Palette, housework: Home, health: Heart, journal: NotebookPen,
  finances: DollarSign, mealprep: UtensilsCrossed,
};

// ---------- Main Component ----------

export function DashboardDayDetail({ date, onDataChange }: DayDetailProps) {
  const [data, setData] = useState<DayData | null>(null);
  const [jobs, setJobs] = useState<{ name: string }[]>([]);
  const [currency, setCurrency] = useState("CAD");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetch(`/api/dashboard/day-detail?date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d.sections || {});
        setJobs(d.jobs || []);
        setCurrency(d.currency || "CAD");
        setLoading(false);
      })
      .catch(() => {
        setData({});
        setLoading(false);
      });
  }, [date]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchData manages its own state transitions for data loading
  useEffect(() => { fetchData(); }, [fetchData]);

  const refresh = () => { fetchData(); onDataChange(); };

  const dateLabel = format(new Date(date + "T00:00:00"), "EEEE, MMM d");

  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="mt-4 p-4 rounded-lg surface-inset text-center">
        <p className="text-sm text-[var(--text-muted)]">No activity on {dateLabel}</p>
      </div>
    );
  }

  const builtInOrder: string[] = ["work", "gym", "habits", "study", "hobbies", "housework", "health", "journal", "finances", "mealprep"];
  const customKeys = Object.keys(data).filter((k) => k.startsWith("custom:"));
  const activeSections = [...builtInOrder.filter((s) => data[s as keyof DayData]), ...customKeys];

  return (
    <motion.div
      className="mt-4 space-y-3"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <p className="text-xs font-medium text-[var(--accent-color)]">{dateLabel}</p>

      {activeSections.map((sectionId) => (
        <SectionCard key={sectionId} sectionId={sectionId} data={data} date={date} jobs={jobs} currency={currency} onRefresh={refresh} />
      ))}
    </motion.div>
  );
}

// ---------- Section Card Wrapper ----------

function SectionCard({
  sectionId, data, date, jobs, currency, onRefresh,
}: {
  sectionId: string; data: DayData; date: string;
  jobs: { name: string }[]; currency: string; onRefresh: () => void;
}) {
  const isCustom = sectionId.startsWith("custom:");

  if (isCustom) {
    const customData = data[sectionId as `custom:${string}`] as CustomSectionData;
    const CustomIcon = ICON_MAP[customData.template.icon] || Star;
    return (
      <Card padding="md" className="space-y-2">
        <div className="flex items-center gap-2">
          <CustomIcon size={16} style={{ color: "var(--accent-color)" }} />
          <span className="text-sm font-semibold">{customData.template.name}</span>
        </div>
        <CustomSectionRenderer data={customData} date={date} onRefresh={onRefresh} />
      </Card>
    );
  }

  const Icon = SECTION_ICONS[sectionId] || Briefcase;
  const meta = SECTION_META[sectionId as SectionId];
  const label = meta?.label || sectionId;
  const color = SECTION_COLORS[sectionId] || "var(--accent-color)";

  return (
    <Card padding="md" className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon size={16} style={{ color }} />
        <span className="text-sm font-semibold">{label}</span>
      </div>

      {sectionId === "work" && <WorkSection entries={data.work!} date={date} jobs={jobs} currency={currency} onRefresh={onRefresh} />}
      {sectionId === "gym" && <GymSection entries={data.gym!} date={date} onRefresh={onRefresh} />}
      {sectionId === "habits" && <HabitsSection entries={data.habits!} date={date} onRefresh={onRefresh} />}
      {sectionId === "study" && <StudySection entries={data.study!} date={date} onRefresh={onRefresh} />}
      {sectionId === "hobbies" && <HobbiesSection entries={data.hobbies!} date={date} onRefresh={onRefresh} />}
      {sectionId === "housework" && <HouseworkSection entries={data.housework!} date={date} onRefresh={onRefresh} />}
      {sectionId === "health" && <HealthSection entry={data.health!} date={date} onRefresh={onRefresh} />}
      {sectionId === "journal" && <JournalSection entry={data.journal!} date={date} onRefresh={onRefresh} />}
      {sectionId === "finances" && <FinancesSection data={data.finances!} date={date} currency={currency} onRefresh={onRefresh} />}
      {sectionId === "mealprep" && <MealprepSection entry={data.mealprep!} />}
    </Card>
  );
}

// ---------- Work Section ----------

function WorkSection({ entries, date, jobs, currency, onRefresh }: {
  entries: WorkEntry[]; date: string; jobs: { name: string }[]; currency: string; onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-1.5">
      {entries.map((e) => (
        editing === e._id ? (
          <WorkEditForm key={e._id} entry={e} date={date} jobs={jobs} onCancel={() => setEditing(null)} onSave={onRefresh} />
        ) : (
          <div key={e._id} className="flex items-center justify-between text-sm group">
            <span><span className="font-medium">{e.jobName}</span> — {e.hours}h{e.note ? ` · ${e.note}` : ""}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditing(e._id)} className="p-1 rounded hover:bg-[var(--surface-1)]" aria-label="Edit session"><Pencil size={12} /></button>
              <button onClick={async () => {
                await fetch(`/api/work/sessions/${e._id}`, { method: "DELETE" });
                toast.success("Deleted");
                onRefresh();
              }} className="p-1 rounded hover:bg-[var(--surface-1)] text-destructive" aria-label="Delete session"><Trash2 size={12} /></button>
            </div>
          </div>
        )
      ))}
      {adding ? (
        <WorkEditForm entry={null} date={date} jobs={jobs} onCancel={() => setAdding(false)} onSave={() => { setAdding(false); onRefresh(); }} />
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-color)] transition-colors mt-1">
          <Plus size={12} /> Add session
        </button>
      )}
    </div>
  );
}

function WorkEditForm({ entry, date, jobs, onCancel, onSave }: {
  entry: WorkEntry | null; date: string; jobs: { name: string }[];
  onCancel: () => void; onSave: () => void;
}) {
  const [jobName, setJobName] = useState(entry?.jobName || jobs[0]?.name || "");
  const [hours, setHours] = useState(entry?.hours?.toString() || "");
  const [note, setNote] = useState(entry?.note || "");

  const submit = async () => {
    if (!hours || !jobName) return;
    const url = entry ? `/api/work/sessions/${entry._id}` : "/api/work/sessions";
    const method = entry ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobName, date, hours: Number(hours), note }),
    });
    if (res.ok) { toast.success(entry ? "Updated" : "Added"); onSave(); }
    else toast.error("Failed");
  };

  return (
    <div className="flex flex-wrap gap-2 items-end p-2 rounded-lg surface-inset">
      {jobs.length > 1 && (
        <FormSelect label="Job" value={jobName} onChange={(e) => setJobName(e.target.value)} className="flex-1 min-w-[100px]">
          {jobs.map((j) => <option key={j.name} value={j.name}>{j.name}</option>)}
        </FormSelect>
      )}
      <FormInput label="Hours" type="number" value={hours} onChange={(e) => setHours(e.target.value)} className="w-20" step="0.5" min="0" max="24" />
      <FormInput label="Note" value={note} onChange={(e) => setNote(e.target.value)} className="flex-1 min-w-[100px]" />
      <div className="flex gap-1">
        <Button size="sm" onClick={submit}><Check size={14} /></Button>
        <Button size="sm" variant="ghost" onClick={onCancel}><X size={14} /></Button>
      </div>
    </div>
  );
}

// ---------- Gym Section ----------

function GymSection({ entries, date, onRefresh }: {
  entries: GymEntry[]; date: string; onRefresh: () => void;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[var(--accent-color)] font-medium">Attended</span>
      <button
        onClick={async () => {
          await fetch(`/api/gym/workouts/${entries[0]._id}`, { method: "DELETE" });
          toast.success("Removed");
          onRefresh();
        }}
        className="p-1 rounded hover:bg-[var(--surface-1)] text-destructive"
        aria-label="Remove attendance"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

// ---------- Habits Section ----------

function HabitsSection({ entries, date, onRefresh }: {
  entries: HabitEntry[]; date: string; onRefresh: () => void;
}) {
  const toggleHabit = async (habitId: string) => {
    await fetch(`/api/habits/${habitId}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    onRefresh();
  };

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map((h) => (
        <button
          key={h._id}
          onClick={() => toggleHabit(h._id)}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-colors"
          style={{ background: h.color + "20", color: h.color }}
        >
          <span>{h.emoji}</span>
          <span>{h.name}</span>
          <Check size={10} />
        </button>
      ))}
    </div>
  );
}

// ---------- Study Section ----------

function StudySection({ entries, date, onRefresh }: {
  entries: StudyEntry[]; date: string; onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      {entries.map((e) => (
        editing === e._id ? (
          <SessionEditForm key={e._id} entry={e} apiPath="/api/study/sessions" fields={["subject", "minutes", "note"]} onCancel={() => setEditing(null)} onSave={onRefresh} />
        ) : (
          <div key={e._id} className="flex items-center justify-between text-sm group">
            <span><span className="font-medium">{e.subject}</span> — {e.minutes}min{e.note ? ` · ${e.note}` : ""}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditing(e._id)} className="p-1 rounded hover:bg-[var(--surface-1)]" aria-label="Edit"><Pencil size={12} /></button>
              <button onClick={async () => { await fetch(`/api/study/sessions/${e._id}`, { method: "DELETE" }); toast.success("Deleted"); onRefresh(); }} className="p-1 rounded hover:bg-[var(--surface-1)] text-destructive" aria-label="Delete"><Trash2 size={12} /></button>
            </div>
          </div>
        )
      ))}
    </div>
  );
}

// ---------- Hobbies Section ----------

function HobbiesSection({ entries, date, onRefresh }: {
  entries: HobbyEntry[]; date: string; onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      {entries.map((e) => (
        editing === e._id ? (
          <SessionEditForm key={e._id} entry={{ ...e, subject: e.hobby }} apiPath="/api/hobbies/sessions" fields={["hobby", "minutes", "note"]} onCancel={() => setEditing(null)} onSave={onRefresh} />
        ) : (
          <div key={e._id} className="flex items-center justify-between text-sm group">
            <span><span className="font-medium">{e.hobby}</span> — {e.minutes}min{e.note ? ` · ${e.note}` : ""}</span>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setEditing(e._id)} className="p-1 rounded hover:bg-[var(--surface-1)]" aria-label="Edit"><Pencil size={12} /></button>
              <button onClick={async () => { await fetch(`/api/hobbies/sessions/${e._id}`, { method: "DELETE" }); toast.success("Deleted"); onRefresh(); }} className="p-1 rounded hover:bg-[var(--surface-1)] text-destructive" aria-label="Delete"><Trash2 size={12} /></button>
            </div>
          </div>
        )
      ))}
    </div>
  );
}

// ---------- Shared Session Edit Form (study/hobbies) ----------

function SessionEditForm({ entry, apiPath, fields, onCancel, onSave }: {
  entry: { _id: string; subject?: string; hobby?: string; minutes: number; note?: string };
  apiPath: string; fields: string[];
  onCancel: () => void; onSave: () => void;
}) {
  const nameField = fields.includes("hobby") ? "hobby" : "subject";
  const [name, setName] = useState((entry as Record<string, unknown>)[nameField] as string || "");
  const [minutes, setMinutes] = useState(entry.minutes.toString());
  const [note, setNote] = useState(entry.note || "");

  const submit = async () => {
    const body: Record<string, unknown> = { [nameField]: name, minutes: Number(minutes), note };
    const res = await fetch(`${apiPath}/${entry._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { toast.success("Updated"); onSave(); }
    else toast.error("Failed");
  };

  return (
    <div className="flex flex-wrap gap-2 items-end p-2 rounded-lg surface-inset">
      <FormInput label={nameField === "hobby" ? "Hobby" : "Subject"} value={name} onChange={(e) => setName(e.target.value)} className="flex-1 min-w-[80px]" />
      <FormInput label="Minutes" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-20" />
      <FormInput label="Note" value={note} onChange={(e) => setNote(e.target.value)} className="flex-1 min-w-[80px]" />
      <div className="flex gap-1">
        <Button size="sm" onClick={submit}><Check size={14} /></Button>
        <Button size="sm" variant="ghost" onClick={onCancel}><X size={14} /></Button>
      </div>
    </div>
  );
}

// ---------- Housework Section ----------

function HouseworkSection({ entries, date, onRefresh }: {
  entries: HouseworkEntry[]; date: string; onRefresh: () => void;
}) {
  const toggle = async (id: string, completed: boolean) => {
    await fetch(`/api/housework/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    onRefresh();
  };

  return (
    <div className="space-y-1">
      {entries.map((e) => (
        <div key={e._id} className="flex items-center justify-between text-sm group">
          <button onClick={() => toggle(e._id, e.completed)} className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border flex items-center justify-center" style={{
              borderColor: e.completed ? "var(--accent-color)" : "var(--border-subtle)",
              background: e.completed ? "var(--accent-color)" : "transparent",
            }}>
              {e.completed && <Check size={10} className="text-white" />}
            </div>
            <span className={e.completed ? "line-through text-[var(--text-muted)]" : ""}>{e.choreName}</span>
          </button>
          <button onClick={async () => { await fetch(`/api/housework/${e._id}`, { method: "DELETE" }); toast.success("Deleted"); onRefresh(); }}
            className="p-1 rounded hover:bg-[var(--surface-1)] text-destructive opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete">
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ---------- Health Section ----------

function HealthSection({ entry, date, onRefresh }: {
  entry: HealthEntry; date: string; onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [water, setWater] = useState(entry.water.toString());
  const [sleep, setSleep] = useState(entry.sleepHours.toString());
  const [weight, setWeight] = useState(entry.weight?.toString() || "");
  const [mood, setMood] = useState(entry.mood.toString());

  const submit = async () => {
    const res = await fetch("/api/health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        water: Number(water),
        sleepHours: Number(sleep),
        weight: weight ? Number(weight) : undefined,
        mood: Number(mood),
      }),
    });
    if (res.ok) { toast.success("Updated"); setEditing(false); onRefresh(); }
    else toast.error("Failed");
  };

  if (editing) {
    return (
      <div className="flex flex-wrap gap-2 items-end p-2 rounded-lg surface-inset">
        <FormInput label="Water (L)" type="number" value={water} onChange={(e) => setWater(e.target.value)} className="w-20" step="0.1" />
        <FormInput label="Sleep (h)" type="number" value={sleep} onChange={(e) => setSleep(e.target.value)} className="w-20" step="0.5" />
        <FormInput label="Weight" type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-20" />
        <FormInput label="Mood (1-5)" type="number" value={mood} onChange={(e) => setMood(e.target.value)} className="w-20" min="1" max="5" />
        <div className="flex gap-1">
          <Button size="sm" onClick={submit}><Check size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X size={14} /></Button>
        </div>
      </div>
    );
  }

  const moodEmojis = ["", "😞", "😕", "😐", "🙂", "😊"];

  return (
    <div className="flex items-center justify-between text-sm group">
      <div className="flex flex-wrap gap-3 text-xs">
        <span>💧 {entry.water}L</span>
        <span>😴 {entry.sleepHours}h</span>
        {entry.weight && <span>⚖️ {entry.weight}kg</span>}
        <span>{moodEmojis[entry.mood] || "😐"}</span>
      </div>
      <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-[var(--surface-1)] opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Edit">
        <Pencil size={12} />
      </button>
    </div>
  );
}

// ---------- Journal Section ----------

function JournalSection({ entry, date, onRefresh }: {
  entry: JournalData; date: string; onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(entry.content);
  const [mood, setMood] = useState(entry.mood.toString());

  const submit = async () => {
    const res = await fetch(`/api/journal/${entry._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, mood: Number(mood) }),
    });
    if (res.ok) { toast.success("Updated"); setEditing(false); onRefresh(); }
    else toast.error("Failed");
  };

  if (editing) {
    return (
      <div className="space-y-2 p-2 rounded-lg surface-inset">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="w-full bg-transparent text-sm resize-none outline-none"
          style={{ color: "var(--text-primary)" }}
        />
        <div className="flex items-center gap-2">
          <FormInput label="Mood (1-5)" type="number" value={mood} onChange={(e) => setMood(e.target.value)} className="w-24" min="1" max="5" />
          <Button size="sm" onClick={submit}><Check size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X size={14} /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm group">
      <div className="flex items-start justify-between">
        <p className="text-xs text-[var(--text-muted)] line-clamp-2">{entry.content}</p>
        <button onClick={() => setEditing(true)} className="p-1 rounded hover:bg-[var(--surface-1)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" aria-label="Edit">
          <Pencil size={12} />
        </button>
      </div>
    </div>
  );
}

// ---------- Finances Section ----------

function FinancesSection({ data, date, currency, onRefresh }: {
  data: { expenses: ExpenseEntry[]; routes: RouteEntry[] }; date: string; currency: string; onRefresh: () => void;
}) {
  return (
    <div className="space-y-2">
      {data.expenses.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">Expenses</p>
          {data.expenses.map((e) => (
            <div key={e._id} className="flex items-center justify-between text-sm group">
              <span>{e.description} — ${e.amount.toFixed(2)}</span>
              <button onClick={async () => { await fetch(`/api/expenses/${e._id}`, { method: "DELETE" }); toast.success("Deleted"); onRefresh(); }}
                className="p-1 rounded hover:bg-[var(--surface-1)] text-destructive opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete expense">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      {data.routes.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">Routes</p>
          {data.routes.map((r) => (
            <div key={r._id} className="flex items-center justify-between text-sm group">
              <span><Car size={12} className="inline mr-1" />{r.origin} → {r.destination} · {r.distanceKm}km</span>
              <button onClick={async () => { await fetch(`/api/routes/${r._id}`, { method: "DELETE" }); toast.success("Deleted"); onRefresh(); }}
                className="p-1 rounded hover:bg-[var(--surface-1)] text-destructive opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Delete route">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Mealprep Section (read-only) ----------

function MealprepSection({ entry }: { entry: MealPlanEntry }) {
  return (
    <div className="flex flex-wrap gap-2">
      {entry.meals.map((m, i) => (
        <div key={i} className="px-2 py-1 rounded-md text-xs surface-inset">
          <span className="font-medium capitalize">{m.type}:</span> {m.name}
        </div>
      ))}
    </div>
  );
}

// ---------- Custom Section ----------

function CustomSectionRenderer({ data, date, onRefresh }: {
  data: CustomSectionData; date: string; onRefresh: () => void;
}) {
  const { template, entries } = data;

  if (template.layoutHtml) {
    const summaryData: Record<string, unknown> = {};
    // Aggregate number fields across entries for summary
    for (const field of template.fields) {
      if (field.type === "number") {
        summaryData[field.key] = entries.reduce(
          (sum, e) => sum + (Number(e.data[field.key]) || 0), 0
        );
      } else if (entries.length > 0) {
        summaryData[field.key] = entries[entries.length - 1].data[field.key];
      }
    }

    return (
      <RenderedLayout
        layoutHtml={template.layoutHtml}
        data={summaryData}
        fields={template.fields}
        entries={entries.map((e) => e.data)}
      />
    );
  }

  // Fallback: generic field display (existing code)
  const displayFields = template.fields.filter((f) => f.type !== "boolean");
  const booleanFields = template.fields.filter((f) => f.type === "boolean");

  const formatValue = (field: CustomField, value: unknown): string => {
    if (value === undefined || value === null) return "—";
    if (field.type === "boolean") return value ? "Yes" : "No";
    return String(value);
  };

  return (
    <div className="space-y-1.5">
      {entries.map((entry) => (
        <div key={entry._id} className="flex items-center justify-between text-sm group">
          <div className="flex flex-wrap gap-2 items-center">
            {displayFields.map((f) => (
              <span key={f.key}>
                <span className="text-[var(--text-muted)] text-xs">{f.label}:</span>{" "}
                <span className="font-medium">{formatValue(f, entry.data[f.key])}</span>
              </span>
            ))}
            {booleanFields.map((f) =>
              entry.data[f.key] ? (
                <span key={f.key} className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ background: "var(--accent-glow)", color: "var(--accent-color)" }}>
                  {f.label}
                </span>
              ) : null
            )}
          </div>
          <button
            onClick={async () => {
              await fetch(`/api/sections/${template.slug}/entries/${entry._id}`, { method: "DELETE" });
              toast.success("Deleted");
              onRefresh();
            }}
            className="p-1 rounded hover:bg-[var(--surface-1)] text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Delete entry"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

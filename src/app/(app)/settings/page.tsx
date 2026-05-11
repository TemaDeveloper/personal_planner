"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { useTheme } from "@/components/providers/theme-provider";
import { useSections } from "@/components/providers/sections-provider";
import {
  THEMES, FONTS, FONT_META, LAYOUTS, CURRENCIES, THEME_COLORS,
  WEEK_STARTS, DATE_FORMATS, TIME_FORMATS,
  SECTIONS, SECTION_META, type SectionId, type FontStyle,
} from "@/lib/constants";
import { Plus, Trash2, Save } from "lucide-react";
import { ICON_MAP } from "@/lib/icon-map";

interface Subject {
  name: string;
  color: string;
  active: boolean;
}

interface Job {
  name: string;
  hourlyRate: number;
  weeklyTarget: number;
  active: boolean;
  enableExpenseTracking: boolean;
}

interface Bill {
  name: string;
  amount: number;
  dueDay: number;
  category: string;
  active: boolean;
}

const SUBJECT_COLORS = ["#D4A853", "#00C9A7", "#9B72F0", "#F07070", "#7EC8A0", "#5B9BD5", "#FF8C42"];

export default function SettingsPage() {
  const router = useRouter();
  const { preferences, updatePreferences } = useTheme();
  const { enabledSections, updateSections } = useSections();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("🌟");
  const [accentTheme, setAccentTheme] = useState(preferences.accentTheme);
  const [fontStyle, setFontStyle] = useState(preferences.fontStyle);
  const [layoutDensity, setLayoutDensity] = useState(preferences.layoutDensity);
  const [currency, setCurrency] = useState(preferences.currency);
  const [weekStart, setWeekStart] = useState(preferences.weekStart);
  const [dateFormat, setDateFormat] = useState(preferences.dateFormat);
  const [timeFormat, setTimeFormat] = useState(preferences.timeFormat);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [gasPrice, setGasPrice] = useState("210.2");
  const [carConsumption, setCarConsumption] = useState("9.0");

  const [bills, setBills] = useState<Bill[]>([]);

  const [localSections, setLocalSections] = useState<SectionId[]>([...enabledSections]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name || "");
        setAvatarEmoji(data.avatarEmoji || "🌟");
        setAccentTheme(data.preferences?.accentTheme || "amber");
        setFontStyle(data.preferences?.fontStyle || "sans");
        setLayoutDensity(data.preferences?.layoutDensity || "default");
        setCurrency(data.preferences?.currency || "CAD");
        setWeekStart(data.preferences?.weekStart || "monday");
        setDateFormat(data.preferences?.dateFormat || "MMM d, yyyy");
        setTimeFormat(data.preferences?.timeFormat || "24h");
        setJobs(data.workConfig?.jobs || []);
        setGasPrice(String(data.workConfig?.gasPrice || 210.2));
        setCarConsumption(String(data.workConfig?.carConsumption || 9.0));
        setBills(data.bills || []);
        if (data.enabledSections) setLocalSections(data.enabledSections);
        setSubjects(data.studyConfig?.subjects || []);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);

    const res = await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        avatarEmoji,
        preferences: { accentTheme, fontStyle, layoutDensity, currency, weekStart, dateFormat, timeFormat },
        workConfig: {
          jobs,
          gasPrice: Number(gasPrice),
          carConsumption: Number(carConsumption),
        },
        bills,
        enabledSections: localSections,
        studyConfig: { subjects },
      }),
    });

    if (res.ok) {
      updatePreferences({ accentTheme, fontStyle, layoutDensity, currency, weekStart, dateFormat, timeFormat });
      updateSections(localSections);
      toast.success("Settings saved");
      router.refresh();
    } else {
      toast.error("Failed to save");
    }
    setSaving(false);
  };

  const addJob = () => {
    setJobs([
      ...jobs,
      { name: "", hourlyRate: 0, weeklyTarget: 20, active: true, enableExpenseTracking: false },
    ]);
  };

  const addBill = () => {
    setBills([
      ...bills,
      { name: "", amount: 0, dueDay: 1, category: "other", active: true },
    ]);
  };

  const toggleSection = (id: SectionId) => {
    setLocalSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const addSubject = () => {
    setSubjects([
      ...subjects,
      { name: "", color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length], active: true },
    ]);
  };

  if (loading) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Settings" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="planner-surface p-6 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up pb-24 sm:pb-0">
      <PageHeader
        title="Settings"
        description="Personalize your planner"
        action={
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save"}
          </button>
        }
      />

      <div className="space-y-6">
        {/* Profile */}
        <Section title="Profile">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="settings-input"
              />
            </Field>
            <Field label="Avatar">
              <input
                type="text"
                value={avatarEmoji}
                onChange={(e) => setAvatarEmoji(e.target.value)}
                className="settings-input text-center text-xl"
                maxLength={2}
              />
            </Field>
          </div>
        </Section>

        {/* Sections */}
        <Section title="Sections">
          <p className="text-xs text-muted-foreground -mt-2 mb-3">
            Choose which sections appear in your navigation.
          </p>
          <div className="space-y-2">
            {SECTIONS.map((id) => {
              const meta = SECTION_META[id];
              const Icon = ICON_MAP[meta.icon];
              const enabled = localSections.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleSection(id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all"
                  style={{
                    background: enabled ? "var(--accent-glow)" : "var(--surface-2)",
                    border: `1px solid ${enabled ? "var(--accent-color)" : "var(--border-subtle)"}`,
                  }}
                >
                  {Icon && (
                    <Icon
                      size={18}
                      style={{ color: enabled ? "var(--accent-color)" : "var(--text-muted)" }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium"
                      style={{ color: enabled ? "var(--text-primary)" : "var(--text-muted)" }}
                    >
                      {meta.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </div>
                  <div
                    className="w-10 h-6 rounded-full transition-all flex items-center px-0.5"
                    style={{
                      background: enabled ? "var(--accent-color)" : "var(--surface-1)",
                      border: enabled ? "none" : "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      className="w-5 h-5 rounded-full transition-all"
                      style={{
                        background: enabled ? "white" : "var(--text-muted)",
                        transform: enabled ? "translateX(16px)" : "translateX(0)",
                        opacity: enabled ? 1 : 0.5,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Subjects (only when study enabled) */}
        {localSections.includes("study") && (
          <Section title="Subjects">
            <p className="text-xs text-muted-foreground -mt-2 mb-3">
              Add the subjects you study. Used in the Study section for logging time, homework, and grades.
            </p>
            <div className="space-y-3">
              {subjects.map((subj, idx) => (
                <div key={idx} className="planner-surface-2 p-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={subj.color}
                      onChange={(e) => {
                        const updated = [...subjects];
                        updated[idx].color = e.target.value;
                        setSubjects(updated);
                      }}
                      className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                      style={{ background: "transparent" }}
                    />
                    <input
                      type="text"
                      placeholder="Subject name"
                      value={subj.name}
                      onChange={(e) => {
                        const updated = [...subjects];
                        updated[idx].name = e.target.value;
                        setSubjects(updated);
                      }}
                      className="settings-input flex-1"
                    />
                    <button
                      onClick={() => setSubjects(subjects.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={addSubject}
                className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
                style={{
                  background: "var(--surface-2)",
                  border: "1px dashed var(--border-subtle)",
                  color: "var(--text-muted)",
                }}
              >
                <Plus size={14} />
                Add subject
              </button>
            </div>
          </Section>
        )}

        {/* Appearance */}
        <Section title="Appearance">
          <Field label="Accent color">
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t}
                  onClick={() => setAccentTheme(t)}
                  className="w-10 h-10 rounded-lg transition-all hover:scale-110"
                  style={{
                    background: THEME_COLORS[t],
                    opacity: accentTheme === t ? 1 : 0.4,
                    boxShadow:
                      accentTheme === t
                        ? `0 0 0 2px var(--background), 0 0 0 4px ${THEME_COLORS[t]}`
                        : "none",
                  }}
                />
              ))}
            </div>
          </Field>

          <Field label="Font">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {FONTS.map((f) => {
                const meta = FONT_META[f as FontStyle];
                return (
                  <button
                    key={f}
                    onClick={() => {
                      setFontStyle(f);
                      document.documentElement.setAttribute("data-font", f);
                    }}
                    className="p-3 rounded-lg text-left transition-all"
                    style={{
                      background: fontStyle === f ? "var(--accent-glow)" : "var(--surface-2)",
                      border: `1px solid ${fontStyle === f ? "var(--accent-color)" : "var(--border-subtle)"}`,
                    }}
                  >
                    <p
                      className="text-lg font-semibold mb-0.5"
                      style={{
                        fontFamily: f === "sans" ? "'DM Sans', sans-serif"
                          : f === "inter" ? "'Inter', sans-serif"
                          : f === "geometric" ? "'Space Grotesk', sans-serif"
                          : f === "serif" ? "'Playfair Display', serif"
                          : "'JetBrains Mono', monospace",
                        color: fontStyle === f ? "var(--text-primary)" : "var(--text-muted)",
                      }}
                    >
                      {meta.preview}
                    </p>
                    <p className="text-xs font-medium" style={{ color: fontStyle === f ? "var(--accent-color)" : "var(--text-primary)" }}>
                      {meta.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{meta.description}</p>
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Density">
              <div className="flex gap-2">
                {LAYOUTS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLayoutDensity(l)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: layoutDensity === l ? "var(--accent-glow)" : "var(--surface-2)",
                      border: `1px solid ${layoutDensity === l ? "var(--accent-color)" : "var(--border-subtle)"}`,
                      color: layoutDensity === l ? "var(--accent-color)" : "var(--text-muted)",
                    }}
                  >
                    {l.charAt(0).toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Currency">
              <div className="flex flex-wrap gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: currency === c ? "var(--accent-glow)" : "var(--surface-2)",
                      border: `1px solid ${currency === c ? "var(--accent-color)" : "var(--border-subtle)"}`,
                      color: currency === c ? "var(--accent-color)" : "var(--text-muted)",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Section>

        {/* Regional */}
        <Section title="Regional">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Week starts on">
              <div className="flex gap-2">
                {WEEK_STARTS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setWeekStart(w)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: weekStart === w ? "var(--accent-glow)" : "var(--surface-2)",
                      border: `1px solid ${weekStart === w ? "var(--accent-color)" : "var(--border-subtle)"}`,
                      color: weekStart === w ? "var(--accent-color)" : "var(--text-muted)",
                    }}
                  >
                    {w.charAt(0).toUpperCase() + w.slice(1)}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Date format">
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="settings-input"
              >
                {DATE_FORMATS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </Field>

            <Field label="Time format">
              <div className="flex gap-2">
                {TIME_FORMATS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeFormat(t)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: timeFormat === t ? "var(--accent-glow)" : "var(--surface-2)",
                      border: `1px solid ${timeFormat === t ? "var(--accent-color)" : "var(--border-subtle)"}`,
                      color: timeFormat === t ? "var(--accent-color)" : "var(--text-muted)",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </Section>

        {/* Jobs */}
        <Section title="Jobs">
          <div className="space-y-3">
            {jobs.map((job, idx) => (
              <div key={idx} className="planner-surface-2 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Job name"
                    value={job.name}
                    onChange={(e) => {
                      const updated = [...jobs];
                      updated[idx].name = e.target.value;
                      setJobs(updated);
                    }}
                    className="settings-input flex-1"
                  />
                  <button
                    onClick={() => setJobs(jobs.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Hourly rate ($)">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={job.hourlyRate}
                      onChange={(e) => {
                        const updated = [...jobs];
                        updated[idx].hourlyRate = Number(e.target.value);
                        setJobs(updated);
                      }}
                      className="settings-input"
                    />
                  </Field>
                  <Field label="Weekly target (h)">
                    <input
                      type="number"
                      min="0"
                      value={job.weeklyTarget}
                      onChange={(e) => {
                        const updated = [...jobs];
                        updated[idx].weeklyTarget = Number(e.target.value);
                        setJobs(updated);
                      }}
                      className="settings-input"
                    />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={job.enableExpenseTracking}
                    onChange={(e) => {
                      const updated = [...jobs];
                      updated[idx].enableExpenseTracking = e.target.checked;
                      setJobs(updated);
                    }}
                    className="accent-primary"
                  />
                  <span className="text-muted-foreground">
                    Enable expense & km tracking
                  </span>
                </label>
              </div>
            ))}
            <button
              onClick={addJob}
              className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--surface-2)",
                border: "1px dashed var(--border-subtle)",
                color: "var(--text-muted)",
              }}
            >
              <Plus size={14} />
              Add job
            </button>
          </div>
        </Section>

        {/* Gas configuration */}
        <Section title="Gas / KM">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Gas price (cents/L)">
              <input
                type="number"
                step="0.1"
                value={gasPrice}
                onChange={(e) => setGasPrice(e.target.value)}
                className="settings-input"
              />
            </Field>
            <Field label="Consumption (L/100km)">
              <input
                type="number"
                step="0.1"
                value={carConsumption}
                onChange={(e) => setCarConsumption(e.target.value)}
                className="settings-input"
              />
            </Field>
          </div>
        </Section>

        {/* Bills */}
        <Section title="Monthly Bills">
          <div className="space-y-3">
            {bills.map((bill, idx) => (
              <div key={idx} className="planner-surface-2 p-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <Field label="Name">
                      <input
                        type="text"
                        placeholder="e.g. Rent"
                        value={bill.name}
                        onChange={(e) => {
                          const updated = [...bills];
                          updated[idx].name = e.target.value;
                          setBills(updated);
                        }}
                        className="settings-input"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-3">
                    <Field label="Amount">
                      <input
                        type="number"
                        step="0.01"
                        value={bill.amount}
                        onChange={(e) => {
                          const updated = [...bills];
                          updated[idx].amount = Number(e.target.value);
                          setBills(updated);
                        }}
                        className="settings-input"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-3">
                    <Field label="Due day">
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={bill.dueDay}
                        onChange={(e) => {
                          const updated = [...bills];
                          updated[idx].dueDay = Number(e.target.value);
                          setBills(updated);
                        }}
                        className="settings-input"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-1 flex justify-end pb-1">
                    <button
                      onClick={() => setBills(bills.filter((_, i) => i !== idx))}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addBill}
              className="w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--surface-2)",
                border: "1px dashed var(--border-subtle)",
                color: "var(--text-muted)",
              }}
            >
              <Plus size={14} />
              Add bill
            </button>
          </div>
        </Section>
      </div>

      {/* Sticky mobile save button */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 z-40" style={{ background: "var(--background)", borderTop: "1px solid var(--border-subtle)" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <style>{`
        .settings-input {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border-radius: var(--radius);
          font-size: 0.875rem;
          background: var(--surface-2);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          transition: all 0.2s;
        }
        .settings-input:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(var(--ring), 0.3);
          border-color: var(--accent-color);
        }
      `}</style>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="planner-surface p-6">
      <h2 className="text-sm font-semibold mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

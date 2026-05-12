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
  type ColorMode,
} from "@/lib/constants";
import { Plus, Trash2, Save, Sparkles, Sun, Monitor, Moon } from "lucide-react";
import { ICON_MAP } from "@/lib/icon-map";
import { AI_PROVIDERS, type AIProvider } from "@/lib/ai";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";

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

const COLOR_MODE_SEGMENTS = [
  { value: "light" as ColorMode, label: "Light", icon: Sun },
  { value: "system" as ColorMode, label: "System", icon: Monitor },
  { value: "dark" as ColorMode, label: "Dark", icon: Moon },
];

export default function SettingsPage() {
  const router = useRouter();
  const { preferences, updatePreferences } = useTheme();
  const { enabledSections, updateSections } = useSections();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("\u{1F31F}");
  const [accentTheme, setAccentTheme] = useState(preferences.accentTheme);
  const [fontStyle, setFontStyle] = useState(preferences.fontStyle);
  const [layoutDensity, setLayoutDensity] = useState(preferences.layoutDensity);
  const [currency, setCurrency] = useState(preferences.currency);
  const [weekStart, setWeekStart] = useState(preferences.weekStart);
  const [dateFormat, setDateFormat] = useState(preferences.dateFormat);
  const [timeFormat, setTimeFormat] = useState(preferences.timeFormat);
  const [colorMode, setColorMode] = useState<ColorMode>(preferences.colorMode);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [gasPrice, setGasPrice] = useState("210.2");
  const [carConsumption, setCarConsumption] = useState("9.0");

  const [bills, setBills] = useState<Bill[]>([]);

  const [localSections, setLocalSections] = useState<SectionId[]>([...enabledSections]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(5);
  const [aiProviderSetting, setAiProviderSetting] = useState<AIProvider | "">("");
  const [hasAiKey, setHasAiKey] = useState(false);
  const [newAiKey, setNewAiKey] = useState("");

  useEffect(() => {
    fetch("/api/user/preferences")
      .then((r) => r.json())
      .then((data) => {
        setName(data.name || "");
        setAvatarEmoji(data.avatarEmoji || "\u{1F31F}");
        setAccentTheme(data.preferences?.accentTheme || "amber");
        setFontStyle(data.preferences?.fontStyle || "sans");
        setLayoutDensity(data.preferences?.layoutDensity || "default");
        setCurrency(data.preferences?.currency || "CAD");
        setWeekStart(data.preferences?.weekStart || "monday");
        setDateFormat(data.preferences?.dateFormat || "MMM d, yyyy");
        setTimeFormat(data.preferences?.timeFormat || "24h");
        setColorMode(data.preferences?.colorMode || "system");
        setJobs(data.workConfig?.jobs || []);
        setGasPrice(String(data.workConfig?.gasPrice || 210.2));
        setCarConsumption(String(data.workConfig?.carConsumption || 9.0));
        setBills(data.bills || []);
        if (data.enabledSections) setLocalSections(data.enabledSections);
        setSubjects(data.studyConfig?.subjects || []);
        setTargetDaysPerWeek(data.gymConfig?.targetDaysPerWeek ?? 5);
        setAiProviderSetting(data.aiProvider || "");
        setHasAiKey(data.hasAiKey || false);
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
        preferences: { accentTheme, fontStyle, layoutDensity, currency, weekStart, dateFormat, timeFormat, colorMode },
        workConfig: {
          jobs,
          gasPrice: Number(gasPrice),
          carConsumption: Number(carConsumption),
        },
        bills,
        enabledSections: localSections,
        studyConfig: { subjects },
        gymConfig: { targetDaysPerWeek },
        ...(newAiKey ? { aiConfig: { provider: aiProviderSetting || "claude", apiKey: newAiKey } } : {}),
      }),
    });

    if (res.ok) {
      updatePreferences({ accentTheme, fontStyle, layoutDensity, currency, weekStart, dateFormat, timeFormat, colorMode });
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
            <Skeleton key={i} className="h-32" />
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
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="primary"
            size="md"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save"}
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Profile */}
        <Section title="Profile">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <FormInput
              label="Avatar"
              type="text"
              value={avatarEmoji}
              onChange={(e) => setAvatarEmoji(e.target.value)}
              className="text-center text-xl"
              maxLength={2}
            />
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
                <Card
                  key={id}
                  variant={enabled ? "default" : "inset"}
                  padding="none"
                  interactive
                  onClick={() => toggleSection(id)}
                  className={`flex items-center gap-3 p-3 transition-all ${
                    enabled ? "border border-[var(--accent-color)]" : ""
                  }`}
                  style={{
                    background: enabled ? "var(--accent-glow)" : undefined,
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
                  <ToggleSwitch
                    checked={enabled}
                    onChange={() => toggleSection(id)}
                    size="sm"
                  />
                </Card>
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
                <Card key={idx} variant="inset" padding="md">
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
                    <FormInput
                      type="text"
                      placeholder="Subject name"
                      value={subj.name}
                      onChange={(e) => {
                        const updated = [...subjects];
                        updated[idx].name = e.target.value;
                        setSubjects(updated);
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSubjects(subjects.filter((_, i) => i !== idx))}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </Card>
              ))}
              <Button
                variant="outline"
                onClick={addSubject}
                className="w-full border-dashed"
              >
                <Plus size={14} />
                Add subject
              </Button>
            </div>
          </Section>
        )}

        {/* Gym */}
        {localSections.includes("gym") && (
          <Section title="Gym">
            <Field label="Target days per week">
              <SegmentedControl
                segments={[1, 2, 3, 4, 5, 6, 7].map((n) => ({
                  value: String(n),
                  label: String(n),
                }))}
                value={String(targetDaysPerWeek)}
                onChange={(v) => setTargetDaysPerWeek(Number(v))}
                layoutId="gym-days"
                className="w-full"
              />
            </Field>
          </Section>
        )}

        {/* Appearance */}
        <Section title="Appearance">
          <Field label="Color mode">
            <SegmentedControl
              segments={COLOR_MODE_SEGMENTS}
              value={colorMode}
              onChange={(v) => {
                setColorMode(v);
                updatePreferences({ colorMode: v });
              }}
              layoutId="color-mode"
            />
          </Field>

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
                  <Card
                    key={f}
                    variant="inset"
                    padding="sm"
                    interactive
                    onClick={() => {
                      setFontStyle(f);
                      document.documentElement.setAttribute("data-font", f);
                    }}
                    className={`text-left transition-all ${
                      fontStyle === f
                        ? "border border-[var(--accent-color)]"
                        : ""
                    }`}
                    style={{
                      background: fontStyle === f ? "var(--accent-glow)" : undefined,
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
                  </Card>
                );
              })}
            </div>
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Density">
              <SegmentedControl
                segments={LAYOUTS.map((l) => ({
                  value: l,
                  label: l.charAt(0).toUpperCase() + l.slice(1),
                }))}
                value={layoutDensity}
                onChange={(v) => setLayoutDensity(v)}
                layoutId="layout-density"
                className="w-full"
              />
            </Field>

            <Field label="Currency">
              <SegmentedControl
                segments={CURRENCIES.map((c) => ({
                  value: c,
                  label: c,
                }))}
                value={currency}
                onChange={(v) => setCurrency(v)}
                layoutId="currency"
                className="w-full"
              />
            </Field>
          </div>
        </Section>

        {/* Regional */}
        <Section title="Regional">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Week starts on">
              <SegmentedControl
                segments={WEEK_STARTS.map((w) => ({
                  value: w,
                  label: w.charAt(0).toUpperCase() + w.slice(1),
                }))}
                value={weekStart}
                onChange={(v) => setWeekStart(v)}
                layoutId="week-start"
                className="w-full"
              />
            </Field>

            <FormSelect
              label="Date format"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
            >
              {DATE_FORMATS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </FormSelect>

            <Field label="Time format">
              <SegmentedControl
                segments={TIME_FORMATS.map((t) => ({
                  value: t,
                  label: t,
                }))}
                value={timeFormat}
                onChange={(v) => setTimeFormat(v)}
                layoutId="time-format"
                className="w-full"
              />
            </Field>
          </div>
        </Section>

        {/* Jobs */}
        <Section title="Jobs">
          <div className="space-y-3">
            {jobs.map((job, idx) => (
              <Card key={idx} variant="inset" padding="md" className="space-y-3">
                <div className="flex items-center gap-3">
                  <FormInput
                    type="text"
                    placeholder="Job name"
                    value={job.name}
                    onChange={(e) => {
                      const updated = [...jobs];
                      updated[idx].name = e.target.value;
                      setJobs(updated);
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setJobs(jobs.filter((_, i) => i !== idx))}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    label="Hourly rate ($)"
                    type="number"
                    step="0.5"
                    min="0"
                    value={job.hourlyRate}
                    onChange={(e) => {
                      const updated = [...jobs];
                      updated[idx].hourlyRate = Number(e.target.value);
                      setJobs(updated);
                    }}
                  />
                  <FormInput
                    label="Weekly target (h)"
                    type="number"
                    min="0"
                    value={job.weeklyTarget}
                    onChange={(e) => {
                      const updated = [...jobs];
                      updated[idx].weeklyTarget = Number(e.target.value);
                      setJobs(updated);
                    }}
                  />
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
              </Card>
            ))}
            <Button
              variant="outline"
              onClick={addJob}
              className="w-full border-dashed"
            >
              <Plus size={14} />
              Add job
            </Button>
          </div>
        </Section>

        {/* Gas configuration */}
        <Section title="Gas / KM">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Gas price (cents/L)"
              type="number"
              step="0.1"
              value={gasPrice}
              onChange={(e) => setGasPrice(e.target.value)}
            />
            <FormInput
              label="Consumption (L/100km)"
              type="number"
              step="0.1"
              value={carConsumption}
              onChange={(e) => setCarConsumption(e.target.value)}
            />
          </div>
        </Section>

        {/* Bills */}
        <Section title="Monthly Bills">
          <div className="space-y-3">
            {bills.map((bill, idx) => (
              <Card key={idx} variant="inset" padding="md">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <FormInput
                      label="Name"
                      type="text"
                      placeholder="e.g. Rent"
                      value={bill.name}
                      onChange={(e) => {
                        const updated = [...bills];
                        updated[idx].name = e.target.value;
                        setBills(updated);
                      }}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <FormInput
                      label="Amount"
                      type="number"
                      step="0.01"
                      value={bill.amount}
                      onChange={(e) => {
                        const updated = [...bills];
                        updated[idx].amount = Number(e.target.value);
                        setBills(updated);
                      }}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <FormInput
                      label="Due day"
                      type="number"
                      min="1"
                      max="31"
                      value={bill.dueDay}
                      onChange={(e) => {
                        const updated = [...bills];
                        updated[idx].dueDay = Number(e.target.value);
                        setBills(updated);
                      }}
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end pb-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setBills(bills.filter((_, i) => i !== idx))}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            <Button
              variant="outline"
              onClick={addBill}
              className="w-full border-dashed"
            >
              <Plus size={14} />
              Add bill
            </Button>
          </div>
        </Section>

        {/* AI */}
        <Section title="AI">
          <div className="flex items-center gap-2 -mt-2 mb-3">
            <Sparkles size={14} style={{ color: "var(--accent-color)" }} />
            <p className="text-xs text-muted-foreground">
              Used for AI-powered features like smart onboarding.
            </p>
          </div>
          <Field label="Provider">
            <SegmentedControl
              segments={AI_PROVIDERS.map((p) => ({
                value: p.id,
                label: p.label,
              }))}
              value={(aiProviderSetting || "claude") as string}
              onChange={(v) => setAiProviderSetting(v as AIProvider)}
              layoutId="ai-provider"
              className="w-full"
            />
          </Field>
          <FormInput
            label="API Key"
            type="password"
            placeholder={hasAiKey ? "Key saved \u2014 enter new to replace" : AI_PROVIDERS.find((p) => p.id === (aiProviderSetting || "claude"))?.placeholder}
            value={newAiKey}
            onChange={(e) => setNewAiKey(e.target.value)}
          />
          {hasAiKey && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await fetch("/api/user/preferences", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ aiConfig: { apiKey: null } }),
                });
                setHasAiKey(false);
                setAiProviderSetting("");
                toast.success("API key removed");
              }}
              className="text-destructive"
            >
              Remove API key
            </Button>
          )}
        </Section>
      </div>

      {/* Sticky mobile save button */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 z-40 bg-[var(--background)] border-t border-[var(--border-subtle)]">
        <Button
          onClick={handleSave}
          disabled={saving}
          variant="primary"
          className="w-full"
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
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
    <Card variant="default" padding="lg">
      <h2 className="text-sm font-semibold mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </Card>
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
      <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

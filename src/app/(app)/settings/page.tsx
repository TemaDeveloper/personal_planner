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
import { Plus, Trash2, Save, Sparkles, Sun, Monitor, Moon, Pencil, Download, Share2 } from "lucide-react";
import { ICON_MAP } from "@/lib/icon-map";
import { LayoutEditor } from "@/components/sections/layout-editor";
import { AI_PROVIDERS, type AIProvider } from "@/lib/ai-providers";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { ExportModal } from "@/components/data/export-modal";
import { ShareModal, type ShareEntry } from "@/components/data/share-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  const { enabledSections, customSections, updateSections, updateCustomSections } = useSections();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

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
  const [editingLayout, setEditingLayout] = useState<{
    slug: string;
    fields: { key: string; label: string; type: string }[];
    layoutHtml: string;
  } | null>(null);

  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null);
  const [deletingSection, setDeletingSection] = useState(false);

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

  useEffect(() => {
    fetch("/api/shares").then((r) => r.json()).then((d) => setShares(d.shares || []));
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

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
      setIsDirty(false);
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
    setIsDirty(true);
  };

  const addBill = () => {
    setBills([
      ...bills,
      { name: "", amount: 0, dueDay: 1, category: "other", active: true },
    ]);
    setIsDirty(true);
  };

  const toggleSection = (id: SectionId) => {
    setLocalSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    setIsDirty(true);
  };

  const addSubject = () => {
    setSubjects([
      ...subjects,
      { name: "", color: SUBJECT_COLORS[subjects.length % SUBJECT_COLORS.length], active: true },
    ]);
    setIsDirty(true);
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
              onChange={(e) => { setName(e.target.value); setIsDirty(true); }}
            />
            <FormInput
              label="Avatar"
              type="text"
              value={avatarEmoji}
              onChange={(e) => { setAvatarEmoji(e.target.value); setIsDirty(true); }}
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

            {/* Custom (AI-generated) sections */}
            {customSections.map((cs) => {
              const Icon = ICON_MAP[cs.icon] || ICON_MAP.Star;
              return (
                <Card
                  key={cs.slug}
                  variant={cs.enabled ? "default" : "inset"}
                  padding="none"
                  className={`flex items-center gap-3 p-3 transition-all ${
                    cs.enabled ? "border border-[var(--accent-color)]" : ""
                  }`}
                  style={{
                    background: cs.enabled ? "var(--accent-glow)" : undefined,
                  }}
                >
                  {Icon && (
                    <Icon
                      size={18}
                      style={{ color: cs.enabled ? "var(--accent-color)" : "var(--text-muted)" }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium"
                      style={{ color: cs.enabled ? "var(--text-primary)" : "var(--text-muted)" }}
                    >
                      {cs.name}
                    </p>
                    <p className="text-xs text-muted-foreground">Custom section</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetch(`/api/sections/templates/${cs.slug}`)
                        .then((r) => r.json())
                        .then((d) => {
                          setEditingLayout({
                            slug: cs.slug,
                            fields: d.template?.fields || [],
                            layoutHtml: d.template?.layoutHtml || "",
                          });
                        });
                    }}
                  >
                    <Pencil size={14} />
                    Edit Layout
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteSlug(cs.slug);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
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
                        setIsDirty(true);
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
                        setIsDirty(true);
                      }}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete subject"
                      onClick={() => { setSubjects(subjects.filter((_, i) => i !== idx)); setIsDirty(true); }}
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
                onChange={(v) => { setTargetDaysPerWeek(Number(v)); setIsDirty(true); }}
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
                setIsDirty(true);
              }}
              layoutId="color-mode"
            />
          </Field>

          <Field label="Accent color">
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t}
                  onClick={() => { setAccentTheme(t); setIsDirty(true); }}
                  className="w-10 h-10 rounded-lg transition-all hover:scale-110"
                  style={{
                    background: THEME_COLORS[t],
                    opacity: accentTheme === t ? 1 : 0.4,
                    boxShadow:
                      accentTheme === t
                        ? `0 0 0 2px var(--background), 0 0 0 4px ${THEME_COLORS[t]}`
                        : "none",
                  }}
                  aria-label={`Choose ${t} accent color`}
                  aria-pressed={accentTheme === t}
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
                      setIsDirty(true);
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
                onChange={(v) => { setLayoutDensity(v); setIsDirty(true); }}
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
                onChange={(v) => { setCurrency(v); setIsDirty(true); }}
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
                onChange={(v) => { setWeekStart(v); setIsDirty(true); }}
                layoutId="week-start"
                className="w-full"
              />
            </Field>

            <FormSelect
              label="Date format"
              value={dateFormat}
              onChange={(e) => { setDateFormat(e.target.value); setIsDirty(true); }}
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
                onChange={(v) => { setTimeFormat(v); setIsDirty(true); }}
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
                      setIsDirty(true);
                    }}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete job"
                    onClick={() => { setJobs(jobs.filter((_, i) => i !== idx)); setIsDirty(true); }}
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
                      setIsDirty(true);
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
                      setIsDirty(true);
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
                      setIsDirty(true);
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
              onChange={(e) => { setGasPrice(e.target.value); setIsDirty(true); }}
            />
            <FormInput
              label="Consumption (L/100km)"
              type="number"
              step="0.1"
              value={carConsumption}
              onChange={(e) => { setCarConsumption(e.target.value); setIsDirty(true); }}
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
                        setIsDirty(true);
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
                        setIsDirty(true);
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
                        setIsDirty(true);
                      }}
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end pb-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete bill"
                      onClick={() => { setBills(bills.filter((_, i) => i !== idx)); setIsDirty(true); }}
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
            <Sparkles size={14} className="text-[var(--accent-color)]" />
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
              onChange={(v) => { setAiProviderSetting(v as AIProvider); setIsDirty(true); }}
              layoutId="ai-provider"
              className="w-full"
            />
          </Field>
          <FormInput
            label="API Key"
            type="password"
            placeholder={hasAiKey ? "Key saved \u2014 enter new to replace" : AI_PROVIDERS.find((p) => p.id === (aiProviderSetting || "claude"))?.placeholder}
            value={newAiKey}
            onChange={(e) => { setNewAiKey(e.target.value); setIsDirty(true); }}
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

        {/* Data */}
        <Section title="Data">
          <p className="text-xs -mt-2 mb-3" style={{ color: "var(--text-muted)" }}>
            Export your data or share a section with someone else.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setExportModalOpen(true)}>
              <Download size={14} />
              Export to Excel
            </Button>
            <Button variant="outline" onClick={() => setShareModalOpen(true)}>
              <Share2 size={14} />
              Sharing &amp; access
              {shares.filter((s) => !s.revokedAt).length > 0 && (
                <span
                  className="num ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium leading-none"
                  style={{
                    background: "var(--surface-1)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  {shares.filter((s) => !s.revokedAt).length}
                </span>
              )}
            </Button>
          </div>
        </Section>

        <ExportModal
          open={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          enabledSections={localSections}
        />

        <ShareModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          enabledSections={localSections}
          customSections={customSections}
          jobs={jobs}
          shares={shares}
          onSharesChange={setShares}
        />
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

      {/* Layout editor modal for custom sections */}
      {editingLayout && (
        <LayoutEditor
          slug={editingLayout.slug}
          fields={editingLayout.fields}
          initialHtml={editingLayout.layoutHtml}
          open={!!editingLayout}
          onClose={() => setEditingLayout(null)}
          onSave={() => setEditingLayout(null)}
        />
      )}

      {/* Delete custom section confirm dialog */}
      <ConfirmDialog
        open={!!confirmDeleteSlug}
        onClose={() => setConfirmDeleteSlug(null)}
        title="Delete section?"
        message="This permanently deletes the section and all its entries. This action cannot be undone."
        confirmLabel="Delete"
        loading={deletingSection}
        onConfirm={async () => {
          if (!confirmDeleteSlug) return;
          setDeletingSection(true);
          try {
            const res = await fetch(`/api/sections/templates/${confirmDeleteSlug}`, { method: "DELETE" });
            if (res.ok) {
              toast.success("Section deleted");
              updateCustomSections(customSections.filter((c) => c.slug !== confirmDeleteSlug));
              setConfirmDeleteSlug(null);
              router.refresh();
            } else {
              toast.error("Failed to delete section");
            }
          } catch {
            toast.error("Failed to delete section");
          } finally {
            setDeletingSection(false);
          }
        }}
      />
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

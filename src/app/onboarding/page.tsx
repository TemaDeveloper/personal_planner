"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  LayoutDashboard,
  Plus,
  Trash2,
  Check,
} from "lucide-react";
import {
  THEMES, FONTS, FONT_META, CURRENCIES, THEME_COLORS,
  SECTIONS, SECTION_META, DEFAULT_ENABLED_SECTIONS,
  type SectionId, type FontStyle,
} from "@/lib/constants";
import { ICON_MAP } from "@/lib/icon-map";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput, FormSelect } from "@/components/ui/form-input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { ConversationalOnboarding } from "@/components/onboarding/conversational-onboarding";

interface Job {
  name: string;
  hourlyRate: number;
  weeklyTarget: number;
  active: boolean;
  enableExpenseTracking: boolean;
}

interface Subject { name: string; color: string; active: boolean }
interface Hobby { name: string; color: string; active: boolean }
interface Chore { name: string; frequency: string; active: boolean }
interface Bill { name: string; amount: number; dueDay: number; category: string; active: boolean }

/** Map font key → actual CSS font-family string for preview rendering */
const FONT_FAMILY_MAP: Record<FontStyle, string> = {
  sans:      "'Hanken Grotesk', sans-serif",
  inter:     "'Inter', sans-serif",
  geometric: "'Space Grotesk', sans-serif",
  serif:     "'Playfair Display', serif",
  mono:      "'JetBrains Mono', monospace",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(true);

  // Personalization
  const [name, setName] = useState("");
  const [avatarEmoji] = useState("🌟");
  const [accentTheme, setAccentTheme] = useState("amber");
  const [fontStyle, setFontStyle] = useState("sans");
  const [currency, setCurrency] = useState("CAD");

  // Sections & config — empty when using AI mode, defaults only for manual mode
  const [enabledSections, setEnabledSections] = useState<SectionId[]>([...DEFAULT_ENABLED_SECTIONS]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(5);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [suggestedHabits, setSuggestedHabits] = useState<string[]>([]);
  const [customSectionTemplates, setCustomSectionTemplates] = useState<{
    name: string; icon: string; description: string;
    fields: { key: string; label: string; type: string; options?: string[] }[];
    layoutHtml?: string;
  }[]>([]);

  const toggleSection = (id: SectionId) => {
    setEnabledSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    setLoading(true);

    // Create custom section templates first
    for (const tpl of customSectionTemplates) {
      try {
        await fetch("/api/sections/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(tpl),
        });
      } catch {
        // Continue even if one fails
      }
    }

    const res = await fetch("/api/user/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name || undefined,
        avatarEmoji,
        onboardingDone: true,
        preferences: { accentTheme, fontStyle, layoutDensity: "default", currency },
        enabledSections,
        workConfig: { jobs: jobs.filter((j) => j.name.trim()), gasPrice: 210.2, carConsumption: 9.0 },
        gymConfig: { targetDaysPerWeek },
        studyConfig: { subjects },
        hobbiesConfig: { hobbies },
        houseworkConfig: { chores },
        bills,
      }),
    });

    if (res.ok) {
      document.documentElement.setAttribute("data-theme", accentTheme);
      document.documentElement.setAttribute("data-font", fontStyle);
      toast.success("Welcome to Lifora!");
      router.push("/dashboard");
    } else {
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  // Step definitions
  const steps = [
    // Step 0: Welcome
    {
      title: "Welcome to Lifora",
      content: (
        <div className="space-y-8">
          <p className="text-sm text-center max-w-md mx-auto" style={{ color: "var(--text-muted)" }}>
            Your personal workspace for tracking work, gym, finances, study, and more — designed exactly how you want it.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
            {[
              { icon: LayoutDashboard, label: "Dashboard", desc: "Everything at a glance" },
              ...SECTIONS.map((id) => {
                const meta = SECTION_META[id];
                const Icon = ICON_MAP[meta.icon];
                return { icon: Icon || LayoutDashboard, label: meta.label, desc: meta.description };
              }),
            ].map((feature) => (
              <Card key={feature.label} variant="inset" padding="md" className="text-center">
                <feature.icon size={20} className="mx-auto mb-2" style={{ color: "var(--accent-color)" }} />
                <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{feature.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>{feature.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      ),
    },

    // Step 1: AI Prompt OR Manual section picker
    {
      title: aiMode ? "Let's build your planner" : "Choose your sections",
      content: aiMode ? (
        <ConversationalOnboarding onManual={() => setAiMode(false)} />
      ) : (
        // Manual section picker
        <div className="space-y-4 max-w-sm mx-auto">
          <p className="text-sm text-center mb-2" style={{ color: "var(--text-muted)" }}>
            Pick which sections you want. You can change this anytime in Settings.
          </p>
          <div className="space-y-2">
            {SECTIONS.map((id) => {
              const meta = SECTION_META[id];
              const Icon = ICON_MAP[meta.icon];
              const enabled = enabledSections.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleSection(id)}
                  className="w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    border: `1px solid ${enabled ? "var(--accent-color)" : "var(--border-subtle)"}`,
                    minHeight: 44,
                  }}
                >
                  {Icon && <Icon size={18} style={{ color: enabled ? "var(--accent-color)" : "var(--text-faint)" }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{meta.label}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{meta.description}</p>
                  </div>
                  <ToggleSwitch
                    checked={enabled}
                    onChange={() => toggleSection(id)}
                    size="sm"
                  />
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setAiMode(true)}
            className="w-full text-center text-xs hover:underline mt-2"
            style={{ color: "var(--accent-text)" }}
          >
            Use AI to set up automatically
          </button>
        </div>
      ),
    },

    // Step 2: Review (shown after AI generation or skipped in manual mode)
    {
      title: "Review your planner",
      content: (
        <div className="space-y-4 max-w-md mx-auto max-h-[60vh] overflow-y-auto pr-1">
          {/* Section toggles */}
          <div className="space-y-2">
            {SECTIONS.map((id) => {
              const meta = SECTION_META[id];
              const Icon = ICON_MAP[meta.icon];
              const enabled = enabledSections.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggleSection(id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-md text-left transition-colors"
                  style={{
                    background: "var(--surface-2)",
                    border: `1px solid ${enabled ? "var(--accent-color)" : "var(--border-subtle)"}`,
                    minHeight: 44,
                  }}
                >
                  {Icon && <Icon size={16} style={{ color: enabled ? "var(--accent-color)" : "var(--text-faint)" }} />}
                  <span className="text-sm font-medium flex-1" style={{ color: "var(--text-primary)" }}>{meta.label}</span>
                  <ToggleSwitch
                    checked={enabled}
                    onChange={() => toggleSection(id)}
                    size="sm"
                  />
                </button>
              );
            })}
          </div>

          {/* Work config */}
          {enabledSections.includes("work") && jobs.length > 0 && (
            <ConfigCard title="Jobs">
              {jobs.map((job, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <FormInput
                    type="text"
                    value={job.name}
                    onChange={(e) => { const u = [...jobs]; u[idx].name = e.target.value; setJobs(u); }}
                    className="flex-1"
                    placeholder="Job name"
                  />
                  <FormInput
                    type="number"
                    value={job.hourlyRate}
                    onChange={(e) => { const u = [...jobs]; u[idx].hourlyRate = Number(e.target.value); setJobs(u); }}
                    className="w-16 num"
                    placeholder="$/hr"
                  />
                  <Button variant="ghost" size="icon" aria-label="Remove job" onClick={() => setJobs(jobs.filter((_, i) => i !== idx))}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
              <button
                onClick={() => setJobs([...jobs, { name: "", hourlyRate: 0, weeklyTarget: 20, active: true, enableExpenseTracking: false }])}
                className="text-xs hover:underline flex items-center gap-1"
                style={{ color: "var(--accent-text)" }}
              >
                <Plus size={10} />Add job
              </button>
            </ConfigCard>
          )}

          {/* Gym config */}
          {enabledSections.includes("gym") && (
            <ConfigCard title="Gym target">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTargetDaysPerWeek(n)}
                    className="flex-1 py-1.5 rounded-md text-xs font-medium num transition-colors"
                    style={{
                      minHeight: 36,
                      background: "var(--surface-2)",
                      border: `1px solid ${targetDaysPerWeek === n ? "var(--accent-color)" : "var(--border-subtle)"}`,
                      color: targetDaysPerWeek === n ? "var(--accent-color)" : "var(--text-muted)",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                <span className="num">{targetDaysPerWeek}</span> days per week
              </p>
            </ConfigCard>
          )}

          {/* Study subjects */}
          {enabledSections.includes("study") && subjects.length > 0 && (
            <ConfigCard title="Subjects">
              {subjects.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />
                  <FormInput
                    type="text"
                    value={s.name}
                    onChange={(e) => { const u = [...subjects]; u[idx].name = e.target.value; setSubjects(u); }}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" aria-label="Remove subject" onClick={() => setSubjects(subjects.filter((_, i) => i !== idx))}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
            </ConfigCard>
          )}

          {/* Hobbies */}
          {enabledSections.includes("hobbies") && hobbies.length > 0 && (
            <ConfigCard title="Hobbies">
              {hobbies.map((h, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <FormInput
                    type="text"
                    value={h.name}
                    onChange={(e) => { const u = [...hobbies]; u[idx].name = e.target.value; setHobbies(u); }}
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon" aria-label="Remove hobby" onClick={() => setHobbies(hobbies.filter((_, i) => i !== idx))}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
            </ConfigCard>
          )}

          {/* Chores */}
          {enabledSections.includes("housework") && chores.length > 0 && (
            <ConfigCard title="Chores">
              {chores.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <FormInput
                    type="text"
                    value={c.name}
                    onChange={(e) => { const u = [...chores]; u[idx].name = e.target.value; setChores(u); }}
                    className="flex-1"
                  />
                  <FormSelect
                    value={c.frequency}
                    onChange={(e) => { const u = [...chores]; u[idx].frequency = e.target.value; setChores(u); }}
                    className="w-24"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </FormSelect>
                  <Button variant="ghost" size="icon" aria-label="Remove chore" onClick={() => setChores(chores.filter((_, i) => i !== idx))}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
            </ConfigCard>
          )}

          {/* Bills */}
          {enabledSections.includes("finances") && bills.length > 0 && (
            <ConfigCard title="Bills">
              {bills.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <FormInput
                    type="text"
                    value={b.name}
                    onChange={(e) => { const u = [...bills]; u[idx].name = e.target.value; setBills(u); }}
                    className="flex-1"
                    placeholder="Name"
                  />
                  <FormInput
                    type="number"
                    value={b.amount}
                    onChange={(e) => { const u = [...bills]; u[idx].amount = Number(e.target.value); setBills(u); }}
                    className="w-20 num"
                    placeholder="$"
                  />
                  <Button variant="ghost" size="icon" aria-label="Remove bill" onClick={() => setBills(bills.filter((_, i) => i !== idx))}>
                    <Trash2 size={12} />
                  </Button>
                </div>
              ))}
            </ConfigCard>
          )}

          {/* Suggested habits */}
          {enabledSections.includes("habits") && suggestedHabits.length > 0 && (
            <ConfigCard title="Suggested habits">
              <p className="text-[10px] -mt-1" style={{ color: "var(--text-muted)" }}>These will be created as habits you can track daily.</p>
              <div className="space-y-1.5">
                {suggestedHabits.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Check size={12} style={{ color: "var(--accent-color)" }} />
                    <span className="text-sm" style={{ color: "var(--text-primary)" }}>{h}</span>
                    <Button variant="ghost" size="icon" className="ml-auto" aria-label="Remove habit" onClick={() => setSuggestedHabits(suggestedHabits.filter((_, i) => i !== idx))}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            </ConfigCard>
          )}

          {/* Custom sections from AI */}
          {customSectionTemplates.length > 0 && (
            <ConfigCard title="Custom Sections">
              <p className="text-[10px] -mt-1" style={{ color: "var(--text-muted)" }}>AI-generated sections tailored to your needs.</p>
              {customSectionTemplates.map((tpl, idx) => {
                const Icon = ICON_MAP[tpl.icon] || ICON_MAP.Star;
                return (
                  <Card key={idx} variant="inset" padding="sm" className="flex items-center gap-3">
                    <Icon size={16} style={{ color: "var(--accent-color)" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{tpl.name}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <span className="num">{tpl.fields.length}</span> fields: {tpl.fields.map((f) => f.label).join(", ")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" aria-label="Remove section" onClick={() => setCustomSectionTemplates(customSectionTemplates.filter((_, i) => i !== idx))}>
                      <Trash2 size={12} />
                    </Button>
                  </Card>
                );
              })}
            </ConfigCard>
          )}
        </div>
      ),
    },

    // Step 3: Personalization
    {
      title: "Make it yours",
      content: (
        <div className="space-y-6 max-w-sm mx-auto">
          <div>
            <p className="stat-label mb-3">Accent color</p>
            <div className="flex gap-3">
              {THEMES.map((t) => (
                <button
                  key={t}
                  onClick={() => { setAccentTheme(t); document.documentElement.setAttribute("data-theme", t); }}
                  className="w-10 h-10 rounded-md transition-colors"
                  style={{
                    background: THEME_COLORS[t],
                    opacity: accentTheme === t ? 1 : 0.4,
                    outline: accentTheme === t ? `2px solid var(--accent-color)` : "none",
                    outlineOffset: 2,
                  }}
                  aria-label={t}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="stat-label mb-3">Font</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FONTS.map((f) => {
                const meta = FONT_META[f as FontStyle];
                const active = fontStyle === f;
                return (
                  <button
                    key={f}
                    onClick={() => { setFontStyle(f); document.documentElement.setAttribute("data-font", f); }}
                    className="p-3 rounded-md text-left transition-colors"
                    style={{
                      background: "var(--surface-2)",
                      border: `1px solid ${active ? "var(--accent-color)" : "var(--border-subtle)"}`,
                    }}
                  >
                    <p
                      className="text-lg font-semibold mb-0.5"
                      style={{
                        fontFamily: FONT_FAMILY_MAP[f as FontStyle],
                        color: "var(--text-primary)",
                      }}
                    >
                      {meta.preview}
                    </p>
                    <p
                      className="text-xs font-medium"
                      style={{ color: active ? "var(--accent-text)" : "var(--text-primary)" }}
                    >
                      {meta.label}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{meta.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="stat-label mb-3">Currency</p>
            <div className="flex gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className="flex-1 px-3 py-2 rounded-md text-sm font-medium num transition-colors"
                  style={{
                    minHeight: 44,
                    background: "var(--surface-2)",
                    border: `1px solid ${currency === c ? "var(--accent-color)" : "var(--border-subtle)"}`,
                    color: currency === c ? "var(--accent-color)" : "var(--text-muted)",
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  // In manual mode, skip step 2 (review) unless AI was used
  const handleNext = () => {
    if (step === 1 && !aiMode) {
      setStep(3); // Skip review, go to personalization
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step === 3 && !aiMode) {
      setStep(1); // Skip review going back
    } else {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-10">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: step === i ? 24 : 8,
                background: step >= i ? "var(--accent-color)" : "var(--border-subtle)",
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
          >
            <h1 className="text-xl font-semibold text-center mb-6" style={{ color: "var(--text-primary)" }}>
              {steps[step].title}
            </h1>
            {steps[step].content}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 0 ? (
            <Button variant="ghost" size="md" onClick={handleBack}>
              <ArrowLeft size={14} />
              Back
            </Button>
          ) : <div />}

          {step < steps.length - 1 ? (
            step === 1 && aiMode ? (
              <div /> // Generate button is inside the step content
            ) : (
              <Button variant="primary" size="lg" onClick={handleNext}>
                Continue
                <ArrowRight size={14} />
              </Button>
            )
          ) : (
            <Button variant="primary" size="lg" onClick={handleFinish} disabled={loading}>
              {loading ? "Setting up..." : "Launch planner"}
              <Check size={14} />
            </Button>
          )}
        </div>

        {/* Skip */}
        {step < steps.length - 1 && step !== 1 && (
          <button
            onClick={handleFinish}
            className="w-full text-center text-xs mt-4 hover:underline"
            style={{ color: "var(--text-faint)" }}
          >
            Skip setup
          </button>
        )}
      </div>
    </div>
  );
}

function ConfigCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="default" padding="md" className="space-y-2">
      <p className="stat-label">{title}</p>
      {children}
    </Card>
  );
}

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
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  THEMES, FONTS, FONT_META, CURRENCIES, THEME_COLORS,
  SECTIONS, SECTION_META, DEFAULT_ENABLED_SECTIONS,
  type SectionId, type FontStyle,
} from "@/lib/constants";
import { ICON_MAP } from "@/lib/icon-map";
import type { PlannerConfig } from "@/lib/ai";

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

const SUBJECT_COLORS = ["#D4A853", "#00C9A7", "#9B72F0", "#F07070", "#7EC8A0", "#5B9BD5", "#FF8C42"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(true);

  // AI prompt state
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  // Personalization
  const [name, setName] = useState("");
  const [avatarEmoji] = useState("🌟");
  const [accentTheme, setAccentTheme] = useState("amber");
  const [fontStyle, setFontStyle] = useState("sans");
  const [currency, setCurrency] = useState("CAD");

  // Sections & config
  const [enabledSections, setEnabledSections] = useState<SectionId[]>([...DEFAULT_ENABLED_SECTIONS]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [targetDaysPerWeek, setTargetDaysPerWeek] = useState(5);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [chores, setChores] = useState<Chore[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [suggestedHabits, setSuggestedHabits] = useState<string[]>([]);

  const toggleSection = (id: SectionId) => {
    setEnabledSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const applyAIConfig = (config: PlannerConfig) => {
    const validSections = config.enabledSections.filter((s) =>
      SECTIONS.includes(s as SectionId)
    ) as SectionId[];
    setEnabledSections(validSections.length > 0 ? validSections : [...DEFAULT_ENABLED_SECTIONS]);

    if (config.workConfig?.jobs) {
      setJobs(config.workConfig.jobs.map((j) => ({
        name: j.name, hourlyRate: j.hourlyRate || 0, weeklyTarget: j.weeklyTarget || 20,
        active: true, enableExpenseTracking: false,
      })));
    }
    if (config.gymConfig) setTargetDaysPerWeek(config.gymConfig.targetDaysPerWeek);
    if (config.studyConfig?.subjects) {
      setSubjects(config.studyConfig.subjects.map((s, i) => ({
        name: s.name, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length], active: true,
      })));
    }
    if (config.hobbiesConfig?.hobbies) {
      setHobbies(config.hobbiesConfig.hobbies.map((h, i) => ({
        name: h.name, color: SUBJECT_COLORS[i % SUBJECT_COLORS.length], active: true,
      })));
    }
    if (config.houseworkConfig?.chores) {
      setChores(config.houseworkConfig.chores.map((c) => ({
        name: c.name, frequency: c.frequency || "daily", active: true,
      })));
    }
    if (config.bills) {
      setBills(config.bills.map((b) => ({
        name: b.name, amount: b.amount || 0, dueDay: b.dueDay || 1,
        category: b.category || "other", active: true,
      })));
    }
    if (config.suggestedHabits) setSuggestedHabits(config.suggestedHabits);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error("Describe what you want to track"); return; }

    setGenerating(true);
    try {
      const res = await fetch("/api/onboarding/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Generation failed"); setGenerating(false); return; }

      applyAIConfig(data.config);
      toast.success("Planner generated!");
      setStep(2); // Go to review step
    } catch {
      toast.error("Network error. Please try again.");
    }
    setGenerating(false);
  };

  const handleFinish = async () => {
    setLoading(true);
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
      toast.success("Welcome to MyPlanner!");
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
      title: "Welcome to MyPlanner",
      content: (
        <div className="space-y-8">
          <p className="text-muted-foreground text-center max-w-md mx-auto">
            Your personal workspace for tracking work, gym, finances, study, and more — designed exactly how you want it.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-md mx-auto">
            {[
              { icon: LayoutDashboard, label: "Dashboard", desc: "Everything at a glance" },
              ...SECTIONS.map((id) => {
                const meta = SECTION_META[id];
                const Icon = ICON_MAP[meta.icon];
                return { icon: Icon || LayoutDashboard, label: meta.label, desc: meta.description };
              }),
            ].map((feature) => (
              <div key={feature.label} className="planner-surface-2 p-4 text-center">
                <feature.icon size={24} className="mx-auto mb-2" style={{ color: "var(--accent-color)" }} />
                <p className="text-xs font-semibold">{feature.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },

    // Step 1: AI Prompt OR Manual section picker
    {
      title: aiMode ? "Describe your planner" : "Choose your sections",
      content: aiMode ? (
        <div className="space-y-6 max-w-md mx-auto">
          <p className="text-xs text-muted-foreground text-center">
            Tell us what you want to track and we&apos;ll set up your planner automatically.
          </p>

          <div>
            <textarea
              placeholder={"e.g. I work two part-time jobs at Starbucks ($17/hr, 20h/week) and a bookstore ($16/hr, 15h/week). I go to the gym 5 days a week. I study Computer Science and Math at university. I want to track my reading and daily habits like meditation and journaling."}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-all hover:-translate-y-0.5 disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Generate my planner
              </>
            )}
          </button>

          <button
            onClick={() => setAiMode(false)}
            className="w-full text-center text-xs text-muted-foreground hover:underline"
          >
            Skip AI — I&apos;ll choose sections manually
          </button>
        </div>
      ) : (
        // Manual section picker (existing)
        <div className="space-y-4 max-w-sm mx-auto">
          <p className="text-xs text-muted-foreground text-center mb-2">
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
                  className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all"
                  style={{
                    background: enabled ? "var(--accent-glow)" : "var(--surface-2)",
                    border: `1px solid ${enabled ? "var(--accent-color)" : "var(--border-subtle)"}`,
                  }}
                >
                  {Icon && <Icon size={20} style={{ color: enabled ? "var(--accent-color)" : "var(--text-muted)" }} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: enabled ? "var(--text-primary)" : "var(--text-muted)" }}>{meta.label}</p>
                    <p className="text-[11px] text-muted-foreground">{meta.description}</p>
                  </div>
                  <div className="w-10 h-6 rounded-full transition-all flex items-center px-0.5" style={{ background: enabled ? "var(--accent-color)" : "var(--surface-1)", border: enabled ? "none" : "1px solid var(--border-subtle)" }}>
                    <div className="w-5 h-5 rounded-full transition-all" style={{ background: enabled ? "white" : "var(--text-muted)", transform: enabled ? "translateX(16px)" : "translateX(0)", opacity: enabled ? 1 : 0.5 }} />
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setAiMode(true)}
            className="w-full text-center text-xs text-muted-foreground hover:underline mt-2"
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
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all"
                  style={{
                    background: enabled ? "var(--accent-glow)" : "var(--surface-2)",
                    border: `1px solid ${enabled ? "var(--accent-color)" : "var(--border-subtle)"}`,
                  }}
                >
                  {Icon && <Icon size={16} style={{ color: enabled ? "var(--accent-color)" : "var(--text-muted)" }} />}
                  <span className="text-sm font-medium flex-1" style={{ color: enabled ? "var(--text-primary)" : "var(--text-muted)" }}>{meta.label}</span>
                  <div className="w-8 h-5 rounded-full transition-all flex items-center px-0.5" style={{ background: enabled ? "var(--accent-color)" : "var(--surface-1)", border: enabled ? "none" : "1px solid var(--border-subtle)" }}>
                    <div className="w-4 h-4 rounded-full transition-all" style={{ background: enabled ? "white" : "var(--text-muted)", transform: enabled ? "translateX(12px)" : "translateX(0)", opacity: enabled ? 1 : 0.5 }} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Work config */}
          {enabledSections.includes("work") && jobs.length > 0 && (
            <ConfigCard title="Jobs">
              {jobs.map((job, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="text" value={job.name} onChange={(e) => { const u = [...jobs]; u[idx].name = e.target.value; setJobs(u); }} className="config-input flex-1" placeholder="Job name" />
                  <input type="number" value={job.hourlyRate} onChange={(e) => { const u = [...jobs]; u[idx].hourlyRate = Number(e.target.value); setJobs(u); }} className="config-input w-16" placeholder="$/hr" />
                  <button onClick={() => setJobs(jobs.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                </div>
              ))}
              <button onClick={() => setJobs([...jobs, { name: "", hourlyRate: 0, weeklyTarget: 20, active: true, enableExpenseTracking: false }])} className="text-xs text-muted-foreground hover:underline flex items-center gap-1"><Plus size={10} />Add job</button>
            </ConfigCard>
          )}

          {/* Gym config */}
          {enabledSections.includes("gym") && (
            <ConfigCard title="Gym target">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button key={n} onClick={() => setTargetDaysPerWeek(n)} className="flex-1 py-1.5 rounded text-xs font-medium transition-all" style={{ background: targetDaysPerWeek === n ? "var(--accent-glow)" : "var(--surface-1)", border: `1px solid ${targetDaysPerWeek === n ? "var(--accent-color)" : "var(--border-subtle)"}`, color: targetDaysPerWeek === n ? "var(--accent-color)" : "var(--text-muted)" }}>{n}</button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">{targetDaysPerWeek} days per week</p>
            </ConfigCard>
          )}

          {/* Study subjects */}
          {enabledSections.includes("study") && subjects.length > 0 && (
            <ConfigCard title="Subjects">
              {subjects.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                  <input type="text" value={s.name} onChange={(e) => { const u = [...subjects]; u[idx].name = e.target.value; setSubjects(u); }} className="config-input flex-1" />
                  <button onClick={() => setSubjects(subjects.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                </div>
              ))}
            </ConfigCard>
          )}

          {/* Hobbies */}
          {enabledSections.includes("hobbies") && hobbies.length > 0 && (
            <ConfigCard title="Hobbies">
              {hobbies.map((h, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="text" value={h.name} onChange={(e) => { const u = [...hobbies]; u[idx].name = e.target.value; setHobbies(u); }} className="config-input flex-1" />
                  <button onClick={() => setHobbies(hobbies.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                </div>
              ))}
            </ConfigCard>
          )}

          {/* Chores */}
          {enabledSections.includes("housework") && chores.length > 0 && (
            <ConfigCard title="Chores">
              {chores.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="text" value={c.name} onChange={(e) => { const u = [...chores]; u[idx].name = e.target.value; setChores(u); }} className="config-input flex-1" />
                  <select value={c.frequency} onChange={(e) => { const u = [...chores]; u[idx].frequency = e.target.value; setChores(u); }} className="config-input w-24">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <button onClick={() => setChores(chores.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                </div>
              ))}
            </ConfigCard>
          )}

          {/* Bills */}
          {enabledSections.includes("finances") && bills.length > 0 && (
            <ConfigCard title="Bills">
              {bills.map((b, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input type="text" value={b.name} onChange={(e) => { const u = [...bills]; u[idx].name = e.target.value; setBills(u); }} className="config-input flex-1" placeholder="Name" />
                  <input type="number" value={b.amount} onChange={(e) => { const u = [...bills]; u[idx].amount = Number(e.target.value); setBills(u); }} className="config-input w-20" placeholder="$" />
                  <button onClick={() => setBills(bills.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                </div>
              ))}
            </ConfigCard>
          )}

          {/* Suggested habits */}
          {enabledSections.includes("habits") && suggestedHabits.length > 0 && (
            <ConfigCard title="Suggested habits">
              <p className="text-[10px] text-muted-foreground -mt-1">These will be created as habits you can track daily.</p>
              <div className="space-y-1.5">
                {suggestedHabits.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Check size={12} style={{ color: "var(--accent-color)" }} />
                    <span className="text-sm">{h}</span>
                    <button onClick={() => setSuggestedHabits(suggestedHabits.filter((_, i) => i !== idx))} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            </ConfigCard>
          )}

          <style>{`
            .config-input {
              padding: 0.375rem 0.5rem;
              border-radius: 0.375rem;
              font-size: 0.75rem;
              background: var(--surface-1);
              border: 1px solid var(--border-subtle);
              color: var(--text-primary);
            }
            .config-input:focus {
              outline: none;
              border-color: var(--accent-color);
            }
          `}</style>
        </div>
      ),
    },

    // Step 3: Personalization
    {
      title: "Make it yours",
      content: (
        <div className="space-y-6 max-w-sm mx-auto">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Your name</label>
            <input
              type="text" placeholder="What should we call you?" value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Accent color</label>
            <div className="flex gap-3">
              {THEMES.map((t) => (
                <button key={t} onClick={() => { setAccentTheme(t); document.documentElement.setAttribute("data-theme", t); }}
                  className="w-12 h-12 rounded-xl transition-all hover:scale-110"
                  style={{ background: THEME_COLORS[t], opacity: accentTheme === t ? 1 : 0.35, boxShadow: accentTheme === t ? `0 0 0 2px var(--background), 0 0 0 4px ${THEME_COLORS[t]}` : "none" }}
                />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Font</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FONTS.map((f) => {
                const meta = FONT_META[f as FontStyle];
                return (
                  <button key={f} onClick={() => { setFontStyle(f); document.documentElement.setAttribute("data-font", f); }}
                    className="p-3 rounded-lg text-left transition-all"
                    style={{ background: fontStyle === f ? "var(--accent-glow)" : "var(--surface-2)", border: `1px solid ${fontStyle === f ? "var(--accent-color)" : "var(--border-subtle)"}` }}
                  >
                    <p className="text-lg font-semibold mb-0.5" style={{ fontFamily: f === "sans" ? "'DM Sans', sans-serif" : f === "inter" ? "'Inter', sans-serif" : f === "geometric" ? "'Space Grotesk', sans-serif" : f === "serif" ? "'Playfair Display', serif" : "'JetBrains Mono', monospace", color: fontStyle === f ? "var(--text-primary)" : "var(--text-muted)" }}>{meta.preview}</p>
                    <p className="text-xs font-medium" style={{ color: fontStyle === f ? "var(--accent-color)" : "var(--text-primary)" }}>{meta.label}</p>
                    <p className="text-[10px] text-muted-foreground">{meta.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Currency</label>
            <div className="flex gap-2">
              {CURRENCIES.map((c) => (
                <button key={c} onClick={() => setCurrency(c)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{ background: currency === c ? "var(--accent-glow)" : "var(--surface-2)", border: `1px solid ${currency === c ? "var(--accent-color)" : "var(--border-subtle)"}`, color: currency === c ? "var(--accent-color)" : "var(--text-muted)" }}
                >{c}</button>
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
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: step === i ? 24 : 8,
                background: step >= i ? "var(--accent-color)" : "var(--surface-2)",
              }}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-2xl font-bold text-center mb-6">
              {steps[step].title}
            </h1>
            {steps[step].content}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 0 ? (
            <button onClick={handleBack} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all" style={{ color: "var(--text-muted)" }}>
              <ArrowLeft size={14} />
              Back
            </button>
          ) : <div />}

          {step < steps.length - 1 ? (
            step === 1 && aiMode ? (
              <div /> // Generate button is inside the step content
            ) : (
              <button onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-all hover:-translate-y-0.5"
              >
                Continue
                <ArrowRight size={14} />
              </button>
            )
          ) : (
            <button onClick={handleFinish} disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? "Setting up..." : "Launch planner"}
              <Check size={14} />
            </button>
          )}
        </div>

        {/* Skip */}
        {step < steps.length - 1 && step !== 1 && (
          <button onClick={handleFinish}
            className="w-full text-center text-xs text-muted-foreground mt-4 hover:underline"
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
    <div className="planner-surface p-4 space-y-2">
      <h3 className="text-xs font-semibold" style={{ color: "var(--accent-color)" }}>{title}</h3>
      {children}
    </div>
  );
}

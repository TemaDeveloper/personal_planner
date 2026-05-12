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

interface Job {
  name: string;
  hourlyRate: number;
  weeklyTarget: number;
  active: boolean;
  enableExpenseTracking: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Personalization
  const [name, setName] = useState("");
  const [avatarEmoji] = useState("🌟");
  const [accentTheme, setAccentTheme] = useState("amber");
  const [fontStyle, setFontStyle] = useState("sans");
  const [currency, setCurrency] = useState("CAD");

  // Sections
  const [enabledSections, setEnabledSections] = useState<SectionId[]>([...DEFAULT_ENABLED_SECTIONS]);

  const toggleSection = (id: SectionId) => {
    setEnabledSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Jobs
  const [jobs, setJobs] = useState<Job[]>([
    { name: "", hourlyRate: 0, weeklyTarget: 20, active: true, enableExpenseTracking: false },
  ]);

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
      }),
    });

    if (res.ok) {
      // Apply theme
      document.documentElement.setAttribute("data-theme", accentTheme);
      document.documentElement.setAttribute("data-font", fontStyle);
      toast.success("Welcome to MyPlanner!");
      router.push("/dashboard");
    } else {
      toast.error("Something went wrong");
      setLoading(false);
    }
  };

  const steps = [
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
              <div
                key={feature.label}
                className="planner-surface-2 p-4 text-center"
              >
                <feature.icon
                  size={24}
                  className="mx-auto mb-2"
                  style={{ color: "var(--accent-color)" }}
                />
                <p className="text-xs font-semibold">{feature.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Make it yours",
      content: (
        <div className="space-y-6 max-w-sm mx-auto">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Your name
            </label>
            <input
              type="text"
              placeholder="What should we call you?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Accent color
            </label>
            <div className="flex gap-3">
              {THEMES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setAccentTheme(t);
                    document.documentElement.setAttribute("data-theme", t);
                  }}
                  className="w-12 h-12 rounded-xl transition-all hover:scale-110"
                  style={{
                    background: THEME_COLORS[t],
                    opacity: accentTheme === t ? 1 : 0.35,
                    boxShadow:
                      accentTheme === t
                        ? `0 0 0 2px var(--background), 0 0 0 4px ${THEME_COLORS[t]}`
                        : "none",
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Font
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Currency
            </label>
            <div className="flex gap-2">
              {CURRENCIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
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
          </div>
        </div>
      ),
    },
    {
      title: "Choose your sections",
      content: (
        <div className="space-y-4 max-w-sm mx-auto">
          <p className="text-xs text-muted-foreground text-center mb-2">
            Pick which sections you want in your planner. You can change this anytime in Settings.
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
                  {Icon && (
                    <Icon
                      size={20}
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
                    <p className="text-[11px] text-muted-foreground">{meta.description}</p>
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
        </div>
      ),
    },
    ...(enabledSections.includes("work") ? [{
      title: "Set up your work",
      content: (
        <div className="space-y-4 max-w-sm mx-auto">
          <p className="text-xs text-muted-foreground text-center mb-2">
            Add the jobs you want to track. You can change this later in Settings.
          </p>
          {jobs.map((job, idx) => (
            <div
              key={idx}
              className="planner-surface-2 p-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Job name"
                  value={job.name}
                  onChange={(e) => {
                    const updated = [...jobs];
                    updated[idx].name = e.target.value;
                    setJobs(updated);
                  }}
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: "var(--surface-1)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                  }}
                />
                <button onClick={() => setJobs(jobs.filter((_, i) => i !== idx))}>
                  <Trash2 size={14} className="text-muted-foreground" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground">Rate ($/hr)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={job.hourlyRate}
                    onChange={(e) => {
                      const updated = [...jobs];
                      updated[idx].hourlyRate = Number(e.target.value);
                      setJobs(updated);
                    }}
                    className="w-full px-2 py-1.5 rounded text-xs"
                    style={{
                      background: "var(--surface-1)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground">Hours/week</label>
                  <input
                    type="number"
                    value={job.weeklyTarget}
                    onChange={(e) => {
                      const updated = [...jobs];
                      updated[idx].weeklyTarget = Number(e.target.value);
                      setJobs(updated);
                    }}
                    className="w-full px-2 py-1.5 rounded text-xs"
                    style={{
                      background: "var(--surface-1)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
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
                <span className="text-muted-foreground">Track expenses & km</span>
              </label>
            </div>
          ))}
          <button
            onClick={() =>
              setJobs([
                ...jobs,
                { name: "", hourlyRate: 0, weeklyTarget: 20, active: true, enableExpenseTracking: false },
              ])
            }
            className="w-full py-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
            style={{
              background: "var(--surface-2)",
              border: "1px dashed var(--border-subtle)",
              color: "var(--text-muted)",
            }}
          >
            <Plus size={12} />
            Add job
          </button>
        </div>
      ),
    }] : []),
  ];

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
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ color: "var(--text-muted)" }}
            >
              <ArrowLeft size={14} />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-all hover:-translate-y-0.5"
            >
              Continue
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-primary text-primary-foreground transition-all hover:-translate-y-0.5 disabled:opacity-50"
            >
              {loading ? "Setting up..." : "Launch planner"}
              <Check size={14} />
            </button>
          )}
        </div>

        {/* Skip */}
        {step < steps.length - 1 && (
          <button
            onClick={handleFinish}
            className="w-full text-center text-xs text-muted-foreground mt-4 hover:underline"
          >
            Skip setup
          </button>
        )}
      </div>
    </div>
  );
}

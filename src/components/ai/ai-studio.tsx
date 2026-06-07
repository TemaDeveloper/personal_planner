"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useSections } from "@/components/providers/sections-provider";
import { SECTION_META } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Board-intent detection helpers
// ---------------------------------------------------------------------------

function detectBoardIntent(text: string): boolean {
  const t = text.toLowerCase();
  if (/\b(kanban|swimlane|task board|board)\b/.test(t)) return true;
  if (t.includes("to do") && t.includes("done")) return true;
  if (t.includes("in progress") && (t.includes("column") || t.includes("done"))) return true;
  return false;
}

function parseBoardColumns(_prompt: string): string[] {
  // Default columns; only override if the prompt clearly lists them.
  return ["To Do", "In Progress", "Done"];
}

function buildBoardConfig(prompt: string) {
  return {
    name: "Tasks",
    icon: "KanbanSquare",
    description: "Kanban board",
    viewType: "board" as const,
    layoutHtml: "",
    fields: [
      { key: "title", label: "Task", type: "text" as const, required: true },
      { key: "status", label: "Status", type: "select" as const, options: parseBoardColumns(prompt) },
      { key: "priority", label: "Priority", type: "select" as const, options: ["Low", "Medium", "High"] },
    ],
  };
}

interface AiStudioProps {
  open: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  "Water tracker",
  "Mood journal",
  "Tips column → Work",
  "Travel budget",
];

const MODE_SEGMENTS = [
  { value: "create" as const, label: "Create" },
  { value: "update" as const, label: "Update" },
];

type Mode = "create" | "update";

export function AiStudio({ open, onClose }: AiStudioProps) {
  const router = useRouter();
  const { enabledSections, customSections } = useSections();

  const [mode, setMode] = useState<Mode>("create");

  // Create mode state
  const [prompt, setPrompt] = useState("");

  // Update mode state
  const [sectionKey, setSectionKey] = useState<string>("dashboard");
  const [updatePrompt, setUpdatePrompt] = useState("");

  // Shared state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Deterministic board creation — bypasses LLM entirely
  async function createBoardFromPrompt(userPrompt: string) {
    const config = buildBoardConfig(userPrompt);

    const res = await fetch("/api/sections/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Could not create board. Please try again.");
      return;
    }

    toast.success("Board created");
    router.refresh();
    router.push("/sections/" + data.template.slug);
    onClose();
  }

  function resetFeedback() {
    setError(null);
    setSuccess(false);
  }

  function handleModeChange(next: Mode) {
    setMode(next);
    resetFeedback();
  }

  function applyChip(chip: string) {
    setPrompt(chip);
    resetFeedback();
  }

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setLoading(true);
    resetFeedback();

    // Deterministic board shortcut — no LLM needed
    if (detectBoardIntent(trimmed)) {
      try {
        await createBoardFromPrompt(trimmed);
      } catch {
        setError("Something went wrong. Please check your connection and try again.");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      // Step 1: generate config from prompt
      const genRes = await fetch("/api/onboarding/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });

      const genData = await genRes.json();

      if (!genRes.ok) {
        setError(genData.error ?? "Generation failed. Please try again.");
        return;
      }

      // The generate endpoint returns a full PlannerConfig; the first custom section is what we save.
      const rawConfig = genData.config;
      const config = rawConfig?.customSections?.[0] ?? rawConfig;
      if (!config || !config.name) {
        setError("The AI returned an unexpected response. Please rephrase and try again.");
        return;
      }

      // Step 2: save the generated section template
      const saveRes = await fetch("/api/sections/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: config.name,
          icon: config.icon ?? "Star",
          description: config.description ?? "",
          fields: config.fields ?? [],
          viewType: config.viewType ?? "weekly-cards",
          layoutHtml: config.layoutHtml ?? "",
        }),
      });

      const saveData = await saveRes.json();

      if (!saveRes.ok) {
        setError(saveData.error ?? "Could not save section. Please try again.");
        return;
      }

      setSuccess(true);
      setPrompt("");

      // Refresh server components so the new section appears in the sidebar
      router.refresh();

      // Close the modal after a short beat so the user sees the success state
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    const trimmed = updatePrompt.trim();
    if (!trimmed || !sectionKey) return;

    setLoading(true);
    resetFeedback();

    // Board intent in Update mode — route by section type
    if (detectBoardIntent(trimmed)) {
      if (sectionKey.startsWith("custom:")) {
        // Convert the existing custom section into a board in place via PATCH
        const slug = sectionKey.slice("custom:".length);
        const { fields } = buildBoardConfig(trimmed);
        try {
          const res = await fetch(`/api/sections/templates/${slug}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ viewType: "board", layoutHtml: "", fields }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error ?? "Could not convert section to a board. Please try again.");
            setLoading(false);
            return;
          }
          toast.success("Section converted to a board");
          router.refresh();
          router.push("/sections/" + slug);
          onClose();
        } catch {
          setError("Something went wrong. Please check your connection and try again.");
        } finally {
          setLoading(false);
        }
      } else {
        // Dashboard or a built-in section — cannot create a board here
        setError(
          "A board can't be added to the dashboard or a built-in section. Switch to Create mode to make a new board — it'll be its own section and also appears on your dashboard.",
        );
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch("/api/ai/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionKey, prompt: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Update failed. Please try again.");
        return;
      }

      setSuccess(true);
      setUpdatePrompt("");

      router.refresh();

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1200);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  // Build section options for the update picker
  const sectionOptions: { value: string; label: string }[] = [
    { value: "dashboard", label: "Dashboard" },
    ...enabledSections.map((id) => ({
      value: id,
      label: SECTION_META[id].label,
    })),
    ...customSections.map((cs) => ({
      value: `custom:${cs.slug}`,
      label: cs.name,
    })),
  ];

  return (
    <Modal open={open} onClose={onClose} title="AI Studio" maxWidth="max-w-md">
      <div className="flex flex-col gap-4">
        {/* Mode toggle */}
        <SegmentedControl
          segments={MODE_SEGMENTS}
          value={mode}
          onChange={handleModeChange}
          layoutId="ai-studio-mode"
          className="w-full"
        />

        {mode === "create" ? (
          <>
            {/* Description */}
            <p className="text-sm text-[var(--text-muted)]">
              Describe a section or change and the AI will generate it for you.
            </p>

            {/* Textarea */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ai-prompt" className="stat-label">
                Describe a section or change
              </label>
              <textarea
                id="ai-prompt"
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  resetFeedback();
                }}
                placeholder="e.g. A daily water intake tracker with a goal of 8 glasses"
                rows={4}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] resize-none transition-all"
                disabled={loading}
              />
            </div>

            {/* Suggestion chips */}
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => applyChip(chip)}
                  disabled={loading}
                  className="inline-flex items-center h-7 px-3 rounded-full text-xs font-medium border border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-muted)] hover:border-[var(--accent-color)] hover:text-[var(--accent-text)] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  {chip}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Description */}
            <p className="text-sm text-[var(--text-muted)]">
              Pick a section and describe what you want to change.
            </p>

            {/* Section picker */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ai-section-key" className="stat-label">
                Section
              </label>
              <select
                id="ai-section-key"
                value={sectionKey}
                onChange={(e) => {
                  setSectionKey(e.target.value);
                  resetFeedback();
                }}
                disabled={loading}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] transition-all disabled:opacity-40"
              >
                {sectionOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Update prompt */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ai-update-prompt" className="stat-label">
                What to change
              </label>
              <textarea
                id="ai-update-prompt"
                value={updatePrompt}
                onChange={(e) => {
                  setUpdatePrompt(e.target.value);
                  resetFeedback();
                }}
                placeholder={`"add a temperature field" · "track tips per shift" · "add my average sleep to the dashboard"`}
                rows={4}
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-faint)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)] resize-none transition-all"
                disabled={loading}
              />
            </div>
          </>
        )}

        {/* Error / success feedback */}
        {error && (
          <p className="text-xs text-[var(--alert)] bg-[var(--alert-wash)] rounded-md px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs text-[var(--good)] bg-[var(--good-wash)] rounded-md px-3 py-2">
            {mode === "create"
              ? "Section created! It will appear in your sidebar shortly."
              : "Section updated!"}
          </p>
        )}

        {/* Action button */}
        {mode === "create" ? (
          <Button
            variant="primary"
            size="md"
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            className="w-full"
          >
            <Sparkles size={15} />
            {loading ? "Generating…" : "Generate"}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="md"
            onClick={handleUpdate}
            disabled={loading || !updatePrompt.trim()}
            className="w-full"
          >
            <Sparkles size={15} />
            {loading ? "Updating…" : "Update"}
          </Button>
        )}
      </div>
    </Modal>
  );
}

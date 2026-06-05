"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

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

export function AiStudio({ open, onClose }: AiStudioProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function applyChip(chip: string) {
    setPrompt(chip);
    setError(null);
    setSuccess(false);
  }

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

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

      const config = genData.config;
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

  return (
    <Modal open={open} onClose={onClose} title="AI Studio" maxWidth="max-w-md">
      <div className="flex flex-col gap-4">
        {/* Description */}
        <p className="text-sm text-[var(--text-muted)]">
          Describe a section or change and the AI will generate it for you.
        </p>

        {/* Textarea */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="ai-prompt"
            className="stat-label"
          >
            Describe a section or change
          </label>
          <textarea
            id="ai-prompt"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              setError(null);
              setSuccess(false);
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

        {/* Error / success feedback */}
        {error && (
          <p className="text-xs text-[var(--alert)] bg-[var(--alert-wash)] rounded-md px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-xs text-[var(--good)] bg-[var(--good-wash)] rounded-md px-3 py-2">
            Section created! It will appear in your sidebar shortly.
          </p>
        )}

        {/* Generate button */}
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
      </div>
    </Modal>
  );
}

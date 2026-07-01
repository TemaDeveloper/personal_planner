"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/lib/profile/conversation";

interface Facet {
  key: string;
  dimension: string;
  value: string;
  salience: number;
}

const GREETING =
  "Hi! I'm here to build a planner around your actual life — not a generic template. To start: tell me about a typical week — how you spend your time, how you earn, how you move, and what you're working toward.";

const STORAGE_KEY = "lifora_onboarding_chat_v1";

interface SavedChat {
  messages?: ChatMessage[];
  facets?: Facet[];
  sufficient?: boolean;
}

function loadSaved(): SavedChat | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

/**
 * Conversational, profile-driven onboarding. Interviews the user, extracts an
 * open-facet life profile as they talk, and generates a bespoke planner. This
 * is the default first-run experience (SP-5b cutover).
 */
export function ConversationalOnboarding({ onManual }: { onManual: () => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => loadSaved()?.messages ?? [{ role: "assistant", content: GREETING }]
  );
  const [input, setInput] = useState("");
  const [facets, setFacets] = useState<Facet[]>(() => loadSaved()?.facets ?? []);
  const [sufficient, setSufficient] = useState<boolean>(() => loadSaved()?.sufficient ?? false);
  const [sending, setSending] = useState(false);
  const [building, setBuilding] = useState(false);

  // Persist the conversation so a refresh doesn't wipe it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, facets, sufficient }));
    } catch {
      /* ignore quota errors */
    }
  }, [messages, facets, sufficient]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/profile/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.assistant }]);
        setFacets(data.facets || []);
        setSufficient(Boolean(data.sufficient));
      }
    } catch {
      toast.error("Network error");
    }
    setSending(false);
  };

  const build = async () => {
    setBuilding(true);
    try {
      const res = await fetch("/api/profile/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not build your planner");
        setBuilding(false);
        return;
      }
      await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingDone: true }),
      });
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("lifora_onboarding_step");
      } catch {
        /* ignore */
      }
      toast.success(`Built ${data.sections?.length ?? 0} sections for you`);
      router.push("/dashboard");
    } catch {
      toast.error("Network error");
      setBuilding(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div
        className="space-y-3 max-h-[42vh] overflow-y-auto pr-1"
        aria-live="polite"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className="rounded-2xl px-3.5 py-2 text-sm max-w-[85%]"
              style={{
                background: m.role === "user" ? "var(--accent-color)" : "var(--surface-2)",
                color: m.role === "user" ? "#fff" : "var(--text-primary)",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3.5 py-2" style={{ background: "var(--surface-2)" }}>
              <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            </div>
          </div>
        )}
      </div>

      {facets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {facets
            .slice()
            .sort((a, b) => b.salience - a.salience)
            .slice(0, 8)
            .map((f) => (
              <span
                key={f.key}
                className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
                title={`${f.dimension}: ${f.value}`}
              >
                {f.dimension}
              </span>
            ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Tell me about your week…"
          rows={2}
          className="flex-1 resize-none rounded-lg px-3 py-2 text-sm"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
        />
        <Button size="icon" onClick={send} disabled={sending || !input.trim()} aria-label="Send">
          <Send size={16} />
        </Button>
      </div>

      <Button
        onClick={build}
        disabled={building || (!sufficient && facets.length === 0)}
        variant="primary"
        size="lg"
        className="w-full"
      >
        {building ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Building your planner…
          </>
        ) : (
          <>
            <Sparkles size={16} />
            {sufficient ? "Build my planner" : "Build with what we have"}
          </>
        )}
      </Button>

      <button
        onClick={onManual}
        className="w-full text-center text-xs hover:underline"
        style={{ color: "var(--text-faint)" }}
      >
        Skip — I&apos;ll choose sections manually
      </button>
    </div>
  );
}

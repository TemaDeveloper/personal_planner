"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Send, Sparkles } from "lucide-react";
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

/** Legacy, account-agnostic keys (pre-namespacing). Migrated/cleaned on load. */
export const LEGACY_CHAT_KEY = "lifora_onboarding_chat_v1";
export const LEGACY_STEP_KEY = "lifora_onboarding_step";

/** Per-account chat blob key so two accounts on one browser don't share a chat. */
export function chatStorageKey(userKey?: string | null): string {
  return userKey ? `${LEGACY_CHAT_KEY}:${userKey}` : LEGACY_CHAT_KEY;
}

/** Per-account onboarding UI state (step + aiMode) key. */
export function onboardingStateKey(userKey?: string | null): string {
  return userKey ? `lifora_onboarding_state_v1:${userKey}` : "lifora_onboarding_state_v1";
}

interface SavedChat {
  messages?: ChatMessage[];
  facets?: Facet[];
  sufficient?: boolean;
}

function loadSaved(storageKey: string): SavedChat | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(storageKey) || "null");
  } catch {
    return null;
  }
}

/**
 * Conversational, profile-driven onboarding. Interviews the user, extracts an
 * open-facet life profile as they talk, and generates a bespoke planner. This
 * is the default first-run experience (SP-5b cutover).
 */
export function ConversationalOnboarding({
  onManual,
  userKey,
}: {
  onManual: () => void;
  userKey?: string | null;
}) {
  const router = useRouter();
  const storageKey = chatStorageKey(userKey);
  const [saved] = useState(() => loadSaved(storageKey)); // parse localStorage once
  const [messages, setMessages] = useState<ChatMessage[]>(
    saved?.messages ?? [{ role: "assistant", content: GREETING }]
  );
  const [input, setInput] = useState("");
  const [facets, setFacets] = useState<Facet[]>(saved?.facets ?? []);
  const [sufficient, setSufficient] = useState<boolean>(saved?.sufficient ?? false);
  const [sending, setSending] = useState(false);
  const [building, setBuilding] = useState(false);
  // No AI provider is configured anywhere (server env + user settings).
  const [noProvider, setNoProvider] = useState(false);
  // Consecutive turns the server answered with a canned fallback.
  const [degradedTurns, setDegradedTurns] = useState(0);

  // Persist the conversation so a refresh doesn't wipe it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ messages, facets, sufficient }));
    } catch {
      /* ignore quota errors */
    }
  }, [storageKey, messages, facets, sufficient]);

  const sendTurn = async (next: ChatMessage[]) => {
    setSending(true);
    try {
      const res = await fetch("/api/profile/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 && /no ai provider/i.test(data.error || "")) {
          setNoProvider(true);
        } else {
          toast.error(data.error || "Something went wrong");
        }
      } else {
        setNoProvider(false);
        setMessages((m) => [...m, { role: "assistant", content: data.assistant }]);
        setFacets(data.facets || []);
        setSufficient(Boolean(data.sufficient));
        setDegradedTurns((n) => (data.degraded ? n + 1 : 0));
      }
    } catch {
      toast.error("Network error");
    }
    setSending(false);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    await sendTurn(next);
  };

  // Drop the canned fallback reply and re-run the last user turn.
  const retry = async () => {
    if (sending) return;
    const trimmed = [...messages];
    while (trimmed.length > 0 && trimmed[trimmed.length - 1].role === "assistant") {
      trimmed.pop();
    }
    if (!trimmed.some((m) => m.role === "user")) return;
    setMessages(trimmed);
    await sendTurn(trimmed);
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
        localStorage.removeItem(storageKey);
        localStorage.removeItem(onboardingStateKey(userKey));
        localStorage.removeItem(LEGACY_CHAT_KEY);
        localStorage.removeItem(LEGACY_STEP_KEY);
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
        {noProvider && (
          <div
            className="rounded-lg p-3 space-y-2 text-sm"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="flex items-center gap-2 font-medium" style={{ color: "var(--text-primary)" }}>
              <AlertTriangle size={14} style={{ color: "var(--accent-color)" }} />
              No AI provider is configured
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Add an API key in Settings later, or set up your planner manually now.
            </p>
            <Button size="sm" variant="secondary" onClick={onManual}>
              Choose sections manually
            </Button>
          </div>
        )}
        {!noProvider && degradedTurns >= 2 && !sending && (
          <div
            className="rounded-lg p-3 space-y-2 text-sm"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="flex items-center gap-2 font-medium" style={{ color: "var(--text-primary)" }}>
              <AlertTriangle size={14} style={{ color: "var(--accent-color)" }} />
              The AI assistant seems unavailable right now
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={retry}>
                Retry
              </Button>
              <Button size="sm" variant="ghost" onClick={onManual}>
                Choose sections manually
              </Button>
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

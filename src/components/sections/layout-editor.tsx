"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Send, Code, MessageSquare, Save } from "lucide-react";

interface FieldDef {
  key: string;
  label: string;
  type: string;
}

interface LayoutEditorProps {
  slug: string;
  fields: FieldDef[];
  initialHtml: string;
  open: boolean;
  onClose: () => void;
  onSave: (html: string) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function LayoutEditor({ slug, fields, initialHtml, open, onClose, onSave }: LayoutEditorProps) {
  const [html, setHtml] = useState(initialHtml);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Send data to iframe preview
  const updatePreview = useCallback((layoutHtml: string) => {
    if (!iframeRef.current?.contentWindow) return;
    const sampleData: Record<string, unknown> = {};
    const sampleEntries: Record<string, unknown>[] = [];

    // Generate sample data from fields
    for (const f of fields) {
      if (f.type === "number") sampleData[f.key] = Math.floor(Math.random() * 500) + 50;
      else if (f.type === "text") sampleData[f.key] = `Sample ${f.label}`;
      else if (f.type === "boolean") sampleData[f.key] = true;
      else if (f.type === "date") sampleData[f.key] = new Date().toISOString().split("T")[0];
      else if (f.type === "select") sampleData[f.key] = "Option A";
    }

    // Generate 3 sample entries
    for (let i = 0; i < 3; i++) {
      const entry: Record<string, unknown> = {};
      for (const f of fields) {
        if (f.type === "number") entry[f.key] = Math.floor(Math.random() * 500) + 50;
        else if (f.type === "text") entry[f.key] = `Item ${i + 1}`;
        else if (f.type === "boolean") entry[f.key] = i % 2 === 0;
        else entry[f.key] = sampleData[f.key];
      }
      sampleEntries.push(entry);
    }

    iframeRef.current.contentWindow.postMessage({
      type: "render",
      html: layoutHtml,
      data: sampleData,
      entries: sampleEntries,
      fields: fields.map((f) => f.key),
    }, "*");
  }, [fields]);

  useEffect(() => {
    if (open) updatePreview(html);
  }, [open, html, updatePreview]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`/api/sections/templates/${slug}/edit-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userMsg.content, currentHtml: html }),
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();
      setHtml(data.html);
      setMessages((prev) => [...prev, { role: "assistant", content: "Done! Preview updated." }]);
      updatePreview(data.html);
    } catch {
      toast.error("Failed to update layout");
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Try again." }]);
    }

    setLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/sections/templates/${slug}/edit-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentHtml: html, save: true }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Layout saved");
      onSave(html);
      onClose();
    } catch {
      toast.error("Failed to save");
    }
  };

  const previewSrc = `data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<script src="https://cdn.tailwindcss.com"><\/script>
<style>body{background:#0a0a0a;color:#fff;font-family:system-ui;padding:16px;margin:0;}</style>
</head><body>
<div id="root"></div>
<script>
window.addEventListener("message", (e) => {
  if (e.data?.type !== "render") return;
  const { html, data, entries, fields } = e.data;
  let output = html;
  // Expand data-each
  const eachRe = /<([a-z][a-z0-9]*)\\s([^>]*?)data-each="entries"([^>]*)>([\\s\\S]*?)<\\/\\1>/gi;
  if (entries?.length) {
    output = output.replace(eachRe, (_, tag, a1, a2, inner) =>
      entries.map(entry => {
        let r = inner.replace(/\\{entry\\.([^}]+)\\}/g, (_, k) => entry[k] ?? "");
        return "<"+tag+" "+a1+a2+">"+r+"<\/"+tag+">";
      }).join("")
    );
  }
  // Interpolate {expressions}
  output = output.replace(/\\{([^}]+)\\}/g, (_, expr) => {
    expr = expr.trim();
    if (data[expr] !== undefined) return String(data[expr]);
    // Try arithmetic
    const tokens = expr.split(/([+\\-*/])/).map(t => t.trim()).filter(Boolean);
    if (tokens.length > 1) {
      try {
        const safe = tokens.map(t => {
          if (/^\\d+(\\.\\d+)?$/.test(t)) return t;
          if ("+-*/".includes(t)) return t;
          if (data[t] !== undefined) return Number(data[t]);
          return 0;
        }).join(" ");
        return String(Math.round(eval(safe) * 100) / 100);
      } catch { return ""; }
    }
    return "";
  });
  document.getElementById("root").innerHTML = output;
});
<\/script>
</body></html>`)}`;

  return (
    <Modal open={open} onClose={onClose} title="Edit Layout" maxWidth="max-w-4xl">
      <div className="flex gap-0 -mx-6 -mb-6 h-[70vh]">
        {/* Left panel: chat or code */}
        <div className="flex-1 flex flex-col border-r border-[var(--border-subtle)]">
          {/* Toggle */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-subtle)]">
            <Button
              size="sm"
              variant={showCode ? "ghost" : "secondary"}
              onClick={() => setShowCode(false)}
            >
              <MessageSquare size={14} /> Chat
            </Button>
            <Button
              size="sm"
              variant={showCode ? "secondary" : "ghost"}
              onClick={() => setShowCode(true)}
            >
              <Code size={14} /> Code
            </Button>
            <div className="flex-1" />
            <Button size="sm" variant="primary" onClick={handleSave}>
              <Save size={14} /> Save
            </Button>
          </div>

          {showCode ? (
            <textarea
              value={html}
              onChange={(e) => {
                setHtml(e.target.value);
                updatePreview(e.target.value);
              }}
              className="flex-1 bg-transparent p-4 font-mono text-xs resize-none outline-none"
              style={{ color: "var(--text-primary)" }}
              spellCheck={false}
            />
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] text-center mt-8">
                    Describe how you want your section to look. The AI will update the layout.
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-xs p-3 rounded-xl max-w-[85%] ${
                      msg.role === "user"
                        ? "ml-auto surface-inset"
                        : "mr-auto"
                    }`}
                    style={{
                      background: msg.role === "assistant" ? "var(--accent-glow)" : undefined,
                      color: msg.role === "assistant" ? "var(--accent-color)" : "var(--text-primary)",
                    }}
                  >
                    {msg.content}
                  </div>
                ))}
                {loading && (
                  <div className="text-xs text-[var(--text-muted)] animate-pulse">Thinking...</div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-[var(--border-subtle)]">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Describe changes..."
                    className="flex-1 bg-transparent text-sm outline-none"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <Button size="icon" onClick={sendMessage} disabled={loading || !input.trim()}>
                    <Send size={14} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: iframe preview */}
        <div className="flex-1 bg-black">
          <iframe
            ref={iframeRef}
            sandbox="allow-scripts"
            src={previewSrc}
            className="w-full h-full border-0"
            title="Layout preview"
            onLoad={() => updatePreview(html)}
          />
        </div>
      </div>
    </Modal>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useNotesRefresh } from "@/components/notes/notes-screen";

export default function NotesIndexPage() {
  const router = useRouter();
  const refresh = useNotesRefresh();

  const createPage = async () => {
    const res = await fetch("/api/notes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ template: "blank" }),
    });
    if (!res.ok) return;
    const { page } = await res.json();
    refresh();
    router.push(`/notes/${page.id}`);
  };

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <div className="h-full flex items-center justify-center p-8 text-center">
      <div className="max-w-sm">
        <div className="text-5xl mb-4">📝</div>
        <h1 className="text-[22px] font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
          Your notes
        </h1>
        <p className="text-[14px] leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
          Capture ideas, plans, and docs. Pick a page on the left, or start a fresh one — type
          <span className="whitespace-nowrap"> “/” </span> on any line for blocks, headings, callouts, and more.
        </p>
        <button type="button" onClick={createPage}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors"
          style={{ background: "var(--accent-color)", color: "var(--accent-contrast, #fff)" }}>
          <Plus size={16} /> New page
        </button>
        <p className="text-[12px] mt-4" style={{ color: "var(--text-faint)" }}>
          Press <kbd className="px-1.5 py-0.5 rounded border" style={{ borderColor: "var(--border-default)" }}>{isMac ? "⌘" : "Ctrl"} K</kbd> to search or jump to a page.
        </p>
      </div>
    </div>
  );
}

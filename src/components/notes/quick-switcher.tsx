"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { searchPages } from "@/lib/notes/search-pages";
import type { FlatPage } from "@/lib/notes/types";

/** Notion-style quick switcher: fuzzy-jump to any page (Ctrl/Cmd-K). */
export function QuickSwitcher({ pages, onClose }: { pages: FlatPage[]; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const results = useMemo(() => searchPages(pages, query), [pages, query]);

  const go = (id: string) => { onClose(); router.push(`/notes/${id}`); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); const r = results[index]; if (r) go(r.id); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      <button aria-label="Close" className="fixed inset-0 bg-[var(--backdrop-overlay)]" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border overflow-hidden" style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 16px 48px rgba(0,0,0,.18)" }}>
        <input
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
          onKeyDown={onKeyDown}
          placeholder="Jump to a page…"
          className="w-full px-4 py-3 text-[14px] bg-transparent outline-none border-b"
          style={{ color: "var(--text-primary)", borderColor: "var(--border-subtle)" }}
        />
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-[13px]" style={{ color: "var(--text-faint)" }}>No pages found</div>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                type="button"
                onMouseEnter={() => setIndex(i)}
                onClick={() => go(r.id)}
                className="w-full flex items-center gap-2 px-4 py-2 text-left text-[13px]"
                style={{ background: i === index ? "var(--accent-glow)" : undefined, color: i === index ? "var(--accent-color)" : "var(--text-primary)" }}
              >
                <span>{r.icon}</span>
                <span className="truncate">{r.title || "Untitled"}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

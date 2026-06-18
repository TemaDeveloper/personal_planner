"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus } from "lucide-react";
import { searchPages } from "@/lib/notes/search-pages";
import type { FlatPage } from "@/lib/notes/types";

type Hit = { id: string; title: string; icon: string; snippet: string };

/** Notion-style quick switcher: search titles AND content (Ctrl/Cmd-K), or
 * create a new page from the typed query. */
export function QuickSwitcher({ pages, onClose, onCreated }: { pages: FlatPage[]; onClose: () => void; onCreated?: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [loading, setLoading] = useState(false);

  const q = query.trim();

  // Empty query → show recent pages locally. Non-empty → debounced server search.
  const recent = useMemo(() => searchPages(pages, "").slice(0, 8), [pages]);

  useEffect(() => {
    if (!q) { setHits(null); setLoading(false); return; } // eslint-disable-line react-hooks/set-state-in-effect -- reset when query cleared
    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/notes/search?q=${encodeURIComponent(q)}`);
        const data = res.ok ? await res.json() : { results: [] };
        if (!cancelled) { setHits(data.results as Hit[]); setIndex(0); }
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const list: Hit[] = q ? (hits ?? []) : recent.map((p) => ({ id: p.id, title: p.title, icon: p.icon, snippet: "" }));
  const showCreate = q.length > 0;
  const total = list.length + (showCreate ? 1 : 0);

  const go = (id: string) => { onClose(); router.push(`/notes/${id}`); };

  const create = async () => {
    const res = await fetch("/api/notes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: q, template: "blank" }),
    });
    if (!res.ok) return;
    const { page } = await res.json();
    onCreated?.();
    go(page.id);
  };

  const activate = (i: number) => {
    if (showCreate && i === list.length) { create(); return; }
    const r = list[i];
    if (r) go(r.id);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(total - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); activate(index); }
    else if (e.key === "Escape") { e.preventDefault(); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      <button aria-label="Close" className="fixed inset-0 bg-[var(--backdrop-overlay)]" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border overflow-hidden animate-[notesPop_120ms_ease-out]" style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 16px 48px rgba(0,0,0,.18)" }}>
        <div className="flex items-center gap-2 px-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <Search size={16} style={{ color: "var(--text-faint)" }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search pages or type to create…"
            className="flex-1 py-3 text-[14px] bg-transparent outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          {loading && <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>…</span>}
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {!q && (
            <div className="px-4 pt-2 pb-1 text-[11px] uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>Recent</div>
          )}
          {list.map((r, i) => (
            <button
              key={r.id}
              type="button"
              onMouseEnter={() => setIndex(i)}
              onClick={() => go(r.id)}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-left"
              style={{ background: i === index ? "var(--accent-glow)" : undefined }}
            >
              <span className="shrink-0">{r.icon}</span>
              <span className="min-w-0">
                <span className="block truncate text-[13px]" style={{ color: i === index ? "var(--accent-color)" : "var(--text-primary)" }}>{r.title || "Untitled"}</span>
                {r.snippet && <span className="block truncate text-[12px]" style={{ color: "var(--text-faint)" }}>{r.snippet}</span>}
              </span>
            </button>
          ))}
          {q && !loading && list.length === 0 && (
            <div className="px-4 py-2 text-[13px]" style={{ color: "var(--text-faint)" }}>No matches</div>
          )}
          {showCreate && (
            <button
              type="button"
              onMouseEnter={() => setIndex(list.length)}
              onClick={create}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-[13px]"
              style={{ background: index === list.length ? "var(--accent-glow)" : undefined, color: index === list.length ? "var(--accent-color)" : "var(--text-primary)" }}
            >
              <Plus size={16} className="shrink-0" />
              <span className="truncate">Create page <strong>“{q}”</strong></span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

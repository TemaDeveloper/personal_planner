"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import { relativeTime } from "@/lib/notes/relative-time";

type Trashed = { id: string; title: string; icon: string; updatedAt: string | null };

/** Notion-style Trash: list archived pages, restore them, or delete forever. */
export function TrashModal({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<Trashed[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/notes/trash");
    setItems(res.ok ? (await res.json()).pages : []);
  }, []);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- initial data fetch

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const restore = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/notes/${id}/restore`, { method: "POST" });
      if (res.ok) { await load(); onChanged(); }
    } finally { setBusy(null); }
  };

  const purge = async (id: string) => {
    if (!window.confirm("Delete this page and its sub-pages forever? This can't be undone.")) return;
    setBusy(id);
    try {
      const res = await fetch(`/api/notes/${id}?permanent=1`, { method: "DELETE" });
      if (res.ok) {
        await load();
        onChanged();
        if (pathname === `/notes/${id}`) router.push("/notes");
      }
    } finally { setBusy(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
      <button aria-label="Close" className="fixed inset-0 bg-[var(--backdrop-overlay)]" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border overflow-hidden animate-[notesPop_120ms_ease-out]" style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 16px 48px rgba(0,0,0,.18)" }}>
        <div className="px-4 py-3 border-b text-[14px] font-semibold" style={{ borderColor: "var(--border-subtle)", color: "var(--text-primary)" }}>
          Trash
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {items === null ? (
            <div className="px-4 py-3 text-[13px]" style={{ color: "var(--text-faint)" }}>Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-6 text-center text-[13px]" style={{ color: "var(--text-faint)" }}>Trash is empty.</div>
          ) : (
            items.map((p) => (
              <div key={p.id} className="group flex items-center gap-2.5 px-4 py-2">
                <span className="shrink-0">{p.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-[13px]" style={{ color: "var(--text-primary)" }}>{p.title || "Untitled"}</span>
                  {p.updatedAt && <span className="block text-[12px]" style={{ color: "var(--text-faint)" }}>Trashed {relativeTime(p.updatedAt)}</span>}
                </span>
                <button type="button" aria-label="Restore" disabled={busy === p.id} onClick={() => restore(p.id)}
                  className="px-1.5 py-1 rounded-md hover:bg-[var(--surface-raised)] opacity-0 group-hover:opacity-100 disabled:opacity-40" style={{ color: "var(--text-muted)" }}>
                  <RotateCcw size={15} />
                </button>
                <button type="button" aria-label="Delete forever" disabled={busy === p.id} onClick={() => purge(p.id)}
                  className="px-1.5 py-1 rounded-md hover:bg-[var(--surface-raised)] opacity-0 group-hover:opacity-100 disabled:opacity-40" style={{ color: "var(--alert)" }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { buildPageTree } from "@/lib/notes/page-tree";
import type { FlatPage } from "@/lib/notes/types";
import { PageTree } from "./page-tree";

const RefreshCtx = createContext<() => void>(() => {});
export const useNotesRefresh = () => useContext(RefreshCtx);

const PagesCtx = createContext<FlatPage[]>([]);
export const useNotesPages = () => useContext(PagesCtx);

export function NotesScreen({ children }: { children: React.ReactNode }) {
  const [pages, setPages] = useState<FlatPage[]>([]);
  const [drawer, setDrawer] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/notes");
    if (res.ok) setPages((await res.json()).pages);
  }, []);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- initial data fetch

  const tree = buildPageTree(pages);

  return (
    <RefreshCtx.Provider value={load}>
      <PagesCtx.Provider value={pages}>
      <div className="h-full flex">
        <aside className="hidden md:block w-[240px] shrink-0 border-r overflow-y-auto p-3"
          style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}>
          <PageTree tree={tree} onChanged={load} />
        </aside>

        {drawer && (
          <div className="md:hidden fixed inset-0 z-40">
            <button aria-label="Close" className="absolute inset-0 bg-[var(--backdrop-overlay)]" onClick={() => setDrawer(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-[260px] overflow-y-auto p-3 border-r"
              style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}>
              <PageTree tree={tree} onChanged={load} />
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto">
          <button onClick={() => setDrawer(true)} aria-label="Open pages"
            className="md:hidden m-3 inline-flex items-center gap-1.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
            <Menu size={16} /> Pages
          </button>
          {children}
        </main>
      </div>
      </PagesCtx.Provider>
    </RefreshCtx.Provider>
  );
}

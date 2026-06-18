"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [railWidth, setRailWidth] = useState(260);

  const load = useCallback(async () => {
    const res = await fetch("/api/notes");
    if (res.ok) setPages((await res.json()).pages);
  }, []);
  useEffect(() => { load(); }, [load]); // eslint-disable-line react-hooks/set-state-in-effect -- initial data fetch

  // Restore the rail collapsed state + width.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem("lifora.notes.railCollapsed") === "1") {
      setRailCollapsed(true); // eslint-disable-line react-hooks/set-state-in-effect -- one-time hydrate from storage
    }
    const w = Number(window.localStorage.getItem("lifora.notes.railWidth"));
    if (Number.isFinite(w) && w >= 180) setRailWidth(Math.min(480, w));
  }, []);
  const toggleRail = () =>
    setRailCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") window.localStorage.setItem("lifora.notes.railCollapsed", next ? "1" : "0");
      return next;
    });

  // Drag the divider to resize the rail; persist on release.
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = railWidth;
    let latest = startW;
    const onMove = (ev: PointerEvent) => {
      latest = Math.min(480, Math.max(180, startW + (ev.clientX - startX)));
      setRailWidth(latest);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (typeof window !== "undefined") window.localStorage.setItem("lifora.notes.railWidth", String(Math.round(latest)));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const tree = buildPageTree(pages);

  return (
    <RefreshCtx.Provider value={load}>
      <PagesCtx.Provider value={pages}>
      <div className="h-full flex">
        {!railCollapsed && (
          <>
            <aside className="hidden md:flex flex-col shrink-0 border-r overflow-hidden"
              style={{ width: railWidth, borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}>
              <div className="flex items-center justify-end px-2 pt-2 shrink-0">
                <button type="button" onClick={toggleRail} aria-label="Collapse sidebar"
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--surface-raised)]"
                  style={{ color: "var(--text-muted)" }}>
                  <PanelLeftClose size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-3">
                <PageTree tree={tree} onChanged={load} />
              </div>
            </aside>
            {/* Drag to resize the rail */}
            <div
              onPointerDown={startResize}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              className="hidden md:block w-1 shrink-0 cursor-col-resize hover:bg-[var(--accent-color)]"
              style={{ background: "transparent" }}
            />
          </>
        )}

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
          {/* Mobile: open the page drawer */}
          <button onClick={() => setDrawer(true)} aria-label="Open pages"
            className="md:hidden m-3 inline-flex items-center gap-1.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
            <Menu size={16} /> Pages
          </button>
          {/* Desktop: reveal the collapsed rail */}
          {railCollapsed && (
            <button onClick={toggleRail} aria-label="Expand sidebar"
              className="hidden md:inline-flex items-center gap-1.5 text-[13px] m-3" style={{ color: "var(--text-muted)" }}>
              <PanelLeftOpen size={16} /> Pages
            </button>
          )}
          {children}
        </main>
      </div>
      </PagesCtx.Provider>
    </RefreshCtx.Provider>
  );
}

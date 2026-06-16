"use client";

import { createContext, useContext, useEffect, useState } from "react";

const KEY = "lifora.sidebar.collapsed";

type SidebarContext = { collapsed: boolean; toggle: () => void };

const Ctx = createContext<SidebarContext>({ collapsed: false, toggle: () => {} });

/** Tracks the desktop sidebar collapsed/expanded state, persisted to localStorage. */
export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  // Hydrate from storage after mount (avoids SSR/client mismatch).
  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1") {
      setCollapsed(true); // eslint-disable-line react-hooks/set-state-in-effect -- one-time hydrate from storage
    }
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      if (typeof window !== "undefined") window.localStorage.setItem(KEY, next ? "1" : "0");
      return next;
    });

  return <Ctx.Provider value={{ collapsed, toggle }}>{children}</Ctx.Provider>;
}

export const useSidebar = () => useContext(Ctx);

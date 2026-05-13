"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type ColorMode = "light" | "dark" | "system";

interface Preferences {
  accentTheme: string;
  fontStyle: string;
  layoutDensity: string;
  currency: string;
  weekStart: string;
  dateFormat: string;
  timeFormat: string;
  colorMode: ColorMode;
}

interface ThemeContextType {
  preferences: Preferences;
  updatePreferences: (prefs: Partial<Preferences>) => void;
  resolvedColorMode: "light" | "dark";
}

const defaultPreferences: Preferences = {
  accentTheme: "amber",
  fontStyle: "sans",
  layoutDensity: "default",
  currency: "CAD",
  weekStart: "monday",
  dateFormat: "MMM d, yyyy",
  timeFormat: "24h",
  colorMode: "system",
};

const ThemeContext = createContext<ThemeContextType>({
  preferences: defaultPreferences,
  updatePreferences: () => {},
  resolvedColorMode: "dark",
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getResolvedMode(mode: ColorMode): "light" | "dark" {
  if (mode === "system") {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return mode;
}

export function ThemeProvider({
  children,
  initialPreferences,
}: {
  children: React.ReactNode;
  initialPreferences?: Partial<Preferences>;
}) {
  const [preferences, setPreferences] = useState<Preferences>({
    ...defaultPreferences,
    ...initialPreferences,
  });
  const [resolvedColorMode, setResolvedColorMode] = useState<"light" | "dark">(() =>
    getResolvedMode(preferences.colorMode)
  );

  // Apply theme attributes and color mode class
  const applyTheme = useCallback((prefs: Preferences, resolved: "light" | "dark") => {
    const root = document.documentElement;
    root.setAttribute("data-theme", prefs.accentTheme);
    root.setAttribute("data-font", prefs.fontStyle);
    root.setAttribute("data-layout", prefs.layoutDensity);

    if (resolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, []);

  // Initialize and listen for system color scheme changes
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const storedMode = localStorage.getItem("planner-color-mode") as ColorMode | null;
    const storedTheme = localStorage.getItem("planner-theme");
    const storedFont = localStorage.getItem("planner-font");
    const storedLayout = localStorage.getItem("planner-layout");
    setPreferences((prev) => ({
      ...prev,
      ...(storedMode && ["light", "dark", "system"].includes(storedMode) ? { colorMode: storedMode } : {}),
      ...(storedTheme ? { accentTheme: storedTheme } : {}),
      ...(storedFont ? { fontStyle: storedFont } : {}),
      ...(storedLayout ? { layoutDensity: storedLayout } : {}),
    }));

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setPreferences((prev) => {
        if (prev.colorMode === "system") {
          const resolved = mq.matches ? "dark" : "light";
          setResolvedColorMode(resolved);
          applyTheme(prev, resolved);
        }
        return prev;
      });
    };

    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, [applyTheme]);

  // Apply whenever preferences change
  useEffect(() => {
    const resolved = getResolvedMode(preferences.colorMode);
    setResolvedColorMode(resolved);
    applyTheme(preferences, resolved);
  }, [preferences, applyTheme]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const updatePreferences = useCallback((prefs: Partial<Preferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...prefs };
      // Persist to localStorage for FOUC prevention script
      if (prefs.colorMode !== undefined) {
        localStorage.setItem("planner-color-mode", prefs.colorMode);
      }
      if (prefs.accentTheme !== undefined) {
        localStorage.setItem("planner-theme", prefs.accentTheme);
      }
      if (prefs.fontStyle !== undefined) {
        localStorage.setItem("planner-font", prefs.fontStyle);
      }
      if (prefs.layoutDensity !== undefined) {
        localStorage.setItem("planner-layout", prefs.layoutDensity);
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ preferences, updatePreferences, resolvedColorMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

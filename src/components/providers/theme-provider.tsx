"use client";

import { createContext, useContext, useEffect, useState } from "react";

interface Preferences {
  accentTheme: string;
  fontStyle: string;
  layoutDensity: string;
  currency: string;
  weekStart: string;
  dateFormat: string;
  timeFormat: string;
}

interface ThemeContextType {
  preferences: Preferences;
  updatePreferences: (prefs: Partial<Preferences>) => void;
}

const defaultPreferences: Preferences = {
  accentTheme: "amber",
  fontStyle: "sans",
  layoutDensity: "default",
  currency: "CAD",
  weekStart: "monday",
  dateFormat: "MMM d, yyyy",
  timeFormat: "24h",
};

const ThemeContext = createContext<ThemeContextType>({
  preferences: defaultPreferences,
  updatePreferences: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
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

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", preferences.accentTheme);
    root.setAttribute("data-font", preferences.fontStyle);
    root.setAttribute("data-layout", preferences.layoutDensity);
  }, [preferences]);

  const updatePreferences = (prefs: Partial<Preferences>) => {
    setPreferences((prev) => ({ ...prev, ...prefs }));
  };

  return (
    <ThemeContext.Provider value={{ preferences, updatePreferences }}>
      {children}
    </ThemeContext.Provider>
  );
}

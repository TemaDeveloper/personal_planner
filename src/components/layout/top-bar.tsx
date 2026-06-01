"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sun, Moon, Monitor, Menu } from "lucide-react";
import { useTheme } from "@/components/providers/theme-provider";
import { useSections } from "@/components/providers/sections-provider";
import { SECTION_META } from "@/lib/constants";
import type { ColorMode } from "@/lib/constants";
import { MobileMenu } from "./mobile-menu";

const MODE_ICONS = {
  system: Monitor,
  light: Sun,
  dark: Moon,
} as const;

const MODES: ColorMode[] = ["system", "light", "dark"];

function getPageTitle(pathname: string, enabledSections: string[]): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/export") return "Export";
  if (pathname === "/shared") return "Shared with me";

  for (const id of enabledSections) {
    const meta = SECTION_META[id as keyof typeof SECTION_META];
    if (meta && pathname.startsWith(meta.href)) return meta.label;
  }

  if (pathname.startsWith("/sections/")) {
    const slug = pathname.split("/").pop();
    return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "Section";
  }

  return "Planner";
}

export function TopBar() {
  const pathname = usePathname();
  const { preferences, updatePreferences } = useTheme();
  const { enabledSections } = useSections();
  const title = getPageTitle(pathname, enabledSections as string[]);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false); // eslint-disable-line react-hooks/set-state-in-effect -- intentional: close mobile menu on navigation
  }, [pathname]);

  return (
    <>
      <header className="flex items-center justify-between h-13 px-4 md:px-8 border-b border-[var(--border-subtle)] bg-[var(--background)]/80 backdrop-blur-lg sticky top-0 z-30">
        {/* Left: hamburger (mobile) + title */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg hover:bg-[var(--surface-1)] transition-colors"
            aria-label="Toggle menu"
          >
            <Menu size={18} className="text-[var(--text-primary)]" />
          </button>
          <h1 className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </h1>
        </div>

        {/* Right: color mode toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border-subtle)]">
          {MODES.map((mode) => {
            const Icon = MODE_ICONS[mode];
            const isActive = preferences.colorMode === mode;
            return (
              <button
                key={mode}
                onClick={() => updatePreferences({ colorMode: mode })}
                className="relative flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150"
                style={{
                  background: isActive ? "var(--glass-bg)" : undefined,
                  color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: isActive ? "var(--shadow-sm)" : undefined,
                }}
                title={mode.charAt(0).toUpperCase() + mode.slice(1)}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
      </header>

      {/* Mobile dropdown menu */}
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}

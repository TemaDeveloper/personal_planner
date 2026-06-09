"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, Sparkles } from "lucide-react";
import { useSections } from "@/components/providers/sections-provider";
import type { CustomSectionNav } from "@/components/providers/sections-provider";
import { SECTION_META } from "@/lib/constants";
import { MobileMenu } from "./mobile-menu";
import { BottomNav } from "./bottom-nav";
import { Button } from "@/components/ui/button";
import { AiStudio } from "@/components/ai/ai-studio";

function getPageTitle(
  pathname: string,
  enabledSections: string[],
  customSections: CustomSectionNav[],
): string {
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
    // Prefer the section's display name (e.g. "Calendar") over the raw slug,
    // which for calendar sections is `calendar-<userId>`.
    const cs = customSections.find((c) => c.slug === slug);
    if (cs) return cs.name;
    return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "Section";
  }

  return "Lifora";
}

export function TopBar() {
  const pathname = usePathname();
  const { enabledSections, customSections } = useSections();
  const title = getPageTitle(pathname, enabledSections as string[], customSections);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false); // eslint-disable-line react-hooks/set-state-in-effect -- intentional: close mobile menu on navigation
  }, [pathname]);

  return (
    <>
      <header className="flex items-center justify-between h-13 px-4 md:px-8 border-b border-[var(--border-subtle)] bg-[var(--background)] sticky top-0 z-30">
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

        {/* Right: AI Studio trigger */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAiOpen(true)}
            className="gap-1.5 min-w-[44px]"
            style={{
              background: "var(--accent-wash)",
              color: "var(--accent-color)",
            }}
            aria-label="Open AI Studio"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline font-medium">AI</span>
          </Button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* Mobile bottom tab bar */}
      <BottomNav onMoreClick={() => setMenuOpen(true)} />

      {/* AI Studio modal */}
      <AiStudio open={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Settings,
  Download,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useSections } from "@/components/providers/sections-provider";
import { SECTION_META } from "@/lib/constants";
import { ICON_MAP } from "@/lib/icon-map";

const BOTTOM_ITEMS = [
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/export", icon: Download, label: "Export" },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const { enabledSections, customSections } = useSections();

  const NAV_ITEMS = useMemo(() => [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    ...enabledSections.map((id) => ({
      href: SECTION_META[id].href,
      icon: ICON_MAP[SECTION_META[id].icon] || ICON_MAP.Briefcase,
      label: SECTION_META[id].label,
    })),
    ...customSections.filter((cs) => cs.enabled).map((cs) => ({
      href: `/sections/${cs.slug}`,
      icon: ICON_MAP[cs.icon] || ICON_MAP.Star,
      label: cs.name,
    })),
  ], [enabledSections, customSections]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const NavButton = ({
    href,
    icon: Icon,
    label,
  }: {
    href: string;
    icon: React.ComponentType<{ size: number }>;
    label: string;
  }) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group"
        style={{
          background: active ? "var(--accent-glow)" : "transparent",
          border: `1px solid ${active ? "var(--accent-color)" : "transparent"}`,
          color: active ? "var(--accent-color)" : "var(--text-muted)",
        }}
      >
        <span className="flex-shrink-0">
          <Icon size={20} />
        </span>
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="text-sm font-medium overflow-hidden whitespace-nowrap"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    );
  };

  return (
    <aside
      className="hidden md:flex flex-col flex-shrink-0 transition-all duration-300 relative sticky top-0 h-screen"
      style={{
        width: expanded ? 220 : 64,
        background: "var(--surface-1)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ borderBottom: "1px solid var(--border-subtle)", minHeight: 64 }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{
            background: "var(--accent-glow)",
            border: "1px solid var(--accent-color)",
            color: "var(--accent-color)",
          }}
        >
          P
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="font-bold text-sm overflow-hidden whitespace-nowrap"
              style={{ color: "var(--text-primary)" }}
            >
              MyPlanner
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavButton key={item.href} {...item} />
        ))}
      </nav>

      {/* Bottom section */}
      <div
        className="px-2 pb-4 space-y-1 pt-4"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        {BOTTOM_ITEMS.map((item) => (
          <NavButton key={item.href} {...item} />
        ))}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200"
          style={{ color: "var(--text-muted)" }}
        >
          <LogOut size={20} className="flex-shrink-0" />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="text-sm font-medium overflow-hidden whitespace-nowrap"
              >
                Sign out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 z-10"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-muted)",
        }}
      >
        {expanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>
    </aside>
  );
}

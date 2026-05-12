"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MoreHorizontal,
  Settings,
  Download,
  LogOut,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
import { useSections } from "@/components/providers/sections-provider";
import { SECTION_META } from "@/lib/constants";
import { ICON_MAP } from "@/lib/icon-map";

export function MobileNav() {
  const pathname = usePathname();
  const [showSheet, setShowSheet] = useState(false);
  const { enabledSections } = useSections();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const sortedSections = useMemo(() =>
    [...enabledSections].sort(
      (a, b) => SECTION_META[a].mobilePriority - SECTION_META[b].mobilePriority
    ),
    [enabledSections]
  );

  const MAIN_TABS = useMemo(() => [
    { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
    ...sortedSections.slice(0, 3).map((id) => ({
      href: SECTION_META[id].href,
      icon: ICON_MAP[SECTION_META[id].icon] || ICON_MAP.Briefcase,
      label: SECTION_META[id].mobileLabel,
    })),
  ], [sortedSections]);

  const SHEET_ITEMS = useMemo(() => [
    ...sortedSections.slice(3).map((id) => ({
      href: SECTION_META[id].href,
      icon: ICON_MAP[SECTION_META[id].icon] || ICON_MAP.Briefcase,
      label: SECTION_META[id].label,
    })),
    { href: "/settings", icon: Settings, label: "Settings" },
    { href: "/export", icon: Download, label: "Export" },
  ], [sortedSections]);

  const moreActive = SHEET_ITEMS.some((item) => isActive(item.href));

  return (
    <>
      {/* Bottom sheet */}
      <AnimatePresence>
        {showSheet && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 z-40 bg-[var(--backdrop-overlay)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSheet(false)}
            />
            <motion.div
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl overflow-hidden"
              style={{
                background: "var(--surface-3)",
                backdropFilter: "blur(32px) saturate(180%)",
                WebkitBackdropFilter: "blur(32px) saturate(180%)",
                maxHeight: "60vh",
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-8 h-1 rounded-full bg-[var(--text-muted)] opacity-40" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pb-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">More</p>
                <button
                  onClick={() => setShowSheet(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--surface-1)] transition-colors"
                >
                  <X size={16} className="text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Items */}
              <div className="px-3 pb-6 space-y-0.5 overflow-y-auto">
                {SHEET_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowSheet(false)}
                    className="flex items-center gap-3 px-3 h-11 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      color: isActive(item.href) ? "var(--accent-color)" : "var(--text-muted)",
                      background: isActive(item.href) ? "var(--accent-glow)" : undefined,
                    }}
                  >
                    <item.icon size={18} />
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => {
                    setShowSheet(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="w-full flex items-center gap-3 px-3 h-11 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-1)] transition-colors"
                >
                  <LogOut size={18} />
                  Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom tab bar */}
      <div
        className="md:hidden flex items-center justify-around px-2 h-14 z-50 border-t border-[var(--border-subtle)]"
        style={{
          background: "var(--surface-3)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {MAIN_TABS.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors"
              style={{
                color: active ? "var(--accent-color)" : "var(--text-muted)",
              }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
                style={{
                  background: active ? "var(--accent-glow)" : undefined,
                }}
              >
                <item.icon size={20} />
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setShowSheet(!showSheet)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors"
          style={{
            color: moreActive ? "var(--accent-color)" : "var(--text-muted)",
          }}
        >
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full transition-colors"
            style={{
              background: moreActive ? "var(--accent-glow)" : undefined,
            }}
          >
            <MoreHorizontal size={20} />
          </div>
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </>
  );
}

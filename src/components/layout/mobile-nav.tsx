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
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { signOut } from "next-auth/react";
import { useSections } from "@/components/providers/sections-provider";
import { SECTION_META } from "@/lib/constants";
import { ICON_MAP } from "@/lib/icon-map";

export function MobileNav() {
  const pathname = usePathname();
  const [showMore, setShowMore] = useState(false);
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

  const MORE_ITEMS = useMemo(() => [
    ...sortedSections.slice(3).map((id) => ({
      href: SECTION_META[id].href,
      icon: ICON_MAP[SECTION_META[id].icon] || ICON_MAP.Briefcase,
      label: SECTION_META[id].label,
    })),
    { href: "/settings", icon: Settings, label: "Settings" },
    { href: "/export", icon: Download, label: "Export" },
  ], [sortedSections]);

  const moreActive = MORE_ITEMS.some((item) => isActive(item.href));

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="md:hidden fixed bottom-16 right-2 z-50 rounded-xl overflow-hidden"
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="p-2 space-y-1 min-w-[160px]">
              {MORE_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    color: isActive(item.href)
                      ? "var(--accent-color)"
                      : "var(--text-muted)",
                  }}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  setShowMore(false);
                  signOut({ callbackUrl: "/login" });
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      {showMore && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* Bottom tab bar */}
      <div
        className="md:hidden flex items-center justify-around px-2 py-2 z-50"
        style={{
          background: "var(--surface-1)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        {MAIN_TABS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-200"
            style={{
              color: isActive(item.href)
                ? "var(--accent-color)"
                : "var(--text-muted)",
            }}
          >
            <item.icon size={20} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all duration-200"
          style={{
            color: moreActive ? "var(--accent-color)" : "var(--text-muted)",
          }}
        >
          <MoreHorizontal size={20} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </>
  );
}

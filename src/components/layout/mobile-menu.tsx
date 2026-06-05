"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
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

interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const pathname = usePathname();
  const { enabledSections, customSections } = useSections();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const sectionItems = useMemo(
    () => [
      ...enabledSections.map((id) => ({
        href: SECTION_META[id].href,
        icon: ICON_MAP[SECTION_META[id].icon] || ICON_MAP.Briefcase,
        label: SECTION_META[id].label,
      })),
      ...customSections
        .filter((cs) => cs.enabled)
        .map((cs) => ({
          href: `/sections/${cs.slug}`,
          icon: ICON_MAP[cs.icon] || ICON_MAP.Star,
          label: cs.name,
        })),
    ],
    [enabledSections, customSections]
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="md:hidden fixed inset-0 z-40 bg-[var(--backdrop-overlay)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />

          {/* Dropdown panel */}
          <motion.div
            className="md:hidden fixed top-13 left-0 right-0 z-50 overflow-hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            <div
              className="mx-3 rounded-2xl border border-[var(--border-subtle)] overflow-hidden"
              style={{
                background: "var(--surface-3)",
                maxHeight: "70vh",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-4 pb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Menu
                </p>
                <button
                  onClick={onClose}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--surface-1)] transition-colors"
                  aria-label="Close menu"
                >
                  <X size={16} className="text-[var(--text-muted)]" />
                </button>
              </div>

              {/* Nav items */}
              <div className="px-3 pb-2 overflow-y-auto" style={{ maxHeight: "calc(70vh - 100px)" }}>
                {/* Dashboard */}
                <MenuLink
                  href="/dashboard"
                  icon={LayoutDashboard}
                  label="Dashboard"
                  active={isActive("/dashboard")}
                  onClick={onClose}
                />

                {/* Divider */}
                <div className="my-2 mx-2 border-t border-[var(--border-subtle)]" />

                {/* Sections */}
                {sectionItems.map((item) => (
                  <MenuLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    active={isActive(item.href)}
                    onClick={onClose}
                  />
                ))}

                {/* Divider */}
                <div className="my-2 mx-2 border-t border-[var(--border-subtle)]" />

                {/* Bottom items */}
                <MenuLink
                  href="/settings"
                  icon={Settings}
                  label="Settings"
                  active={isActive("/settings")}
                  onClick={onClose}
                />
                <MenuLink
                  href="/export"
                  icon={Download}
                  label="Export"
                  active={isActive("/export")}
                  onClick={onClose}
                />

                {/* Sign out */}
                <button
                  onClick={() => {
                    onClose();
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-1)] transition-colors"
                >
                  <LogOut size={18} className="flex-shrink-0" />
                  <span>Sign out</span>
                </button>
              </div>

              {/* Bottom padding */}
              <div className="h-2" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="relative flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-colors min-w-0"
      style={{
        background: active ? "var(--accent-glow)" : undefined,
        color: active ? "var(--accent-color)" : "var(--text-muted)",
      }}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-[var(--accent-color)]" />
      )}
      <Icon size={18} className="flex-shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Settings,
  Download,
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
  const { enabledSections, customSections } = useSections();

  const sectionItems = useMemo(() => [
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

  return (
    <aside className="hidden md:flex flex-col flex-shrink-0 w-60 sticky top-0 h-screen border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-[var(--sidebar-border)]">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-extrabold bg-[var(--accent-color)] text-primary-foreground"
          style={{ boxShadow: "0 0 16px var(--accent-glow)" }}
        >
          P
        </div>
        <span className="font-semibold text-sm text-[var(--text-primary)]">
          Planner
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* Home */}
        <NavGroup label="Home">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" active={isActive("/dashboard")} />
        </NavGroup>

        {/* Sections */}
        {sectionItems.length > 0 && (
          <NavGroup label="Sections">
            {sectionItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={isActive(item.href)}
              />
            ))}
          </NavGroup>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 pt-2 border-t border-[var(--sidebar-border)] space-y-0.5">
        {BOTTOM_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isActive(item.href)}
          />
        ))}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-1)] transition-colors"
        >
          <LogOut size={18} className="flex-shrink-0" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <div className="space-y-0.5">
        {children}
      </div>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="relative flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium transition-colors"
      style={{
        background: active ? "var(--accent-glow)" : undefined,
        color: active ? "var(--accent-color)" : "var(--text-muted)",
      }}
    >
      {active && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full bg-[var(--accent-color)]"
        />
      )}
      <Icon size={18} className="flex-shrink-0" />
      <span>{label}</span>
    </Link>
  );
}

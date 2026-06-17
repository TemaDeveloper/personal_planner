"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  CalendarDays,
  NotebookPen,
  Settings,
  Download,
  LogOut,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useSections } from "@/components/providers/sections-provider";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { SECTION_META } from "@/lib/constants";
import type { SectionId } from "@/lib/constants";
import { ICON_MAP } from "@/lib/icon-map";
import { LiforaLogo } from "@/components/brand/lifora-logo";

const BOTTOM_ITEMS = [
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/export", icon: Download, label: "Export" },
];

// Life-area grouping
const LIFE_AREA_GROUPS: { label: string; ids: SectionId[] }[] = [
  { label: "Money", ids: ["work", "finances"] },
  { label: "Body",  ids: ["gym", "health", "habits"] },
  { label: "Mind",  ids: ["study", "reading", "journal", "goals"] },
  { label: "Home",  ids: ["housework", "shopping", "mealprep", "hobbies"] },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { enabledSections, customSections } = useSections();
  const { collapsed, toggle } = useSidebar();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  // Build grouped sections — only include groups with at least one enabled section
  const lifeAreaGroups = useMemo(() =>
    LIFE_AREA_GROUPS
      .map((group) => ({
        label: group.label,
        items: group.ids
          .filter((id) => enabledSections.includes(id))
          .map((id) => ({
            href: SECTION_META[id].href,
            icon: ICON_MAP[SECTION_META[id].icon] || ICON_MAP.Briefcase,
            label: SECTION_META[id].label,
          })),
      }))
      .filter((group) => group.items.length > 0),
    [enabledSections]
  );

  // The default calendar section is pinned directly under "Today" (not in Custom).
  const calendarSection = useMemo(
    () => customSections.find((cs) => cs.enabled && cs.slug.startsWith("calendar-")),
    [customSections]
  );

  // Custom (AI) sections — everything except the pinned calendar.
  const customItems = useMemo(() =>
    customSections
      .filter((cs) => cs.enabled && !cs.slug.startsWith("calendar-"))
      .map((cs) => ({
        href: `/sections/${cs.slug}`,
        icon: ICON_MAP[cs.icon] || ICON_MAP.Star,
        label: cs.name,
      })),
    [customSections]
  );

  return (
    <aside className={`hidden md:flex flex-col flex-shrink-0 sticky top-0 h-screen border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] transition-[width] duration-200 ${collapsed ? "w-16" : "w-60"}`}>
      {/* Logo + collapse toggle */}
      <div className={`flex items-center h-14 border-b border-[var(--sidebar-border)] ${collapsed ? "justify-center px-2" : "gap-3 px-5"}`}>
        {!collapsed && (
          <>
            <LiforaLogo size={26} className="flex-shrink-0" />
            <span className="font-semibold text-sm text-[var(--text-primary)] flex-1">
              Lifora
            </span>
          </>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-1)] transition-colors flex-shrink-0"
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Main nav */}
      <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-4 ${collapsed ? "px-2" : "px-3"}`}>
        {/* Today + Calendar — pinned at top */}
        <div className="mb-4 space-y-0.5">
          <NavItem
            href="/dashboard"
            icon={LayoutDashboard}
            label="Today"
            active={isActive("/dashboard")}
          />
          {calendarSection && (
            <NavItem
              href={`/sections/${calendarSection.slug}`}
              icon={CalendarDays}
              label="Calendar"
              active={isActive(`/sections/${calendarSection.slug}`)}
            />
          )}
          <NavItem
            href="/notes"
            icon={NotebookPen}
            label="Notes"
            active={isActive("/notes")}
          />
        </div>

        {/* Life-area groups */}
        {lifeAreaGroups.map((group) => (
          <NavGroup key={group.label} label={group.label}>
            {group.items.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={isActive(item.href)}
              />
            ))}
          </NavGroup>
        ))}

        {/* Custom (AI) sections */}
        {customItems.length > 0 && (
          <NavGroup label="Custom">
            {customItems.map((item) => (
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

        {/* Shared */}
        <NavGroup label="Shared">
          <NavItem href="/shared" icon={Users} label="Shared with me" active={isActive("/shared")} />
        </NavGroup>
      </nav>

      {/* Bottom section */}
      <div className={`pb-4 pt-2 border-t border-[var(--sidebar-border)] space-y-0.5 ${collapsed ? "px-2" : "px-3"}`}>
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
          aria-label="Sign out"
          title={collapsed ? "Sign out" : undefined}
          className={`w-full flex items-center h-9 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-1)] transition-colors ${collapsed ? "justify-center px-0" : "gap-3 px-3"}`}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  return (
    <div className="mb-4">
      {collapsed ? (
        <div className="mx-2 mb-1 border-t border-[var(--sidebar-border)]" />
      ) : (
        <p className="stat-label px-3 mb-1" style={{ color: "var(--text-faint)" }}>
          {label}
        </p>
      )}
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
  const { collapsed } = useSidebar();
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={`relative flex items-center h-9 rounded-lg text-sm font-medium transition-colors min-w-0 ${collapsed ? "justify-center px-0" : "gap-3 px-3"}`}
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
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

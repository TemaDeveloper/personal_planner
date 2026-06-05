"use client";

import { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  DollarSign,
  Dumbbell,
  GraduationCap,
  MoreHorizontal,
} from "lucide-react";
import { useSections } from "@/components/providers/sections-provider";
import type { SectionId } from "@/lib/constants";
import { SECTION_META } from "@/lib/constants";

// Money group section order — pick first enabled one as the tab target
const MONEY_IDS: SectionId[] = ["work", "finances"];
// Body group
const BODY_IDS: SectionId[] = ["gym", "health", "habits"];
// Mind group
const MIND_IDS: SectionId[] = ["study", "reading", "journal", "goals"];

interface BottomNavProps {
  onMoreClick: () => void;
}

export function BottomNav({ onMoreClick }: BottomNavProps) {
  const pathname = usePathname();
  const { enabledSections } = useSections();

  const moneyHref = useMemo(
    () => MONEY_IDS.find((id) => enabledSections.includes(id))
      ? SECTION_META[MONEY_IDS.find((id) => enabledSections.includes(id))!].href
      : "/work",
    [enabledSections]
  );

  const bodyHref = useMemo(
    () => BODY_IDS.find((id) => enabledSections.includes(id))
      ? SECTION_META[BODY_IDS.find((id) => enabledSections.includes(id))!].href
      : "/gym",
    [enabledSections]
  );

  const mindHref = useMemo(
    () => MIND_IDS.find((id) => enabledSections.includes(id))
      ? SECTION_META[MIND_IDS.find((id) => enabledSections.includes(id))!].href
      : "/study",
    [enabledSections]
  );

  // Active detection: a tab is active if the current path starts with any id in its group
  const moneyActive = MONEY_IDS.some((id) => pathname.startsWith(SECTION_META[id].href));
  const bodyActive  = BODY_IDS.some((id) => pathname.startsWith(SECTION_META[id].href));
  const mindActive  = MIND_IDS.some((id) => pathname.startsWith(SECTION_META[id].href));
  const todayActive = pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border-subtle)]"
      style={{ background: "var(--surface-3)" }}
    >
      <div className="flex items-stretch h-[56px]">
        <BottomTab
          href="/dashboard"
          icon={LayoutDashboard}
          label="Today"
          active={todayActive}
        />
        <BottomTab
          href={moneyHref}
          icon={DollarSign}
          label="Money"
          active={moneyActive}
        />
        <BottomTab
          href={bodyHref}
          icon={Dumbbell}
          label="Body"
          active={bodyActive}
        />
        <BottomTab
          href={mindHref}
          icon={GraduationCap}
          label="Mind"
          active={mindActive}
        />
        {/* More — opens mobile menu */}
        <button
          onClick={onMoreClick}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors"
          style={{ color: "var(--text-muted)" }}
          aria-label="More navigation options"
        >
          <MoreHorizontal size={20} />
          <span className="text-[10px] font-medium tracking-wide">More</span>
        </button>
      </div>
      {/* Safe-area spacer for notched phones */}
      <div className="h-[env(safe-area-inset-bottom,0px)]" />
    </nav>
  );
}

function BottomTab({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ComponentType<{ size: number }>;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 min-h-[44px] transition-colors active:scale-95"
      style={{ color: active ? "var(--accent-color)" : "var(--text-muted)" }}
    >
      <Icon size={20} />
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </Link>
  );
}

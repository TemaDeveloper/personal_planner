"use client";

import { usePathname } from "next/navigation";

/**
 * Wraps the main content area. The calendar section renders full-bleed (fills the
 * whole content area, internal scrolling); every other route keeps the centered,
 * padded, max-width column.
 */
export function ContentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const fullBleed = !!pathname && pathname.includes("/sections/calendar-");

  if (fullBleed) {
    return <div className="flex-1 min-h-0 overflow-hidden">{children}</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 md:px-8 md:py-6">
      <div className="max-w-6xl mx-auto">{children}</div>
    </div>
  );
}

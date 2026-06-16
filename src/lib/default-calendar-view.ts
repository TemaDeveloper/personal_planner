import type { CalView } from "@/components/calendar/calendar-header";

/** Mobile opens single-day (narrow screen); desktop keeps the week view. */
export function pickDefaultCalendarView(isMobile: boolean): CalView {
  return isMobile ? "day" : "week";
}

import { eachDayOfInterval } from "date-fns";
import { monthGridRange } from "@/lib/calendar";

/** A month as an array of Mon-started weeks (each a 7-Date array). */
export function buildMiniMonth(monthCursor: Date): Date[][] {
  const { start, end } = monthGridRange(monthCursor);
  const days = eachDayOfInterval({ start, end });
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

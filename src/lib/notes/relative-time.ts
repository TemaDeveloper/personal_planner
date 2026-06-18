/** Notion-style compact "edited" label: "just now", "5m ago", "3h ago", "2d ago",
 * else an absolute date. `now` is injectable for deterministic tests. */
export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = now - then;
  if (diff < 0) return "just now";

  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;

  const d = new Date(then);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString(undefined, sameYear
    ? { month: "short", day: "numeric" }
    : { year: "numeric", month: "short", day: "numeric" });
}

/**
 * Converts a Date to its "yyyy-MM-dd" calendar-day key using UTC getters.
 *
 * Date-only fields throughout this app are stored as UTC midnight of the
 * intended calendar day (e.g. the string "2026-01-15" parses to
 * 2026-01-15T00:00:00.000Z). Reading such a value back with local-timezone
 * getters (as date-fns' format() does) can shift the key by a day whenever
 * the process isn't running in UTC. Using UTC getters keeps the key
 * independent of the server's local timezone.
 */
export function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the [start, end] instants spanning the UTC calendar month
 * containing `d`. Using date-fns' startOfMonth/endOfMonth here would use the
 * server process's local timezone, which can shift the queried range by a
 * day (or onto the wrong month entirely) relative to UTC-anchored dates.
 */
export function utcMonthRange(d: Date): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)),
    end: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)),
  };
}

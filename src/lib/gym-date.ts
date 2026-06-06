// Timezone-independent calendar-date handling for gym attendance.
//
// An attendance "day key" is a plain calendar date string (`yyyy-MM-dd`) with no
// timezone. It is persisted as UTC midnight of that date so that writes and reads
// round-trip to the same calendar day regardless of the user's or server's
// timezone. Using local-time conversions (e.g. date-fns `startOfDay` + `format`)
// shifts UTC-midnight dates by a day in any non-UTC timezone, which is the bug
// this module exists to prevent.

/** Parse a day key (or any ISO string) into a Date at UTC midnight of that calendar date. */
export function toUtcMidnight(dayKey: string): Date {
  const day = dayKey.slice(0, 10);
  return new Date(`${day}T00:00:00.000Z`);
}

/** Derive the UTC calendar-date key (`yyyy-MM-dd`) from a stored ISO string or Date. */
export function attendanceDateKey(value: string | Date): string {
  const iso = typeof value === "string" ? value : value.toISOString();
  return iso.slice(0, 10);
}

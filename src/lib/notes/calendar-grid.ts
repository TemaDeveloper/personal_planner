/** Build a 6-week month grid (Mon-first) of ISO date strings (yyyy-mm-dd),
 * including leading/trailing days from adjacent months. Pure + deterministic. */
export function monthMatrix(year: number, month: number): string[][] {
  const first = new Date(Date.UTC(year, month, 1));
  // JS getUTCDay: 0=Sun..6=Sat → convert to Mon-first (0=Mon..6=Sun).
  const lead = (first.getUTCDay() + 6) % 7;
  const start = new Date(Date.UTC(year, month, 1 - lead));
  const weeks: string[][] = [];
  const cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row: string[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(row);
  }
  return weeks;
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Group row indices by the yyyy-mm-dd of a date-typed cell value. */
export function indexByDay<T extends { cells: Record<string, unknown> }>(rows: T[], dateProp: string | undefined): Map<string, T[]> {
  const map = new Map<string, T[]>();
  if (!dateProp) return map;
  for (const row of rows) {
    const v = row.cells[dateProp];
    if (!v) continue;
    const day = String(v).slice(0, 10);
    (map.get(day) ?? map.set(day, []).get(day)!).push(row);
  }
  return map;
}

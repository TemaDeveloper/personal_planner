/** Pixels per hour in the week/day time grid. */
export const HOUR_HEIGHT = 48;
/** Minutes the grid snaps to. */
export const SNAP_MINUTES = 30;

const SNAP = SNAP_MINUTES / 60; // 0.5

/** Round an hour value to the nearest snap step, clamped to [0, 24]. */
export function snapHour(h: number): number {
  const snapped = Math.round(h / SNAP) * SNAP;
  return Math.max(0, Math.min(24, snapped));
}

/** Convert a vertical pixel offset (from grid top) to a snapped hour. */
export function hourAtOffset(offsetY: number, hourHeight: number = HOUR_HEIGHT): number {
  return snapHour(offsetY / hourHeight);
}

/** Ensure start<=end with a minimum 30-min duration, kept inside [0,24]. */
export function clampRange(start: number, end: number): { start: number; end: number } {
  let s = Math.max(0, Math.min(24, start));
  let e = Math.max(0, Math.min(24, end));
  if (e < s) e = s;
  if (e - s < SNAP) e = s + SNAP;
  if (e > 24) {
    e = 24;
    if (e - s < SNAP) s = 24 - SNAP;
  }
  return { start: s, end: e };
}

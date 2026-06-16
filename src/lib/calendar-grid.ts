/** Pixels per hour in the week/day time grid (default zoom level). */
export const HOUR_HEIGHT = 80;
/** Zoom bounds for the time grid (px per hour). */
export const MIN_HOUR_HEIGHT = 32;
export const MAX_HOUR_HEIGHT = 160;

/** Clamp a desired hour-height to the allowed zoom range, rounded to whole px. */
export function clampHourHeight(px: number): number {
  return Math.max(MIN_HOUR_HEIGHT, Math.min(MAX_HOUR_HEIGHT, Math.round(px)));
}

/** Apply a zoom factor (>1 zoom in, <1 zoom out) to a height, clamped. */
export function zoomedHeight(current: number, factor: number): number {
  return clampHourHeight(current * factor);
}
/** Minutes the grid snaps to. */
export const SNAP_MINUTES = 30;

const SNAP = SNAP_MINUTES / 60; // 0.5

/** Fine step (minutes) used for the LIVE drag so it follows the cursor smoothly. */
export const DRAG_SNAP_MINUTES = 5;

/** Round an hour value to the nearest `stepMin`-minute step, clamped to [0, 24]. */
export function snapHour(h: number, stepMin: number = SNAP_MINUTES): number {
  const totalMin = Math.round((h * 60) / stepMin) * stepMin;
  return Math.max(0, Math.min(1440, totalMin)) / 60;
}

/** Convert a vertical pixel offset (from grid top) to a snapped hour. */
export function hourAtOffset(offsetY: number, hourHeight: number = HOUR_HEIGHT, stepMin: number = SNAP_MINUTES): number {
  return snapHour(offsetY / hourHeight, stepMin);
}

/** Convert a vertical pixel offset to a RAW (unsnapped) hour, clamped to [0, 24]. */
export function rawHourAtOffset(offsetY: number, hourHeight: number = HOUR_HEIGHT): number {
  return Math.max(0, Math.min(24, offsetY / hourHeight));
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

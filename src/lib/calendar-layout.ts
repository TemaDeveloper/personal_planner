/** Shared layout constants so the day header, all-day strip, and time-grid body
 * always share one column system (prevents horizontal drift). */
export const TIME_LABEL_WIDTH = 56;

/** CSS grid-template-columns: a fixed time-label column + N equal day columns.
 * `minmax(0, 1fr)` lets columns shrink so content never forces unequal widths. */
export function gridTemplate(days: number): string {
  return `${TIME_LABEL_WIDTH}px repeat(${days}, minmax(0, 1fr))`;
}

/** Tailwind classes that reserve the scrollbar gutter identically on every row,
 * so the reserved space matches the scrolling body. */
export const GUTTER_CLASS = "[scrollbar-gutter:stable] overflow-y-scroll";

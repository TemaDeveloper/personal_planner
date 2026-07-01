import type { ComputedValue } from "./primitives";

export interface FormattedComputed {
  text: string;
  /** true when the value should be shown in an alert/warning style. */
  warn: boolean;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Deterministic, display-ready rendering of a computed value. */
export function formatComputed(cv: ComputedValue): FormattedComputed {
  switch (cv.kind) {
    case "net":
      return { text: cv.value.toFixed(2), warn: cv.value < 0 };
    case "pace_eta": {
      const r = cv.value;
      if (r.done) return { text: "Reached", warn: false };
      if (r.eta === null || r.weeksRemaining === null) {
        return { text: "No ETA at current pace", warn: true };
      }
      return { text: `${r.weeksRemaining} wk → ${isoDate(r.eta)}`, warn: false };
    }
    case "ceiling": {
      const r = cv.value;
      return r.ok
        ? { text: `${r.remaining} left`, warn: false }
        : { text: `Over by ${r.over}`, warn: true };
    }
  }
}

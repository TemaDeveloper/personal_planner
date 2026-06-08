export type LayoutEvent = { id: string; start: Date; end: Date };

export type LayoutOptions = {
  dayStart: Date; // 00:00 of the column's day
  hourHeight: number; // px per hour
  minHeight?: number; // px floor for very short events (default 12)
};

export type PositionedEvent = {
  id: string;
  top: number; // px from grid top
  height: number; // px
  left: number; // fraction 0..1
  width: number; // fraction 0..1
};

const HOUR_MS = 3_600_000;

/**
 * Position timed events for a single day column. Overlapping events are packed
 * into equal-width columns (interval-graph greedy packing); back-to-back events
 * (a.end === b.start) do NOT overlap.
 */
export function layoutDayEvents(
  events: LayoutEvent[],
  opts: LayoutOptions
): PositionedEvent[] {
  const minHeight = opts.minHeight ?? 12;
  const dayStartMs = opts.dayStart.getTime();

  const vertical = (ev: LayoutEvent) => {
    const top = ((ev.start.getTime() - dayStartMs) / HOUR_MS) * opts.hourHeight;
    const rawHeight =
      ((ev.end.getTime() - ev.start.getTime()) / HOUR_MS) * opts.hourHeight;
    return { top, height: Math.max(rawHeight, minHeight) };
  };

  const sorted = [...events].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime()
  );

  const result: PositionedEvent[] = [];
  let cluster: LayoutEvent[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const colEnd: number[] = []; // end time per column
    const colOf = new Map<string, number>();
    for (const ev of cluster) {
      let placed = false;
      for (let i = 0; i < colEnd.length; i++) {
        if (colEnd[i] <= ev.start.getTime()) {
          colOf.set(ev.id, i);
          colEnd[i] = ev.end.getTime();
          placed = true;
          break;
        }
      }
      if (!placed) {
        colOf.set(ev.id, colEnd.length);
        colEnd.push(ev.end.getTime());
      }
    }
    const total = colEnd.length;
    for (const ev of cluster) {
      const col = colOf.get(ev.id)!;
      result.push({ id: ev.id, ...vertical(ev), left: col / total, width: 1 / total });
    }
    cluster = [];
  };

  for (const ev of sorted) {
    if (cluster.length && ev.start.getTime() >= clusterEnd) {
      flush();
      clusterEnd = -Infinity;
    }
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.end.getTime());
  }
  flush();

  return result;
}

"use client";

import { useCallback, useState } from "react";
import { HOUR_HEIGHT, clampHourHeight, zoomedHeight } from "@/lib/calendar-grid";

export const HOUR_HEIGHT_KEY = "lifora.calendar.hourHeight";

/** Hour-height (px) for the time grid, persisted to localStorage. */
export function useHourHeight(): [number, (px: number) => void, (factor: number) => void] {
  const [height, setHeightState] = useState<number>(() => {
    if (typeof window === "undefined") return HOUR_HEIGHT;
    const raw = window.localStorage.getItem(HOUR_HEIGHT_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? clampHourHeight(parsed) : HOUR_HEIGHT;
  });

  const setHeight = useCallback((px: number) => {
    const next = clampHourHeight(px);
    setHeightState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(HOUR_HEIGHT_KEY, String(next));
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setHeightState((prev) => {
      const next = zoomedHeight(prev, factor);
      if (typeof window !== "undefined") window.localStorage.setItem(HOUR_HEIGHT_KEY, String(next));
      return next;
    });
  }, []);

  return [height, setHeight, zoomBy];
}

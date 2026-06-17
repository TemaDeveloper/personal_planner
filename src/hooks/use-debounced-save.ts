"use client";

import { useCallback, useEffect, useRef } from "react";

/** Returns a stable callback that debounces `save` by `delayMs`. */
export function useDebouncedSave<T>(save: (value: T) => void, delayMs = 600): (value: T) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return useCallback((value: T) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveRef.current(value), delayMs);
  }, [delayMs]);
}

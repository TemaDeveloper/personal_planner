"use client";

import { useEffect, useState } from "react";
import { isSameDay } from "date-fns";

/**
 * Returns the current date as a reactive value. Polls once a minute and only
 * triggers a re-render when the calendar day actually rolls over, so "today"
 * highlights (calendar circles, gym/habit cells) move without a page refresh.
 */
export function useToday(): Date {
  const [today, setToday] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => {
      setToday((prev) => {
        const now = new Date();
        return isSameDay(prev, now) ? prev : now;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  return today;
}

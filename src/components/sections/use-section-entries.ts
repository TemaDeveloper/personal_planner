"use client";

import { useEffect, useState, useCallback } from "react";

export interface SectionEntry {
  _id: string;
  date: string;
  data: Record<string, unknown>;
}

export interface SectionFieldDef {
  key: string;
  label: string;
  type: "boolean" | "number" | "text" | "select" | "date";
  options?: string[];
  formula?: string;
  computation?: import("@/lib/compute/primitives").FieldComputation;
}

/** Fetch all entries for a section (self-contained views use this). */
export function useSectionEntries(slug: string) {
  const [entries, setEntries] = useState<SectionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load — fetch inside the effect, set state only after the promise.
  useEffect(() => {
    let active = true;
    fetch(`/api/sections/${slug}/entries?all=1`)
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          setEntries(d.entries || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  // Silent background refetch — no loading flip (avoids blanking the whole view
  // to "Loading…" on every add/delete) and swallows transient errors.
  const refresh = useCallback(() => {
    fetch(`/api/sections/${slug}/entries?all=1`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => {});
  }, [slug]);

  return { entries, loading, refresh };
}

/** Entries oldest→newest by date (for streaks, trends). */
export function sortByDateAsc(entries: SectionEntry[]): SectionEntry[] {
  return [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToday } from "../use-today";

describe("useToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current date on mount", () => {
    vi.setSystemTime(new Date("2026-06-13T10:00:00"));
    const { result } = renderHook(() => useToday());
    expect(result.current.getDate()).toBe(13);
  });

  it("does not change identity while the day stays the same", () => {
    vi.setSystemTime(new Date("2026-06-13T10:00:00"));
    const { result } = renderHook(() => useToday());
    const first = result.current;

    act(() => {
      vi.setSystemTime(new Date("2026-06-13T10:30:00"));
      vi.advanceTimersByTime(60_000);
    });

    // Same calendar day -> same Date object reference, no needless re-render.
    expect(result.current).toBe(first);
  });

  it("updates when the calendar day rolls over", () => {
    vi.setSystemTime(new Date("2026-06-13T23:59:30"));
    const { result } = renderHook(() => useToday());
    expect(result.current.getDate()).toBe(13);

    act(() => {
      vi.setSystemTime(new Date("2026-06-14T00:00:30"));
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.getDate()).toBe(14);
  });
});

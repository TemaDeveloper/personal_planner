import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useHourHeight, HOUR_HEIGHT_KEY } from "@/hooks/use-hour-height";
import { HOUR_HEIGHT, MAX_HOUR_HEIGHT } from "@/lib/calendar-grid";

afterEach(cleanup);
beforeEach(() => localStorage.clear());

describe("useHourHeight", () => {
  it("defaults to HOUR_HEIGHT when nothing stored", () => {
    const { result } = renderHook(() => useHourHeight());
    expect(result.current[0]).toBe(HOUR_HEIGHT);
  });
  it("reads a persisted value", () => {
    localStorage.setItem(HOUR_HEIGHT_KEY, "96");
    const { result } = renderHook(() => useHourHeight());
    expect(result.current[0]).toBe(96);
  });
  it("zoomBy scales, clamps, and persists", () => {
    const { result } = renderHook(() => useHourHeight());
    act(() => result.current[2](2)); // zoom in
    expect(result.current[0]).toBe(128);
    expect(localStorage.getItem(HOUR_HEIGHT_KEY)).toBe("128");
    act(() => result.current[2](100)); // clamps to max
    expect(result.current[0]).toBe(MAX_HOUR_HEIGHT);
  });
});

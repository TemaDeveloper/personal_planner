import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useDebouncedSave } from "@/hooks/use-debounced-save";

afterEach(cleanup);

describe("useDebouncedSave", () => {
  it("fires the save once after rapid calls", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const { result } = renderHook(() => useDebouncedSave(save, 600));
    act(() => { result.current("a"); result.current("b"); result.current("c"); });
    expect(save).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(600); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("c");
    vi.useRealTimers();
  });
});

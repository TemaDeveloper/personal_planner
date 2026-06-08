// src/components/auth/__tests__/shard-field.test.tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { ShardField } from "../shard-field";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // remove any matchMedia we stubbed onto window
  // @ts-expect-error allow deleting the test stub
  delete window.matchMedia;
});

// A no-op 2D context stub good enough for the drawing calls the component makes.
function fakeCtx() {
  return {
    setTransform: vi.fn(),
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
}

function stubMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
}

describe("ShardField", () => {
  it("renders a canvas that is hidden from assistive tech and ignores pointers", () => {
    const { container } = render(<ShardField />);
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(canvas).toHaveStyle({ pointerEvents: "none" });
  });

  it("degrades gracefully when no 2D context is available (no throw)", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const raf = vi.spyOn(window, "requestAnimationFrame");
    expect(() => render(<ShardField />)).not.toThrow();
    expect(raf).not.toHaveBeenCalled();
  });

  it("does NOT animate when prefers-reduced-motion is set (renders a static frame)", () => {
    stubMatchMedia(true);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeCtx());
    const raf = vi.spyOn(window, "requestAnimationFrame");
    render(<ShardField />);
    expect(raf).not.toHaveBeenCalled();
  });

  it("animates when motion is allowed", () => {
    stubMatchMedia(false);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeCtx());
    const raf = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
    render(<ShardField />);
    expect(raf).toHaveBeenCalledTimes(1);
  });

  it("cancels animation and removes listeners on unmount", () => {
    stubMatchMedia(false);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(fakeCtx());
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(7);
    const cancel = vi.spyOn(window, "cancelAnimationFrame");
    const removeWin = vi.spyOn(window, "removeEventListener");
    const removeDoc = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<ShardField />);
    unmount();
    expect(cancel).toHaveBeenCalledWith(7);
    expect(removeWin).toHaveBeenCalledWith("resize", expect.any(Function));
    expect(removeDoc).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });
});

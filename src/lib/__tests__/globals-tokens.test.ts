// src/lib/__tests__/globals-tokens.test.ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("Editorial Calm token layer", () => {
  it("uses the warm canvas background", () => {
    expect(css).toContain("--background: #F7F6F3");
  });

  it("uses the clay brand accent (not the old green)", () => {
    expect(css).toContain("--primary: #C0613C");
    expect(css).not.toContain("#22C55E");
  });

  it("defines muted semantic tokens", () => {
    expect(css).toContain("--good:");
    expect(css).toContain("--warn:");
    expect(css).toContain("--alert:");
  });

  it("removes glassmorphism defaults from the card surface", () => {
    // surface-card must not blur the backdrop anymore
    const surfaceCardBlock = css.slice(css.indexOf(".surface-card {"), css.indexOf(".surface-card {") + 400);
    expect(surfaceCardBlock).not.toContain("backdrop-filter");
  });

  it("removes the ambient decorative animations", () => {
    expect(css).not.toContain("pulse-glow");
    expect(css).not.toContain("animate-shimmer");
  });

  it("provides a tabular-figures utility", () => {
    expect(css).toContain(".num");
    expect(css).toContain("tabular-nums");
  });
});

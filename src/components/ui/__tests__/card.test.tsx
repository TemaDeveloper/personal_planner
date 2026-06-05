// src/components/ui/__tests__/card.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Card } from "../card";

afterEach(cleanup);

describe("Card", () => {
  it("renders children", () => {
    render(<Card>hello</Card>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("uses the flat surface-card class by default", () => {
    const { container } = render(<Card>x</Card>);
    expect(container.firstChild).toHaveClass("surface-card");
  });

  it("interactive cards do NOT scale on hover (no layout shift)", () => {
    const { container } = render(<Card interactive>x</Card>);
    expect((container.firstChild as HTMLElement).className).not.toContain("hover:scale");
  });
});

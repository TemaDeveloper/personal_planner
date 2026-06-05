// src/components/ui/__tests__/stat-block.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { StatBlock } from "../stat-block";

afterEach(cleanup);

describe("StatBlock", () => {
  it("renders the label and value", () => {
    render(<StatBlock label="This week" value="$1,240" />);
    expect(screen.getByText("This week")).toBeInTheDocument();
    expect(screen.getByText("$1,240")).toBeInTheDocument();
  });

  it("applies tabular figures to the value", () => {
    render(<StatBlock label="Hours" value="31.5" />);
    expect(screen.getByText("31.5").className).toContain("num");
  });

  it("renders an optional sub line", () => {
    render(<StatBlock label="Earned" value="$1,240" sub="3 jobs · 31.5h" />);
    expect(screen.getByText("3 jobs · 31.5h")).toBeInTheDocument();
  });

  it("applies the hero size class for size=hero", () => {
    const { container } = render(<StatBlock label="Net" value="+$3,160" size="hero" />);
    expect(container.querySelector(".stat-value")?.className).toContain("text-5xl");
  });
});

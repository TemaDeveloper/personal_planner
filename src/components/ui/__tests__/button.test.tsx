// src/components/ui/__tests__/button.test.tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Button } from "../button";

afterEach(cleanup);

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("primary uses the clay bg-primary token", () => {
    render(<Button variant="primary">Go</Button>);
    expect(screen.getByRole("button").className).toContain("bg-primary");
  });

  it("keeps a tactile active press", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button").className).toContain("active:scale-[0.98]");
  });

  it("uses rounded-md token radius for md size", () => {
    render(<Button size="md">Go</Button>);
    expect(screen.getByRole("button").className).toContain("rounded-md");
  });
});

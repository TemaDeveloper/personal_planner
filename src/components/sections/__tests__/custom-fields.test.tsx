// src/components/sections/__tests__/custom-fields.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { SectionCustomFields } from "../custom-fields";

afterEach(cleanup);

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Mock framer-motion (ToggleSwitch uses it)
vi.mock("framer-motion", () => ({
  motion: {
    span: ({ children, ...rest }: React.HTMLAttributes<HTMLSpanElement>) => (
      <span {...rest}>{children}</span>
    ),
  },
}));

function mockFetch(data: unknown, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(data),
  });
}

describe("SectionCustomFields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when extraFields is empty", async () => {
    global.fetch = mockFetch({ extraFields: [], values: {}, dateKey: "2026-06-06" });

    const { container } = render(<SectionCustomFields sectionKey="gym" />);
    // Wait for effect to settle
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(container.firstChild).toBeNull();
  });

  it("renders a card titled 'Additional fields' when fields are present", async () => {
    global.fetch = mockFetch({
      extraFields: [{ key: "temp", label: "Temperature", type: "number" }],
      values: { temp: 36.6 },
      dateKey: "2026-06-06",
    });

    render(<SectionCustomFields sectionKey="gym" />);
    await screen.findByText("Additional fields");
    expect(screen.getByText("Temperature")).toBeInTheDocument();
  });

  it("renders a number input for a number field", async () => {
    global.fetch = mockFetch({
      extraFields: [{ key: "steps", label: "Steps", type: "number" }],
      values: { steps: 5000 },
      dateKey: "2026-06-06",
    });

    render(<SectionCustomFields sectionKey="health" />);
    await screen.findByText("Additional fields");
    const input = screen.getByDisplayValue("5000");
    expect(input).toHaveAttribute("type", "number");
  });

  it("renders a text input for a text field", async () => {
    global.fetch = mockFetch({
      extraFields: [{ key: "note", label: "Note", type: "text" }],
      values: { note: "feeling good" },
      dateKey: "2026-06-06",
    });

    render(<SectionCustomFields sectionKey="gym" />);
    await screen.findByText("Additional fields");
    const input = screen.getByDisplayValue("feeling good");
    expect(input).toHaveAttribute("type", "text");
  });

  it("renders a toggle for a boolean field", async () => {
    global.fetch = mockFetch({
      extraFields: [{ key: "rested", label: "Rested", type: "boolean" }],
      values: { rested: true },
      dateKey: "2026-06-06",
    });

    render(<SectionCustomFields sectionKey="gym" />);
    await screen.findByText("Additional fields");
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("renders a select for a select field with options", async () => {
    global.fetch = mockFetch({
      extraFields: [
        {
          key: "mood",
          label: "Mood",
          type: "select",
          options: ["great", "ok", "bad"],
        },
      ],
      values: { mood: "ok" },
      dateKey: "2026-06-06",
    });

    render(<SectionCustomFields sectionKey="gym" />);
    await screen.findByText("Additional fields");
    const select = screen.getByDisplayValue("ok");
    expect(select.tagName.toLowerCase()).toBe("select");
  });

  it("POSTs a value when a toggle is changed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            extraFields: [{ key: "rested", label: "Rested", type: "boolean" }],
            values: { rested: false },
            dateKey: "2026-06-06",
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ saved: {} }),
      });
    global.fetch = fetchMock;

    render(<SectionCustomFields sectionKey="gym" />);
    await screen.findByText("Additional fields");

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const [, postCall] = fetchMock.mock.calls;
      expect(postCall[0]).toContain("/custom-fields");
      expect(postCall[1]?.method).toBe("POST");
      const body = JSON.parse(postCall[1]?.body as string);
      expect(body.fieldKey).toBe("rested");
      expect(body.value).toBe(true);
    });
  });

  it("renders nothing and does not throw when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { container } = render(<SectionCustomFields sectionKey="gym" />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
    expect(container.firstChild).toBeNull();
  });
});

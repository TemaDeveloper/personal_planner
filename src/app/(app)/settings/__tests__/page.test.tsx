import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import SettingsPage from "../page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/components/providers/theme-provider", () => ({
  useTheme: () => ({
    preferences: {
      accentTheme: "amber",
      fontStyle: "sans",
      layoutDensity: "default",
      currency: "USD",
      weekStart: "monday",
      dateFormat: "MMM d, yyyy",
      timeFormat: "24h",
      colorMode: "system",
    },
    updatePreferences: vi.fn(),
  }),
}));
vi.mock("@/components/providers/sections-provider", () => ({
  useSections: () => ({
    enabledSections: [],
    customSections: [],
    updateSections: vi.fn(),
    updateCustomSections: vi.fn(),
  }),
}));

import { toast } from "sonner";

describe("SettingsPage", () => {
  beforeEach(() => {
    global.fetch = vi.fn((url: string) => {
      if (url === "/api/user/preferences") {
        return Promise.reject(new Error("network error"));
      }
      return Promise.resolve({ ok: true, json: async () => ({ shares: [] }) });
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("clears the loading skeleton and surfaces an error when the preferences fetch fails", async () => {
    render(<SettingsPage />);

    // Loaded-branch-only content must not be present while loading.
    expect(screen.queryByText("Personalize your planner")).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByText("Personalize your planner")).toBeInTheDocument()
    );
    expect(toast.error).toHaveBeenCalledWith("Failed to load settings");
  });
});

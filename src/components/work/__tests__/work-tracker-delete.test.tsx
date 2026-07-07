import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { WorkTracker } from "../work-tracker";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { toast } from "sonner";

const mockRefresh = vi.fn();

const baseProps = {
  jobName: "Cafe",
  hourlyRate: 15,
  weeklyTarget: 20,
  enableExpenseTracking: true,
  todayHours: 0,
  weekHours: 0,
  monthHours: 0,
  sessions: [{ _id: "s1", date: "2026-01-01", hours: 4, note: "", jobName: "Cafe" }],
  expenses: [{ _id: "e1", date: "2026-01-01", amount: 10, currency: "USD", description: "Gas", category: "other", reimbursed: false }],
  routes: [{ _id: "r1", date: "2026-01-01", origin: "A", destination: "B", distanceKm: 5, note: "" }],
  gasPrice: 1,
  carConsumption: 5,
  currency: "USD",
};

describe("WorkTracker delete handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const cases = [
    { label: "Delete session", tab: null },
    { label: "Delete expense", tab: "Expenses" },
    { label: "Delete route", tab: "Routes & Gas" },
  ];

  for (const { label, tab } of cases) {
    const openTab = () => {
      if (tab) fireEvent.click(screen.getByRole("button", { name: tab }));
    };

    it(`shows an error toast and does not refresh when ${label.toLowerCase()} fails`, async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
      render(<WorkTracker {...baseProps} />);
      openTab();
      fireEvent.click(screen.getByLabelText(label));
      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.success).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it(`shows a success toast and refreshes when ${label.toLowerCase()} succeeds`, async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
      render(<WorkTracker {...baseProps} />);
      openTab();
      fireEvent.click(screen.getByLabelText(label));
      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      expect(toast.error).not.toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
    });

    it(`shows an error toast when the ${label.toLowerCase()} fetch rejects`, async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error("network error")) as unknown as typeof fetch;
      render(<WorkTracker {...baseProps} />);
      openTab();
      fireEvent.click(screen.getByLabelText(label));
      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(mockRefresh).not.toHaveBeenCalled();
    });
  }
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { AddJobButton } from "../add-job-button";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("AddJobButton", () => {
  beforeEach(() => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("blocks submit on a duplicate name without calling the API", async () => {
    render(<AddJobButton existingJobNames={["Cafe"]} />);
    fireEvent.click(screen.getByRole("button", { name: /add job/i }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "cafe" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("PATCHes the appended jobs array for a valid job", async () => {
    render(<AddJobButton existingJobNames={["Cafe"]} />);
    fireEvent.click(screen.getByRole("button", { name: /add job/i }));
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: "Bar" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/user/preferences",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
    const patchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.find(
      (c) => c[1]?.method === "PATCH",
    );
    const body = JSON.parse(patchCall![1].body);
    expect(body.workConfig.jobs.map((j: { name: string }) => j.name)).toEqual(["Bar"]);
  });
});

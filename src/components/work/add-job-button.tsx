"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { validateNewJob } from "@/lib/work/validate-new-job";

export function AddJobButton({ existingJobNames }: { existingJobNames: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [hourlyRate, setHourlyRate] = useState("0");
  const [weeklyTarget, setWeeklyTarget] = useState("20");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setHourlyRate("0");
    setWeeklyTarget("20");
    setError(null);
  }

  async function submit() {
    setError(null);
    const result = validateNewJob(existingJobNames, {
      name,
      hourlyRate: Number(hourlyRate),
      weeklyTarget: Number(weeklyTarget),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSaving(true);
    try {
      // Load the full current jobs list so we never drop jobs we weren't passed.
      const cur = await fetch("/api/user/preferences").then((r) => r.json());
      const jobs = cur?.workConfig?.jobs ?? [];
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workConfig: { jobs: [...jobs, result.job] } }),
      });
      if (!res.ok) {
        setError("Could not add job. Please try again.");
        return;
      }
      toast.success("Job added");
      setOpen(false);
      reset();
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add job
      </Button>

      <Modal open={open} onClose={() => { setOpen(false); reset(); }} title="Add job">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="job-name" className="stat-label">Name</label>
            <input
              id="job-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="job-rate" className="stat-label">Hourly rate</label>
            <input
              id="job-rate"
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] num focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="job-target" className="stat-label">Weekly target (hours)</label>
            <input
              id="job-target"
              type="number"
              value={weeklyTarget}
              onChange={(e) => setWeeklyTarget(e.target.value)}
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] num focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
            />
          </div>
          {error && (
            <p className="text-xs text-[var(--alert)] bg-[var(--alert-wash)] rounded-md px-3 py-2">{error}</p>
          )}
          <Button variant="primary" size="md" onClick={submit} disabled={saving} className="w-full">
            {saving ? "Adding…" : "Add"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

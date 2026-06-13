export interface NewJobInput {
  name: string;
  hourlyRate: number;
  weeklyTarget: number;
}

export interface NewJob extends NewJobInput {
  active: boolean;
  enableExpenseTracking: boolean;
}

export type ValidateNewJobResult =
  | { ok: true; job: NewJob }
  | { ok: false; error: string };

/**
 * Validate a quick-add job against existing job names. Names must be non-empty
 * and case-insensitively unique (job detail pages route on name.toLowerCase()).
 */
export function validateNewJob(
  existingNames: string[],
  candidate: NewJobInput,
): ValidateNewJobResult {
  const name = candidate.name.trim();
  if (!name) return { ok: false, error: "Job name is required." };

  const taken = existingNames.some(
    (n) => n.trim().toLowerCase() === name.toLowerCase(),
  );
  if (taken) return { ok: false, error: "A job with that name already exists." };

  return {
    ok: true,
    job: {
      name,
      hourlyRate: Number.isFinite(candidate.hourlyRate) ? candidate.hourlyRate : 0,
      weeklyTarget: Number.isFinite(candidate.weeklyTarget) ? candidate.weeklyTarget : 20,
      active: true,
      enableExpenseTracking: false,
    },
  };
}

# Add Job In-Section + AI Honest-Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a direct "+ Add job" action inside the Work section, and make the AI Update path return an honest message for built-in-feature requests instead of fabricating a junk custom field.

**Architecture:** Part 1 is pure client UI + a testable pure validation helper, persisting through the existing `PATCH /api/user/preferences`. Part 2 widens the builtin-field AI contract to allow an `{ unsupported, message }` response, threaded through schema → parser → route → AI Studio UI.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Zod, Mongoose, Vitest + Testing Library.

**Note:** CI gates on lint. Run `npm run lint` before any push (build passing ≠ lint passing).

---

### Task 1: `validateNewJob` pure helper

**Files:**
- Create: `src/lib/work/validate-new-job.ts`
- Test: `src/lib/work/__tests__/validate-new-job.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { validateNewJob } from "../validate-new-job";

describe("validateNewJob", () => {
  it("rejects an empty name", () => {
    const r = validateNewJob([], { name: "  ", hourlyRate: 0, weeklyTarget: 20 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/name/i);
  });

  it("rejects a case-insensitive duplicate name", () => {
    const r = validateNewJob(["Cafe"], { name: "cafe", hourlyRate: 10, weeklyTarget: 15 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/already/i);
  });

  it("normalizes a valid candidate with defaults", () => {
    const r = validateNewJob(["Cafe"], { name: "  Bar ", hourlyRate: 12, weeklyTarget: 20 });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.job).toEqual({
        name: "Bar",
        hourlyRate: 12,
        weeklyTarget: 20,
        active: true,
        enableExpenseTracking: false,
      });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/work/__tests__/validate-new-job.test.ts`
Expected: FAIL — cannot find module `../validate-new-job`.

- [ ] **Step 3: Write minimal implementation**

```ts
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

export function validateNewJob(
  existingNames: string[],
  candidate: NewJobInput,
): ValidateNewJobResult {
  const name = candidate.name.trim();
  if (!name) return { ok: false, error: "Job name is required." };

  const taken = existingNames.some((n) => n.trim().toLowerCase() === name.toLowerCase());
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/work/__tests__/validate-new-job.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/work/validate-new-job.ts src/lib/work/__tests__/validate-new-job.test.ts
git commit -m "feat(work): add validateNewJob helper"
```

---

### Task 2: `AddJobButton` client component + wire into Work page

**Files:**
- Create: `src/components/work/add-job-button.tsx`
- Test: `src/components/work/__tests__/add-job-button.test.tsx`
- Modify: `src/app/(app)/work/page.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AddJobButton } from "../add-job-button";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("AddJobButton", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
  });
  afterEach(() => vi.restoreAllMocks());

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
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(
      "/api/user/preferences",
      expect.objectContaining({ method: "PATCH" }),
    ));
    const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
    expect(body.workConfig.jobs.map((j: { name: string }) => j.name)).toEqual(["Bar"]);
  });
});
```

Note: the component fetches the current full jobs list before appending (so it never clobbers existing jobs it wasn't given in full). The test asserts the new job is present; existing jobs come from the GET. To keep the test simple, the component appends to the jobs it loads from `GET /api/user/preferences` — mock returns `{}` so jobs defaults to `[]`, giving `["Bar"]`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/work/__tests__/add-job-button.test.tsx`
Expected: FAIL — cannot find module `../add-job-button`.

- [ ] **Step 3: Write minimal implementation**

```tsx
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
    setName(""); setHourlyRate("0"); setWeeklyTarget("20"); setError(null);
  }

  async function submit() {
    setError(null);
    const result = validateNewJob(existingJobNames, {
      name,
      hourlyRate: Number(hourlyRate),
      weeklyTarget: Number(weeklyTarget),
    });
    if (!result.ok) { setError(result.error); return; }

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
      if (!res.ok) { setError("Could not add job. Please try again."); return; }
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
              id="job-name" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="job-rate" className="stat-label">Hourly rate</label>
            <input
              id="job-rate" type="number" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)}
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] num focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="job-target" className="stat-label">Weekly target (hours)</label>
            <input
              id="job-target" type="number" value={weeklyTarget} onChange={(e) => setWeeklyTarget(e.target.value)}
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/work/__tests__/add-job-button.test.tsx`
Expected: PASS (2 tests). If the Button renders a `<button>` and Modal renders children only when `open`, both selectors resolve.

- [ ] **Step 5: Wire into the Work page**

Modify `src/app/(app)/work/page.tsx`:
- Add import: `import { AddJobButton } from "@/components/work/add-job-button";`
- Compute `const jobNames = (user?.workConfig?.jobs ?? []).map((j: { name: string }) => j.name);`
- In `<PageHeader action={...}>`, wrap Export + the new button:

```tsx
action={
  <div className="flex items-center gap-2">
    <AddJobButton existingJobNames={jobNames} />
    <a href="/api/export/work" download className="p-2 rounded-lg hover:bg-[var(--surface-1)] transition-colors text-[var(--text-muted)] inline-flex" aria-label="Export to Excel">
      <Download size={16} />
    </a>
  </div>
}
```

- Replace the empty-state "Go to Settings" block's CTA with the same button (jobs is empty here, so pass `[]`):

```tsx
<div className="text-center -mt-6 pb-2">
  <AddJobButton existingJobNames={[]} />
</div>
```

- [ ] **Step 6: Verify lint + tests**

Run: `npm run lint && npx vitest run src/components/work src/lib/work`
Expected: 0 errors; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/work src/app/\(app\)/work/page.tsx
git commit -m "feat(work): in-section Add job button"
```

---

### Task 3: Widen builtin-field AI contract (schema + parser + prompt)

**Files:**
- Modify: `src/lib/validations.ts:218-220`
- Modify: `src/lib/ai-section-update.ts:13-30`
- Test: `src/lib/__tests__/ai-section-update.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { parseExtraFieldsResponse } from "../ai-section-update";

describe("parseExtraFieldsResponse", () => {
  it("parses the extraFields form", () => {
    const r = parseExtraFieldsResponse('{"extraFields":[{"key":"tips","label":"Tips","type":"number"}]}');
    expect("extraFields" in r && r.extraFields?.[0].key).toBe("tips");
  });

  it("parses the unsupported form", () => {
    const r = parseExtraFieldsResponse('{"unsupported":true,"message":"Use the + Add job button."}');
    expect(r.unsupported).toBe(true);
    expect(r.message).toMatch(/add job/i);
  });

  it("throws on malformed JSON", () => {
    expect(() => parseExtraFieldsResponse("not json")).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/ai-section-update.test.ts`
Expected: FAIL — the `unsupported` case fails schema validation (only `extraFields` allowed today).

- [ ] **Step 3: Widen the schema**

In `src/lib/validations.ts`, replace the `extraFieldsUpdateSchema` definition (lines 218-220):

```ts
export const extraFieldsUpdateSchema = z
  .object({
    extraFields: z.array(fieldDefSchema).max(20).optional(),
    unsupported: z.boolean().optional(),
    message: z.string().max(300).optional(),
  })
  .refine((d) => d.unsupported === true || Array.isArray(d.extraFields), {
    message: "must include extraFields or set unsupported",
  });
```

- [ ] **Step 4: Update the prompt**

In `src/lib/ai-section-update.ts`, replace `buildBuiltinFieldPrompt` body (lines 13-21):

```ts
export function buildBuiltinFieldPrompt(sectionLabel: string, current: FieldDef[], userPrompt: string): string {
  return [
    `You manage EXTRA custom fields added to the "${sectionLabel}" section of a personal planner.`,
    `You cannot change the section's built-in features (for example: jobs on Work, subjects on Study, the core trackers) — only this list of extra custom fields.`,
    `Current extra fields: ${JSON.stringify(current)}.`,
    `User request: "${userPrompt}".`,
    `If the request is about adding/removing/editing a BUILT-IN feature rather than an extra custom field, do NOT invent a field. Instead return JSON: { "unsupported": true, "message": "<one short sentence telling the user where to do it>" }. For Work jobs the message must tell them to use the "+ Add job" button on the Work page; for other built-ins, point them to Settings.`,
    `Otherwise return the COMPLETE updated list as JSON: { "extraFields": FieldDef[] }. Keep existing fields unless the request removes/renames them. ${FIELD_RULES}`,
  ].join("\n");
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/ai-section-update.test.ts`
Expected: PASS (3 tests). (`parseExtraFieldsResponse` already returns `extraFieldsUpdateSchema.parse(...)`; no change needed there since the schema now accepts both forms.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/validations.ts src/lib/ai-section-update.ts src/lib/__tests__/ai-section-update.test.ts
git commit -m "feat(ai): allow builtin-field update to signal unsupported"
```

---

### Task 4: Route handles the `unsupported` response

**Files:**
- Modify: `src/app/api/ai/update/route.ts` (builtin branch, ~lines 70-90)

- [ ] **Step 1: Update the builtin branch**

Replace the builtin block that calls `generateBuiltinFieldUpdate` so it short-circuits on `unsupported`:

```ts
if (resolved.kind === "builtin") {
  const existing = await SectionCustomization.findOne({ userId, sectionKey: resolved.sectionKey }).lean();
  const label = SECTION_META[resolved.sectionKey as SectionId]?.label ?? resolved.sectionKey;

  const update = await generateBuiltinFieldUpdate(label, existing?.extraFields ?? [], prompt);

  if (update.unsupported) {
    return NextResponse.json({
      kind: "builtin",
      unsupported: true,
      message: update.message?.trim() ||
        `That isn't an AI change for ${label}. Add it directly on the ${label} page or in Settings.`,
    });
  }

  const fields = validateExtraFields(update.extraFields ?? []);
  const saved = await SectionCustomization.findOneAndUpdate(
    { userId, sectionKey: resolved.sectionKey },
    { $set: { extraFields: fields, sourcePrompt: prompt } },
    { upsert: true, new: true },
  ).lean();

  return NextResponse.json({ kind: "builtin", customization: saved });
}
```

- [ ] **Step 2: Verify build/lint**

Run: `npm run lint`
Expected: 0 errors. (`update.extraFields` is now optional, so the `?? []` guard is required and TypeScript is satisfied by the widened type.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/update/route.ts
git commit -m "feat(ai): surface unsupported message from builtin update route"
```

---

### Task 5: AI Studio surfaces the `unsupported` message

**Files:**
- Modify: `src/components/ai/ai-studio.tsx` (`handleUpdate`, ~lines 245-267)

- [ ] **Step 1: Handle the flag in `handleUpdate`**

After `const data = await res.json();` and the `if (!res.ok)` block, add before the success path:

```ts
if (data.unsupported) {
  setError(data.message ?? "That change isn't supported here.");
  return;
}
```

(This reuses the existing error feedback box and keeps the modal open. The `finally` block already clears `loading`.)

- [ ] **Step 2: Verify lint + full test run**

Run: `npm run lint && npx vitest run`
Expected: 0 lint errors; all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/ai/ai-studio.tsx
git commit -m "feat(ai): show unsupported-change message in AI Studio"
```

---

## Self-Review

- **Spec coverage:** Part 1 (in-section button, modal fields, PATCH reuse, unique-name validation, testable helper) → Tasks 1–2. Part 2 (prompt, schema/parser, route, AI Studio surfacing) → Tasks 3–5. Testing section → tests in Tasks 1, 2, 3. ✅
- **Placeholder scan:** No TBD/TODO; all steps contain real code and commands. ✅
- **Type consistency:** `validateNewJob` returns `{ ok, job }`/`{ ok, error }` used identically in Task 2. `extraFieldsUpdateSchema` widened in Task 3 with optional `extraFields` is consumed with `?? []` in Tasks 3–4. `update.unsupported`/`update.message` used consistently across Tasks 3–5. Response shape `{ unsupported, message }` produced in Task 4, consumed in Task 5. ✅

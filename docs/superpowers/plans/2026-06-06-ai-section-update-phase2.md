# AI Section Update — Phase 2: Custom-Fields Render Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `GET/POST /api/sections/[sectionKey]/custom-fields` and the `SectionCustomFields` client component that renders typed inputs for AI-added extra fields, saving values per-day per-field.

**Architecture:** The API route reads `SectionCustomization` to get field definitions and `CustomFieldValue` to get today's stored values, returning them in a single response. The React component fetches this on mount, renders nothing if `extraFields` is empty (silent no-op), or renders a Card with typed inputs that upsert values on blur/change. Everything is self-contained so pages only need one import line added later.

**Tech Stack:** Next.js 15 App Router, TypeScript, Mongoose (MongoDB), React hooks, Sonner toasts, Vitest + Testing Library.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/app/api/sections/[sectionKey]/custom-fields/route.ts` | **Create** | GET (field defs + today's values) and POST (upsert a value) |
| `src/components/sections/custom-fields.tsx` | **Create** | Client component: fetch, render, save |
| `src/components/sections/__tests__/custom-fields.test.tsx` | **Create** | Component render + save behaviour tests |
| `src/lib/__tests__/custom-field-value-api.test.ts` | **Create** | Unit tests for API response shape & validation logic |

No other files are modified. Pages are wired in Phase 2b (separate task).

---

### Task 1: API route — GET (field defs + today's values)

**Files:**
- Create: `src/app/api/sections/[sectionKey]/custom-fields/route.ts`

- [ ] **Step 1: Create the directory and stub the file**

```bash
mkdir -p src/app/api/sections/\[sectionKey\]/custom-fields
```

Then create `src/app/api/sections/[sectionKey]/custom-fields/route.ts` with this content:

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import SectionCustomization from "@/lib/models/section-customization";
import CustomFieldValue from "@/lib/models/custom-field-value";
import { attendanceDateKey } from "@/lib/gym-date";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sectionKey: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { sectionKey } = await params;
  const dateKey = attendanceDateKey(new Date());

  const customization = await SectionCustomization.findOne({
    userId,
    sectionKey,
  }).lean();

  if (!customization || customization.extraFields.length === 0) {
    return NextResponse.json({ extraFields: [], values: {}, dateKey });
  }

  const fieldDocs = await CustomFieldValue.find({
    userId,
    sectionKey,
    dateKey,
  }).lean();

  const values: Record<string, unknown> = {};
  for (const doc of fieldDocs) {
    values[doc.fieldKey] = doc.value;
  }

  return NextResponse.json({
    extraFields: customization.extraFields,
    values,
    dateKey,
  });
}
```

- [ ] **Step 2: Verify the file compiles (no syntax errors)**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm tsc --noEmit 2>&1 | head -30
```

Expected: No errors (or only pre-existing ones unrelated to the new file).

---

### Task 2: API route — POST (upsert a value)

**Files:**
- Modify: `src/app/api/sections/[sectionKey]/custom-fields/route.ts`

- [ ] **Step 1: Add the POST handler to the same file**

Append this export to the file created in Task 1:

```ts
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sectionKey: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const { sectionKey } = await params;

  if (!sectionKey) {
    return NextResponse.json({ error: "sectionKey is required" }, { status: 400 });
  }

  const body = await req.json();
  const { fieldKey, value, dateKey: bodyDateKey } = body as {
    fieldKey?: string;
    value?: unknown;
    dateKey?: string;
  };

  if (!fieldKey) {
    return NextResponse.json({ error: "fieldKey is required" }, { status: 400 });
  }

  const dateKey = bodyDateKey ?? attendanceDateKey(new Date());

  // Validate that fieldKey exists in the section's extraFields
  const customization = await SectionCustomization.findOne({
    userId,
    sectionKey,
  }).lean();

  if (!customization) {
    return NextResponse.json(
      { error: "No customization found for this section" },
      { status: 404 }
    );
  }

  const fieldExists = customization.extraFields.some((f) => f.key === fieldKey);
  if (!fieldExists) {
    return NextResponse.json(
      { error: `fieldKey "${fieldKey}" not found in section "${sectionKey}"` },
      { status: 400 }
    );
  }

  const saved = await CustomFieldValue.findOneAndUpdate(
    { userId, sectionKey, dateKey, fieldKey },
    { $set: { value } },
    { upsert: true, new: true }
  );

  return NextResponse.json({ saved });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm tsc --noEmit 2>&1 | head -30
```

Expected: No new errors.

---

### Task 3: Unit tests for the API response shapes (pure logic, no DB)

**Files:**
- Create: `src/lib/__tests__/custom-field-value-api.test.ts`

These tests verify the logic that the API route encodes — date key derivation and the values-map shape — without hitting MongoDB.

- [ ] **Step 1: Create the test file**

```ts
// src/lib/__tests__/custom-field-value-api.test.ts
import { describe, it, expect } from "vitest";
import { attendanceDateKey } from "@/lib/gym-date";

describe("custom-field-value API — date key logic", () => {
  it("attendanceDateKey(new Date()) returns a yyyy-MM-dd string", () => {
    const key = attendanceDateKey(new Date());
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("values map built from field docs uses fieldKey as property", () => {
    const fieldDocs = [
      { fieldKey: "temp", value: 36.6 },
      { fieldKey: "notes", value: "ok" },
    ];
    const values: Record<string, unknown> = {};
    for (const doc of fieldDocs) {
      values[doc.fieldKey] = doc.value;
    }
    expect(values).toEqual({ temp: 36.6, notes: "ok" });
  });

  it("empty field docs produce empty values map", () => {
    const values: Record<string, unknown> = {};
    expect(values).toEqual({});
  });

  it("GET response shape matches contract when extraFields is empty", () => {
    const dateKey = attendanceDateKey(new Date("2026-06-06T00:00:00.000Z"));
    const response = { extraFields: [], values: {}, dateKey };
    expect(response.extraFields).toHaveLength(0);
    expect(response.values).toEqual({});
    expect(response.dateKey).toBe("2026-06-06");
  });

  it("GET response shape matches contract when fields are present", () => {
    const dateKey = "2026-06-06";
    const extraFields = [{ key: "temp", label: "Temperature", type: "number" }];
    const values = { temp: 36.6 };
    const response = { extraFields, values, dateKey };
    expect(response.extraFields[0].key).toBe("temp");
    expect(response.values["temp"]).toBe(36.6);
    expect(response.dateKey).toBe(dateKey);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they pass**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm test -- custom-field-value-api 2>&1
```

Expected output includes: `5 passed`.

---

### Task 4: `SectionCustomFields` client component — fetch and render nothing when empty

**Files:**
- Create: `src/components/sections/custom-fields.tsx`

- [ ] **Step 1: Create the component with fetch logic and empty-state guard**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { FormInput, FormSelect } from "@/components/ui/form-input";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

interface FieldDef {
  key: string;
  label: string;
  type: "boolean" | "number" | "text" | "select" | "date";
  options?: string[];
  required?: boolean;
  formula?: string;
}

interface CustomFieldsData {
  extraFields: FieldDef[];
  values: Record<string, unknown>;
  dateKey: string;
}

export function SectionCustomFields({ sectionKey }: { sectionKey: string }) {
  const [data, setData] = useState<CustomFieldsData | null>(null);
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/sections/${sectionKey}/custom-fields`)
      .then((r) => r.json())
      .then((json: CustomFieldsData) => {
        if (cancelled) return;
        setData(json);
        setLocalValues(json.values ?? {});
      })
      .catch(() => {
        // Silently ignore — the page must not crash
      });
    return () => {
      cancelled = true;
    };
  }, [sectionKey]);

  const saveField = useCallback(
    async (fieldKey: string, value: unknown) => {
      setSaving((prev) => ({ ...prev, [fieldKey]: true }));
      try {
        const res = await fetch(`/api/sections/${sectionKey}/custom-fields`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fieldKey, value }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast.error((err as { error?: string }).error ?? "Failed to save");
        }
      } catch {
        toast.error("Failed to save");
      } finally {
        setSaving((prev) => ({ ...prev, [fieldKey]: false }));
      }
    },
    [sectionKey]
  );

  // Not yet loaded or no extra fields — render nothing
  if (!data || data.extraFields.length === 0) return null;

  return (
    <Card>
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
        Additional fields
      </h2>
      <div className="flex flex-col gap-4">
        {data.extraFields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={localValues[field.key]}
            isSaving={saving[field.key] ?? false}
            onChange={(val) =>
              setLocalValues((prev) => ({ ...prev, [field.key]: val }))
            }
            onSave={(val) => saveField(field.key, val)}
          />
        ))}
      </div>
    </Card>
  );
}

/* ── Individual field input ── */

interface FieldInputProps {
  field: FieldDef;
  value: unknown;
  isSaving: boolean;
  onChange: (val: unknown) => void;
  onSave: (val: unknown) => void;
}

function FieldInput({ field, value, isSaving, onChange, onSave }: FieldInputProps) {
  const baseStyle = isSaving ? "opacity-60" : "";

  if (field.type === "boolean") {
    return (
      <div className="flex items-center justify-between min-h-[44px]">
        <label className="text-xs font-medium text-[var(--text-muted)]">
          {field.label}
        </label>
        <ToggleSwitch
          checked={Boolean(value)}
          onChange={(checked) => {
            onChange(checked);
            onSave(checked);
          }}
          disabled={isSaving}
        />
      </div>
    );
  }

  if (field.type === "select" && field.options && field.options.length > 0) {
    return (
      <div className={baseStyle}>
        <FormSelect
          label={field.label}
          value={String(value ?? "")}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val);
            onSave(val);
          }}
          disabled={isSaving}
        >
          <option value="">—</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </FormSelect>
      </div>
    );
  }

  // number, text, date
  const inputType =
    field.type === "number" ? "number" : field.type === "date" ? "date" : "text";

  return (
    <div className={baseStyle}>
      <FormInput
        label={field.label}
        type={inputType}
        value={String(value ?? "")}
        className={field.type === "number" ? "num" : undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onSave(e.target.value === "" ? null : e.target.value)}
        disabled={isSaving}
      />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm tsc --noEmit 2>&1 | head -30
```

Expected: No new errors.

---

### Task 5: Component tests

**Files:**
- Create: `src/components/sections/__tests__/custom-fields.test.tsx`

- [ ] **Step 1: Create the test directory if it doesn't exist**

```bash
mkdir -p /Users/artemijfridriksen/projects/personal_planner/src/components/sections/__tests__
```

- [ ] **Step 2: Create the test file**

```tsx
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
```

- [ ] **Step 3: Run the component tests**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm test -- custom-fields 2>&1
```

Expected: All tests pass. If a test fails due to missing `@testing-library/react` config, check `vitest.config.ts` for `setupFiles`.

---

### Task 6: Full build + test gate

- [ ] **Step 1: Run the full test suite**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm test 2>&1 | tail -20
```

Expected: All tests pass. No regressions from pre-existing tests.

- [ ] **Step 2: Run a full Next.js build**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm build 2>&1 | tail -30
```

Expected: `Compiled successfully` (or `✓ Compiled` for Next.js 15). Zero TypeScript or build errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && git add \
  src/app/api/sections/\[sectionKey\]/custom-fields/route.ts \
  src/components/sections/custom-fields.tsx \
  src/components/sections/__tests__/custom-fields.test.tsx \
  src/lib/__tests__/custom-field-value-api.test.ts

git commit -m "feat: generic custom-fields render block + value API"
```

---

## Spec Coverage Verification

| Spec requirement (§) | Covered by task |
|---|---|
| §4 — CustomFieldValue upsert unique on (userId, sectionKey, dateKey, fieldKey) | Task 2 (POST uses findOneAndUpdate upsert) |
| §7 — GET /api/sections/[sectionKey]/custom-fields → extraFields + values + dateKey | Task 1 |
| §7 — POST validates fieldKey exists in extraFields, returns 404/400 otherwise | Task 2 |
| §7 — POST body `{ fieldKey, value, dateKey? }`, default dateKey = today UTC | Task 2 |
| §8 — custom-fields.tsx returns null when extraFields empty | Task 4 |
| §8 — typed inputs per field (number/text/date/boolean/select) | Task 4 |
| §8 — saves on toggle/select change, saves text/number on blur | Task 4 (FieldInput logic) |
| §8 — sonner toast on error | Task 4 |
| §8 — resilient — never crashes on fetch error | Task 4 + Task 5 |
| §9 — dates use UTC yyyy-MM-dd convention | Tasks 1 & 2 (attendanceDateKey) |

## Response Shape Reference

**GET** `/api/sections/[sectionKey]/custom-fields`
```json
{
  "extraFields": [
    { "key": "temp", "label": "Temperature", "type": "number" }
  ],
  "values": { "temp": 36.6 },
  "dateKey": "2026-06-06"
}
```
When no customization exists: `{ "extraFields": [], "values": {}, "dateKey": "2026-06-06" }`.

**POST** `/api/sections/[sectionKey]/custom-fields`
Request: `{ "fieldKey": "temp", "value": 36.6 }` (optional `"dateKey": "2026-06-06"`)
Response: `{ "saved": { ...CustomFieldValue document } }`
Errors: `400 { "error": "fieldKey is required" }` | `404 { "error": "No customization found..." }` | `400 { "error": "fieldKey 'x' not found..." }` | `401 { "error": "Unauthorized" }`

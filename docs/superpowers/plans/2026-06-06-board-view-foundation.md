# Board View Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "board" as a valid viewType across all enums/schemas, add a PATCH endpoint for updating individual custom section entries (needed for drag-to-reorder/status change), and install dnd-kit as a dependency.

**Architecture:** Three independent changes: (1) enum/union type additions across 4 files, (2) a new PATCH handler added to the existing `[id]/route.ts` alongside the DELETE handler, and (3) a pnpm install. The CustomEntry Mongoose model needs an `order` field added since board views require ordering. No UI components are built here.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Mongoose, Zod, @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities

---

## Files Changed

| Action | File | What Changes |
|--------|------|-------------|
| Modify | `src/lib/models/section-template.ts:18,57` | TS union + Mongoose enum → add `"board"` |
| Modify | `src/lib/models/custom-entry.ts` | Add `order: { type: Number, default: 0 }` field + interface |
| Modify | `src/lib/validations.ts:239` | `singleSectionUpdateSchema.viewType` enum → add `"board"` |
| Modify | `src/lib/ai.ts:95` | `PlannerConfigSchema.customSections.viewType` enum → add `"board"` |
| Modify | `src/app/(app)/sections/[slug]/page.tsx:30` | Local `Template` interface `viewType?` union → add `"board"` |
| Modify | `src/app/api/sections/[slug]/entries/[id]/route.ts` | Add `PATCH` handler alongside existing `DELETE` |
| Install | `package.json` | Add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` |

---

### Task 1: Add "board" to all viewType enums and the entry order field

**Files:**
- Modify: `src/lib/models/section-template.ts`
- Modify: `src/lib/models/custom-entry.ts`
- Modify: `src/lib/validations.ts`
- Modify: `src/lib/ai.ts`
- Modify: `src/app/(app)/sections/[slug]/page.tsx`

- [ ] **Step 1: Update `section-template.ts` TS interface (line 18) and Mongoose enum (line 57)**

In `src/lib/models/section-template.ts`, change:

```typescript
// Line 18 — TS interface
viewType: "weekly-cards" | "table" | "grid";
```
to:
```typescript
viewType: "weekly-cards" | "table" | "grid" | "board";
```

And change (line 57):
```typescript
enum: ["weekly-cards", "table", "grid"],
```
to:
```typescript
enum: ["weekly-cards", "table", "grid", "board"],
```

- [ ] **Step 2: Add `order` field to `custom-entry.ts`**

In `src/lib/models/custom-entry.ts`, change the interface and schema:

```typescript
export interface ICustomEntry extends Document {
  userId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  date: Date;
  data: Record<string, unknown>;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const CustomEntrySchema = new Schema<ICustomEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    templateId: { type: Schema.Types.ObjectId, ref: "SectionTemplate", required: true },
    date: { type: Date, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);
```

- [ ] **Step 3: Update `validations.ts` — `singleSectionUpdateSchema.viewType`**

In `src/lib/validations.ts`, change line 239:
```typescript
viewType: z.enum(["weekly-cards", "table", "grid"]).default("weekly-cards"),
```
to:
```typescript
viewType: z.enum(["weekly-cards", "table", "grid", "board"]).default("weekly-cards"),
```

- [ ] **Step 4: Update `ai.ts` — `PlannerConfigSchema.customSections.viewType`**

In `src/lib/ai.ts`, change line 95:
```typescript
viewType: z.enum(["weekly-cards", "table", "grid"]).default("weekly-cards"),
```
to:
```typescript
viewType: z.enum(["weekly-cards", "table", "grid", "board"]).default("weekly-cards"),
```

- [ ] **Step 5: Update local `Template` interface in the section page**

In `src/app/(app)/sections/[slug]/page.tsx`, change line 32:
```typescript
viewType?: "weekly-cards" | "table" | "grid";
```
to:
```typescript
viewType?: "weekly-cards" | "table" | "grid" | "board";
```

- [ ] **Step 6: Verify the enum additions**

```bash
grep -rn '"board"' /Users/artemijfridriksen/projects/personal_planner/src/lib /Users/artemijfridriksen/projects/personal_planner/src/app | head -10
```

Expected output: at least 5 lines showing `"board"` in section-template.ts (×2), validations.ts, ai.ts, and sections/[slug]/page.tsx.

---

### Task 2: Add PATCH handler to `[id]/route.ts`

**Files:**
- Modify: `src/app/api/sections/[slug]/entries/[id]/route.ts`

The PATCH merges provided `data` keys into the existing entry's `data` object (partial update — only the provided keys change), and optionally sets `order`. It uses the same auth pattern as DELETE. Scoped to `{ _id: id, userId }` to prevent cross-user access.

- [ ] **Step 1: Add the PATCH handler to the route file**

Replace the entire contents of `src/app/api/sections/[slug]/entries/[id]/route.ts` with:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { resolveUserId } from "@/lib/session";
import CustomEntry from "@/lib/models/custom-entry";
import { Types } from "mongoose";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const deleted = await CustomEntry.findOneAndDelete({ _id: id, userId });
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const session = await auth();
  const userId = await resolveUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { data?: Record<string, unknown>; order?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const entry = await CustomEntry.findOne({ _id: id, userId });
  if (!entry) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (body.data !== undefined) {
    entry.data = { ...entry.data, ...body.data };
    entry.markModified("data");
  }
  if (body.order !== undefined) {
    entry.order = body.order;
  }

  await entry.save();

  return NextResponse.json({ entry });
}
```

- [ ] **Step 2: Verify the PATCH handler exists**

```bash
grep -n "PATCH" /Users/artemijfridriksen/projects/personal_planner/src/app/api/sections/[slug]/entries/[id]/route.ts
```

Expected output: lines showing `export async function PATCH` and the function body.

---

### Task 3: Install dnd-kit packages

**Files:**
- Modify: `package.json` (via pnpm install)

- [ ] **Step 1: Install the three dnd-kit packages**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: pnpm resolves and installs without errors. `package.json` will contain all three packages in `dependencies`.

- [ ] **Step 2: Verify packages appear in package.json**

```bash
grep -E "@dnd-kit" /Users/artemijfridriksen/projects/personal_planner/package.json
```

Expected: 3 lines with `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.

---

### Task 4: Build, test, and commit

- [ ] **Step 1: Run the build**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm build 2>&1 | tail -20
```

Expected: `✓ Compiled successfully` or `Route (app)` table with no TypeScript errors.

- [ ] **Step 2: Run the tests**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && pnpm test 2>&1 | tail -20
```

Expected: all 148 tests pass, 0 failures.

- [ ] **Step 3: Final grep to confirm board is present everywhere**

```bash
grep -rn '"board"' /Users/artemijfridriksen/projects/personal_planner/src | sort
```

Expected: at least 5 lines across the 5 source files modified.

- [ ] **Step 4: Commit**

```bash
cd /Users/artemijfridriksen/projects/personal_planner && git add \
  src/lib/models/section-template.ts \
  src/lib/models/custom-entry.ts \
  src/lib/validations.ts \
  src/lib/ai.ts \
  "src/app/(app)/sections/[slug]/page.tsx" \
  "src/app/api/sections/[slug]/entries/[id]/route.ts" \
  pnpm-lock.yaml \
  package.json && \
git commit -m "$(cat <<'EOF'
feat: board viewType enum + entry PATCH + dnd-kit deps

- Add "board" to viewType unions in section-template.ts (TS + Mongoose), validations.ts, ai.ts, and sections page local interface
- Add `order` field (Number, default 0) to CustomEntry model for board ordering
- Add PATCH /api/sections/[slug]/entries/[id] for partial data merge + order update
- Install @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

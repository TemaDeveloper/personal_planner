# Notes (Notion-style) Section — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third built-in default screen "Notes" — a Notion-style workspace of nestable pages edited with the BlockNote block editor (slash menu, draggable blocks, all block types), with presets and Vercel Blob image upload.

**Architecture:** A dedicated `NotesPage` Mongoose model stores a flat list of pages (tree via `parentId`, sibling order via a float `order`, BlockNote JSON in `content`). REST routes under `/api/notes` mirror the app's existing `userId`-scoped pattern. A two-pane `/notes` screen renders a page-tree rail (dnd-kit drag to re-nest) and a client-only BlockNote editor with debounced autosave.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Mongoose 9, Zod, BlockNote (`@blocknote/core` + `@blocknote/react` + `@blocknote/mantine`) 0.51.x, `@vercel/blob` 2.x, `@dnd-kit/*` (already present), Vitest + Testing Library.

**Branch:** `feat/notes-notion-section` (already created).

**Package manager:** pnpm (NOT npm — this repo's node_modules is pnpm-managed).

---

## File Structure

- `src/lib/models/notes-page.ts` — Mongoose model + `INotesPage`.
- `src/lib/notes/types.ts` — shared TS types (`FlatPage`, `TreeNode`, `PresetKey`).
- `src/lib/notes/page-tree.ts` — `buildPageTree` (+ test).
- `src/lib/notes/order.ts` — `orderBetween` (+ test).
- `src/lib/notes/presets.ts` — preset block generators + `PRESETS` registry (+ test).
- `src/lib/validations.ts` — add `notesPageCreateSchema`, `notesPageUpdateSchema`.
- `src/app/api/notes/route.ts` — GET list, POST create.
- `src/app/api/notes/[id]/route.ts` — GET, PATCH, DELETE (recursive soft-delete).
- `src/app/api/notes/upload/route.ts` — Vercel Blob upload.
- `src/hooks/use-debounced-save.ts` — debounced autosave hook (+ test).
- `src/components/notes/notes-editor.tsx` — BlockNote wrapper (client-only) + autosave.
- `src/components/notes/notes-editor-loader.tsx` — `next/dynamic` ssr:false wrapper.
- `src/components/notes/page-tree.tsx` — tree rail.
- `src/components/notes/new-page-menu.tsx` — preset picker.
- `src/components/notes/notes-screen.tsx` — client two-pane shell (tree + outlet area), used by routes.
- `src/app/(app)/notes/layout.tsx`, `src/app/(app)/notes/page.tsx`, `src/app/(app)/notes/[pageId]/page.tsx`.
- Nav edits: `src/components/layout/app-sidebar.tsx`, `src/components/layout/mobile-menu.tsx`, `src/components/layout/content-shell.tsx`, `src/components/layout/top-bar.tsx`.
- `.env.example` (or README note) — `BLOB_READ_WRITE_TOKEN`.

---

## Task 0: Install dependencies

**Files:** `package.json`, `pnpm-lock.yaml`

- [ ] **Step 1: Install** (pnpm, not npm)

```bash
pnpm add @blocknote/core@^0.51.4 @blocknote/react@^0.51.4 @blocknote/mantine@^0.51.4 @vercel/blob@^2.4.0
```

- [ ] **Step 2: Verify they resolved**

Run: `pnpm ls @blocknote/react @vercel/blob 2>&1 | tail -5`
Expected: both listed with versions.

- [ ] **Step 3: Document the Blob env var.** Append to `.env.example` (create if absent):

```
# Vercel Blob store token — required for image upload in Notes.
# Provision a Blob store in the Vercel dashboard and paste its read/write token.
BLOB_READ_WRITE_TOKEN=
```

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore(notes): add BlockNote + Vercel Blob deps"
```

---

## Task 1: NotesPage model

**Files:**
- Create: `src/lib/models/notes-page.ts`

Mirror the existing model pattern (see `src/lib/models/custom-entry.ts`: `mongoose.deleteModel` guard + `timestamps`).

- [ ] **Step 1: Create the model**

```ts
import mongoose, { Schema, type Document } from "mongoose";

export interface INotesPage extends Document {
  userId: mongoose.Types.ObjectId;
  parentId: mongoose.Types.ObjectId | null;
  title: string;
  icon: string;
  content: unknown; // BlockNote document JSON (array of blocks)
  order: number;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotesPageSchema = new Schema<INotesPage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    parentId: { type: Schema.Types.ObjectId, ref: "NotesPage", default: null },
    title: { type: String, default: "Untitled" },
    icon: { type: String, default: "📄" },
    content: { type: Schema.Types.Mixed, default: [] },
    order: { type: Number, default: 0 },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotesPageSchema.index({ userId: 1, parentId: 1 });
NotesPageSchema.index({ userId: 1, archived: 1 });

if (mongoose.models.NotesPage) mongoose.deleteModel("NotesPage");
export default mongoose.model<INotesPage>("NotesPage", NotesPageSchema);
```

- [ ] **Step 2: Build check**

Run: `pnpm build 2>&1 | tail -3`
Expected: compiles (model is unused so far — acceptable; or proceed; it will be used in Task 5).

- [ ] **Step 3: Commit**

```bash
git add src/lib/models/notes-page.ts
git commit -m "feat(notes): NotesPage model"
```

---

## Task 2: Shared types + page-tree builder

**Files:**
- Create: `src/lib/notes/types.ts`
- Create: `src/lib/notes/page-tree.ts`
- Test: `src/lib/notes/__tests__/page-tree.test.ts`

- [ ] **Step 1: Create `src/lib/notes/types.ts`**

```ts
export type PresetKey = "blank" | "todo" | "meeting" | "journal" | "project";

/** Lightweight page record for the tree (no content). */
export interface FlatPage {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  order: number;
}

export interface TreeNode extends FlatPage {
  children: TreeNode[];
}
```

- [ ] **Step 2: Write the failing test** — `src/lib/notes/__tests__/page-tree.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { buildPageTree } from "@/lib/notes/page-tree";
import type { FlatPage } from "@/lib/notes/types";

const p = (id: string, parentId: string | null, order = 0, title = id): FlatPage => ({
  id, parentId, order, title, icon: "📄",
});

describe("buildPageTree", () => {
  it("nests children under parents", () => {
    const tree = buildPageTree([p("a", null), p("b", "a"), p("c", "a")]);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe("a");
    expect(tree[0].children.map((n) => n.id)).toEqual(["b", "c"]);
  });
  it("sorts siblings by order then keeps stable", () => {
    const tree = buildPageTree([p("a", null, 2), p("b", null, 1), p("c", null, 3)]);
    expect(tree.map((n) => n.id)).toEqual(["b", "a", "c"]);
  });
  it("treats a page with an unresolved parent as root (orphan safety)", () => {
    const tree = buildPageTree([p("x", "missing")]);
    expect(tree.map((n) => n.id)).toEqual(["x"]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/notes/__tests__/page-tree.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Create `src/lib/notes/page-tree.ts`**

```ts
import type { FlatPage, TreeNode } from "@/lib/notes/types";

/** Build a nested tree from a flat page list. Siblings sorted by `order`.
 * Pages whose parent is missing become root-level (orphan safety). */
export function buildPageTree(pages: FlatPage[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  for (const p of pages) byId.set(p.id, { ...p, children: [] });

  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sortRec = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.order - b.order);
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/notes/__tests__/page-tree.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/notes/types.ts src/lib/notes/page-tree.ts src/lib/notes/__tests__/page-tree.test.ts
git commit -m "feat(notes): page-tree builder + shared types"
```

---

## Task 3: Order math

**Files:**
- Create: `src/lib/notes/order.ts`
- Test: `src/lib/notes/__tests__/order.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/notes/__tests__/order.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { orderBetween } from "@/lib/notes/order";

describe("orderBetween", () => {
  it("midpoint between two neighbors", () => {
    expect(orderBetween(1, 3)).toBe(2);
  });
  it("before the first item", () => {
    expect(orderBetween(undefined, 5)).toBe(4);
  });
  it("after the last item", () => {
    expect(orderBetween(5, undefined)).toBe(6);
  });
  it("empty list", () => {
    expect(orderBetween(undefined, undefined)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/notes/__tests__/order.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/notes/order.ts`**

```ts
/** A fractional order value placing an item between two neighbors.
 * Lets us reorder/re-nest by drag without renumbering siblings. */
export function orderBetween(prev: number | undefined, next: number | undefined): number {
  if (prev === undefined && next === undefined) return 0;
  if (prev === undefined) return (next as number) - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/notes/__tests__/order.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notes/order.ts src/lib/notes/__tests__/order.test.ts
git commit -m "feat(notes): fractional order helper"
```

---

## Task 4: Presets

**Files:**
- Create: `src/lib/notes/presets.ts`
- Test: `src/lib/notes/__tests__/presets.test.ts`

Presets return arrays of partial BlockNote blocks. BlockNote accepts partial blocks like `{ type: "heading", content: "Goals" }` and `{ type: "checkListItem", content: "Task" }`. We type them loosely as `PresetBlock[]` since `content` is stored as `Mixed`.

- [ ] **Step 1: Write the failing test** — `src/lib/notes/__tests__/presets.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { PRESETS, buildPreset } from "@/lib/notes/presets";
import type { PresetKey } from "@/lib/notes/types";

describe("presets", () => {
  it("registry lists all five presets with labels", () => {
    const keys = PRESETS.map((p) => p.key).sort();
    expect(keys).toEqual(["blank", "journal", "meeting", "project", "todo"]);
    expect(PRESETS.every((p) => p.label.length > 0)).toBe(true);
  });
  it("blank returns a single empty paragraph", () => {
    const blocks = buildPreset("blank");
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("paragraph");
  });
  it("todo seeds checkbox blocks", () => {
    const blocks = buildPreset("todo");
    expect(blocks.some((b) => b.type === "checkListItem")).toBe(true);
  });
  it("every preset returns at least one block", () => {
    (["blank", "todo", "meeting", "journal", "project"] as PresetKey[]).forEach((k) => {
      expect(buildPreset(k).length).toBeGreaterThan(0);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/notes/__tests__/presets.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/lib/notes/presets.ts`**

```ts
import type { PresetKey } from "@/lib/notes/types";

/** Minimal partial-block shape; BlockNote fills defaults for the rest. */
export interface PresetBlock {
  type: string;
  content?: string;
}

const para = (text = ""): PresetBlock => ({ type: "paragraph", content: text });
const h = (text: string): PresetBlock => ({ type: "heading", content: text });
const check = (text = ""): PresetBlock => ({ type: "checkListItem", content: text });

const builders: Record<PresetKey, () => PresetBlock[]> = {
  blank: () => [para()],
  todo: () => [h("To-dos"), check("First task"), check("Second task"), check("")],
  meeting: () => [
    h("Meeting notes"),
    para("Date: "),
    para("Attendees: "),
    h("Agenda"),
    para(""),
    h("Notes"),
    para(""),
    h("Action items"),
    check(""),
  ],
  journal: () => [
    h("Journal"),
    h("Highlights"),
    para(""),
    h("Gratitude"),
    para(""),
    h("Notes"),
    para(""),
  ],
  project: () => [
    h("Project"),
    h("Goals"),
    para(""),
    h("Milestones"),
    check(""),
    h("Notes"),
    para(""),
  ],
};

export function buildPreset(key: PresetKey): PresetBlock[] {
  return builders[key]();
}

export const PRESETS: { key: PresetKey; label: string; description: string }[] = [
  { key: "blank", label: "Blank page", description: "Start from scratch" },
  { key: "todo", label: "To-do list", description: "A checklist to knock out tasks" },
  { key: "meeting", label: "Meeting notes", description: "Agenda, notes, action items" },
  { key: "journal", label: "Daily journal", description: "Highlights, gratitude, notes" },
  { key: "project", label: "Project tracker", description: "Goals, milestones, notes" },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/notes/__tests__/presets.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/notes/presets.ts src/lib/notes/__tests__/presets.test.ts
git commit -m "feat(notes): page presets + registry"
```

---

## Task 5: Zod validation schemas

**Files:**
- Modify: `src/lib/validations.ts` (append near the end, before the Calendar section)
- Test: `src/lib/__tests__/notes-validations.test.ts`

- [ ] **Step 1: Write the failing test** — `src/lib/__tests__/notes-validations.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { notesPageCreateSchema, notesPageUpdateSchema } from "@/lib/validations";

describe("notes validations", () => {
  it("accepts a create with a preset", () => {
    const r = notesPageCreateSchema.safeParse({ preset: "todo", parentId: null });
    expect(r.success).toBe(true);
  });
  it("rejects an unknown preset", () => {
    const r = notesPageCreateSchema.safeParse({ preset: "nope" });
    expect(r.success).toBe(false);
  });
  it("accepts a partial update (content only)", () => {
    const r = notesPageUpdateSchema.safeParse({ content: [{ type: "paragraph" }] });
    expect(r.success).toBe(true);
  });
  it("rejects a title over the cap", () => {
    const r = notesPageUpdateSchema.safeParse({ title: "x".repeat(300) });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/__tests__/notes-validations.test.ts`
Expected: FAIL — schemas not exported.

- [ ] **Step 3: Add to `src/lib/validations.ts`** (after the existing `// -- AI Section Update --` block or anywhere top-level):

```ts
// -- Notes (Notion-style pages) --
const presetKeySchema = z.enum(["blank", "todo", "meeting", "journal", "project"]);

export const notesPageCreateSchema = z.object({
  parentId: z.string().min(1).max(100).nullable().optional(),
  title: z.string().max(200).optional(),
  preset: presetKeySchema.optional(),
});

export const notesPageUpdateSchema = z
  .object({
    title: z.string().max(200).optional(),
    icon: z.string().max(16).optional(),
    content: z.array(z.unknown()).max(5000).optional(),
    parentId: z.string().min(1).max(100).nullable().optional(),
    order: z.number().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "no fields to update" });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/__tests__/notes-validations.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations.ts src/lib/__tests__/notes-validations.test.ts
git commit -m "feat(notes): Zod schemas for page create/update"
```

---

## Task 6: List + create API route

**Files:**
- Create: `src/app/api/notes/route.ts`

Follow the auth/ownership pattern from `src/app/api/sections/[slug]/entries/route.ts` (auth → resolveUserId → connectDB → query scoped by userId).

- [ ] **Step 1: Create `src/app/api/notes/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesPage from "@/lib/models/notes-page";
import { notesPageCreateSchema } from "@/lib/validations";
import { buildPreset } from "@/lib/notes/presets";

export async function GET() {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const pages = await NotesPage.find({ userId, archived: false })
    .select("_id parentId title icon order")
    .sort({ order: 1, createdAt: 1 })
    .lean();

  const flat = pages.map((p) => ({
    id: String(p._id),
    parentId: p.parentId ? String(p.parentId) : null,
    title: p.title,
    icon: p.icon,
    order: p.order,
  }));
  return NextResponse.json({ pages: flat });
}

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = notesPageCreateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { parentId, title, preset } = parsed.data;

  await connectDB();
  // Place new page at the end of its sibling group.
  const last = await NotesPage.find({ userId, parentId: parentId ?? null, archived: false })
    .sort({ order: -1 })
    .limit(1)
    .lean();
  const order = last.length ? last[0].order + 1 : 0;

  const page = await NotesPage.create({
    userId,
    parentId: parentId ?? null,
    title: title || "Untitled",
    content: buildPreset(preset ?? "blank"),
    order,
  });

  return NextResponse.json({ page: { id: String(page._id), parentId, title: page.title, icon: page.icon, order } }, { status: 201 });
}
```

- [ ] **Step 2: Build check**

Run: `pnpm build 2>&1 | tail -3`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/notes/route.ts
git commit -m "feat(notes): list + create API"
```

---

## Task 7: Get / update / delete API route

**Files:**
- Create: `src/app/api/notes/[id]/route.ts`

DELETE soft-deletes the page and all descendants (walk the tree by parentId).

- [ ] **Step 1: Create `src/app/api/notes/[id]/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";
import { connectDB } from "@/lib/db";
import NotesPage from "@/lib/models/notes-page";
import { notesPageUpdateSchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const page = await NotesPage.findOne({ _id: id, userId, archived: false }).lean();
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    page: {
      id: String(page._id),
      parentId: page.parentId ? String(page.parentId) : null,
      title: page.title,
      icon: page.icon,
      content: page.content,
      order: page.order,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = notesPageUpdateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  await connectDB();
  const { id } = await params;
  const update: Record<string, unknown> = { ...parsed.data };
  if ("parentId" in parsed.data) update.parentId = parsed.data.parentId ?? null;

  const page = await NotesPage.findOneAndUpdate({ _id: id, userId }, update, { new: true }).lean();
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { id } = await params;

  // Collect the page + all descendants, then soft-delete in one update.
  const all = await NotesPage.find({ userId, archived: false }).select("_id parentId").lean();
  const childrenOf = new Map<string, string[]>();
  for (const p of all) {
    const key = p.parentId ? String(p.parentId) : "root";
    (childrenOf.get(key) ?? childrenOf.set(key, []).get(key)!).push(String(p._id));
  }
  const toDelete: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    toDelete.push(cur);
    stack.push(...(childrenOf.get(cur) ?? []));
  }

  const res = await NotesPage.updateMany({ _id: { $in: toDelete }, userId }, { archived: true });
  if (res.matchedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, archived: toDelete.length });
}
```

- [ ] **Step 2: Build check**

Run: `pnpm build 2>&1 | tail -3`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/notes/[id]/route.ts"
git commit -m "feat(notes): get/update/recursive-delete API"
```

---

## Task 8: Image upload API (Vercel Blob)

**Files:**
- Create: `src/app/api/notes/upload/route.ts`

- [ ] **Step 1: Create `src/app/api/notes/upload/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { resolveUserId } from "@/lib/session";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  const userId = await resolveUserId(await auth());
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Image upload is not configured (missing BLOB_READ_WRITE_TOKEN)." }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image too large (max 10MB)" }, { status: 400 });

  const blob = await put(`notes/${userId}/${Date.now()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return NextResponse.json({ url: blob.url });
}
```

- [ ] **Step 2: Build check**

Run: `pnpm build 2>&1 | tail -3`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/notes/upload/route.ts
git commit -m "feat(notes): Vercel Blob image upload API"
```

---

## Task 9: Debounced autosave hook

**Files:**
- Create: `src/hooks/use-debounced-save.ts`
- Test: `src/hooks/__tests__/use-debounced-save.test.ts`

- [ ] **Step 1: Write the failing test** — `src/hooks/__tests__/use-debounced-save.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useDebouncedSave } from "@/hooks/use-debounced-save";

afterEach(cleanup);

describe("useDebouncedSave", () => {
  it("fires the save once after rapid calls", () => {
    vi.useFakeTimers();
    const save = vi.fn();
    const { result } = renderHook(() => useDebouncedSave(save, 600));
    act(() => { result.current("a"); result.current("b"); result.current("c"); });
    expect(save).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(600); });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("c");
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/hooks/__tests__/use-debounced-save.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/hooks/use-debounced-save.ts`**

```ts
"use client";

import { useCallback, useEffect, useRef } from "react";

/** Returns a stable callback that debounces `save` by `delayMs`. */
export function useDebouncedSave<T>(save: (value: T) => void, delayMs = 600): (value: T) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return useCallback((value: T) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => saveRef.current(value), delayMs);
  }, [delayMs]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/hooks/__tests__/use-debounced-save.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-debounced-save.ts src/hooks/__tests__/use-debounced-save.test.ts
git commit -m "feat(notes): debounced autosave hook"
```

---

## Task 10: BlockNote editor component + loader

**Files:**
- Create: `src/components/notes/notes-editor.tsx`
- Create: `src/components/notes/notes-editor-loader.tsx`

BlockNote is client-only/ESM — the editor is `"use client"` and consumed through a `next/dynamic` (`ssr:false`) loader.

- [ ] **Step 1: Create `src/components/notes/notes-editor.tsx`**

```tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useDebouncedSave } from "@/hooks/use-debounced-save";

/** Reads the app's dark-mode state (Tailwind `dark` class on <html>). */
function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setDark(el.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export function NotesEditor({
  pageId,
  initialContent,
}: {
  pageId: string;
  initialContent: unknown;
}) {
  const isDark = useIsDark();
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const uploadFile = async (file: File): Promise<string> => {
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/notes/upload", { method: "POST", body });
    if (!res.ok) throw new Error("Upload failed");
    const json = await res.json();
    return json.url as string;
  };

  // initialContent must be a non-empty block array or undefined.
  const initial = useMemo(() => {
    const c = initialContent;
    return Array.isArray(c) && c.length > 0 ? (c as never) : undefined;
  }, [initialContent]);

  const editor = useCreateBlockNote({ initialContent: initial, uploadFile });

  const persist = useRef(async (content: unknown) => {
    setStatus("saving");
    await fetch(`/api/notes/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setStatus("saved");
  });
  persist.current = async (content: unknown) => {
    setStatus("saving");
    await fetch(`/api/notes/${pageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setStatus("saved");
  };

  const debouncedSave = useDebouncedSave<unknown>((c) => persist.current(c), 600);

  return (
    <div className="relative">
      <div className="absolute right-2 -top-6 text-[11px]" style={{ color: "var(--text-faint)" }}>
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
      </div>
      <BlockNoteView
        editor={editor}
        theme={isDark ? "dark" : "light"}
        onChange={() => debouncedSave(editor.document)}
      />
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/notes/notes-editor-loader.tsx`**

```tsx
"use client";

import dynamic from "next/dynamic";

/** BlockNote is client/ESM-only — load it without SSR. */
export const NotesEditorLoader = dynamic(
  () => import("./notes-editor").then((m) => m.NotesEditor),
  { ssr: false, loading: () => <div className="p-6 text-sm" style={{ color: "var(--text-faint)" }}>Loading editor…</div> }
);
```

- [ ] **Step 3: Build check**

Run: `pnpm build 2>&1 | tail -6`
Expected: compiles. If BlockNote types complain about `initialContent`, the `as never`/`undefined` cast in Step 1 keeps it building.

- [ ] **Step 4: Commit**

```bash
git add src/components/notes/notes-editor.tsx src/components/notes/notes-editor-loader.tsx
git commit -m "feat(notes): BlockNote editor wrapper with autosave + image upload"
```

---

## Task 11: Page-tree rail + new-page menu

**Files:**
- Create: `src/components/notes/new-page-menu.tsx`
- Create: `src/components/notes/page-tree.tsx`

For v1, drag-to-**re-nest** is wired with native HTML5 drag: drop a page onto another row to make it that row's child (appended via `orderBetween`), or onto the "Pages" header to move it back to the top level. A guard prevents dropping a page into its own descendant. Sibling reordering (drop *between* rows) is a documented follow-up.

- [ ] **Step 1: Create `src/components/notes/new-page-menu.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PRESETS } from "@/lib/notes/presets";
import type { PresetKey } from "@/lib/notes/types";

export function NewPageMenu({ parentId = null, onCreated }: { parentId?: string | null; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const create = async (preset: PresetKey) => {
    setOpen(false);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId, preset }),
    });
    if (!res.ok) return;
    const { page } = await res.json();
    onCreated();
    router.push(`/notes/${page.id}`);
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-2 py-1.5 rounded-md text-[12px]" style={{ color: "var(--text-muted)" }}>
        ＋ New page
      </button>
      {open && (
        <div className="absolute z-30 left-0 mt-1 w-52 rounded-lg border p-1"
          style={{ background: "var(--surface-1)", borderColor: "var(--border-default)", boxShadow: "0 8px 24px rgba(0,0,0,.12)" }}>
          {PRESETS.map((p) => (
            <button key={p.key} type="button" onClick={() => create(p.key)}
              className="w-full text-left px-2.5 py-2 rounded-md hover:bg-[var(--surface-raised)]">
              <div className="text-[13px]" style={{ color: "var(--text-primary)" }}>{p.label}</div>
              <div className="text-[11px]" style={{ color: "var(--text-faint)" }}>{p.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/notes/page-tree.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { TreeNode } from "@/lib/notes/types";
import { orderBetween } from "@/lib/notes/order";
import { NewPageMenu } from "./new-page-menu";

/** Collect a node and all its descendant ids (drop-into-self/descendant guard). */
function subtreeIds(node: TreeNode, acc: Set<string> = new Set()): Set<string> {
  acc.add(node.id);
  for (const c of node.children) subtreeIds(c, acc);
  return acc;
}
function findNode(nodes: TreeNode[], id: string): TreeNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n;
    const f = findNode(n.children, id);
    if (f) return f;
  }
  return undefined;
}

export function PageTree({ tree, onChanged }: { tree: TreeNode[]; onChanged: () => void }) {
  const [dropRoot, setDropRoot] = useState(false);

  // Re-nest `draggedId` under `targetId` (null = top level), appended at the end.
  const move = async (draggedId: string, targetId: string | null) => {
    if (draggedId === targetId) return;
    const dragged = findNode(tree, draggedId);
    if (!dragged) return;
    if (targetId && subtreeIds(dragged).has(targetId)) return; // can't drop into own descendant

    const siblings = targetId ? (findNode(tree, targetId)?.children ?? []) : tree;
    const maxOrder = siblings.length ? siblings[siblings.length - 1].order : undefined;
    const order = orderBetween(maxOrder, undefined);

    await fetch(`/api/notes/${draggedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: targetId, order }),
    });
    onChanged();
  };

  return (
    <div className="text-[13px]">
      <div
        className="flex items-center justify-between px-2 mb-2 rounded-md"
        style={{ outline: dropRoot ? "2px dashed var(--accent-color)" : "none" }}
        onDragOver={(e) => { e.preventDefault(); setDropRoot(true); }}
        onDragLeave={() => setDropRoot(false)}
        onDrop={(e) => { e.preventDefault(); setDropRoot(false); const id = e.dataTransfer.getData("text/plain"); if (id) move(id, null); }}
      >
        <span className="stat-label" style={{ color: "var(--text-faint)" }}>Pages</span>
      </div>
      <div className="space-y-0.5">
        {tree.map((node) => <TreeRow key={node.id} node={node} depth={0} onChanged={onChanged} onMove={move} />)}
      </div>
      <div className="mt-2"><NewPageMenu onCreated={onChanged} /></div>
    </div>
  );
}

function TreeRow({
  node, depth, onChanged, onMove,
}: {
  node: TreeNode; depth: number; onChanged: () => void; onMove: (draggedId: string, targetId: string | null) => void;
}) {
  const [open, setOpen] = useState(true);
  const [dropOver, setDropOver] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === `/notes/${node.id}`;
  const hasKids = node.children.length > 0;

  const del = async () => {
    await fetch(`/api/notes/${node.id}`, { method: "DELETE" });
    onChanged();
    if (active) router.push("/notes");
  };

  return (
    <div>
      <div
        draggable
        onDragStart={(e) => e.dataTransfer.setData("text/plain", node.id)}
        onDragOver={(e) => { e.preventDefault(); setDropOver(true); }}
        onDragLeave={() => setDropOver(false)}
        onDrop={(e) => { e.preventDefault(); setDropOver(false); const id = e.dataTransfer.getData("text/plain"); if (id) onMove(id, node.id); }}
        className="group flex items-center gap-1 rounded-md pr-1"
        style={{
          paddingLeft: depth * 14,
          background: dropOver ? "var(--accent-glow)" : active ? "var(--accent-glow)" : undefined,
          outline: dropOver ? "1px dashed var(--accent-color)" : "none",
        }}
      >
        <button type="button" aria-label={open ? "Collapse" : "Expand"} onClick={() => setOpen((o) => !o)}
          className="w-4 h-6 flex items-center justify-center" style={{ color: "var(--text-faint)", visibility: hasKids ? "visible" : "hidden" }}>
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <Link href={`/notes/${node.id}`} className="flex-1 flex items-center gap-1.5 py-1 min-w-0"
          style={{ color: active ? "var(--accent-color)" : "var(--text-muted)" }}>
          <span>{node.icon}</span>
          <span className="truncate">{node.title || "Untitled"}</span>
        </Link>
        <button type="button" aria-label="Delete page" onClick={del}
          className="opacity-0 group-hover:opacity-100 px-1 text-[12px]" style={{ color: "var(--text-faint)" }}>🗑</button>
      </div>
      {open && hasKids && (
        <div className="space-y-0.5">
          {node.children.map((c) => <TreeRow key={c.id} node={c} depth={depth + 1} onChanged={onChanged} onMove={onMove} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build check**

Run: `pnpm build 2>&1 | tail -3`
Expected: compiles.

- [ ] **Step 4: Commit**

```bash
git add src/components/notes/new-page-menu.tsx src/components/notes/page-tree.tsx
git commit -m "feat(notes): page-tree rail + preset new-page menu"
```

---

## Task 12: Notes screen shell + routes

**Files:**
- Create: `src/components/notes/notes-screen.tsx`
- Create: `src/app/(app)/notes/layout.tsx`
- Create: `src/app/(app)/notes/page.tsx`
- Create: `src/app/(app)/notes/[pageId]/page.tsx`

The screen fetches the flat page list client-side, builds the tree, and renders the rail + the routed child (editor or empty state). Layout owns the data + rail; child pages render into it via a shared context.

- [ ] **Step 1: Create `src/components/notes/notes-screen.tsx`** (client; owns page list + rail + mobile drawer)

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { buildPageTree } from "@/lib/notes/page-tree";
import type { FlatPage } from "@/lib/notes/types";
import { PageTree } from "./page-tree";

const RefreshCtx = createContext<() => void>(() => {});
export const useNotesRefresh = () => useContext(RefreshCtx);

export function NotesScreen({ children }: { children: React.ReactNode }) {
  const [pages, setPages] = useState<FlatPage[]>([]);
  const [drawer, setDrawer] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/notes");
    if (res.ok) setPages((await res.json()).pages);
  }, []);
  useEffect(() => { load(); }, [load]);

  const tree = buildPageTree(pages);

  return (
    <RefreshCtx.Provider value={load}>
      <div className="h-full flex">
        {/* Desktop rail */}
        <aside className="hidden md:block w-[240px] shrink-0 border-r overflow-y-auto p-3"
          style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}>
          <PageTree tree={tree} onChanged={load} />
        </aside>

        {/* Mobile drawer */}
        {drawer && (
          <div className="md:hidden fixed inset-0 z-40">
            <button aria-label="Close" className="absolute inset-0 bg-[var(--backdrop-overlay)]" onClick={() => setDrawer(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-[260px] overflow-y-auto p-3 border-r"
              style={{ borderColor: "var(--border-subtle)", background: "var(--surface-1)" }}>
              <PageTree tree={tree} onChanged={load} />
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto">
          <button onClick={() => setDrawer(true)} aria-label="Open pages"
            className="md:hidden m-3 inline-flex items-center gap-1.5 text-[13px]" style={{ color: "var(--text-muted)" }}>
            <Menu size={16} /> Pages
          </button>
          {children}
        </main>
      </div>
    </RefreshCtx.Provider>
  );
}
```

- [ ] **Step 2: Create `src/app/(app)/notes/layout.tsx`**

```tsx
import { NotesScreen } from "@/components/notes/notes-screen";

export default function NotesLayout({ children }: { children: React.ReactNode }) {
  return <NotesScreen>{children}</NotesScreen>;
}
```

- [ ] **Step 3: Create `src/app/(app)/notes/page.tsx`** (empty state)

```tsx
export default function NotesIndexPage() {
  return (
    <div className="h-full flex items-center justify-center p-8 text-center">
      <div>
        <div className="text-4xl mb-3">📝</div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Select a page on the left, or create a new one to start writing.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/app/(app)/notes/[pageId]/page.tsx`** (loads one page + editor)

```tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { NotesEditorLoader } from "@/components/notes/notes-editor-loader";
import { useNotesRefresh } from "@/components/notes/notes-screen";

type Loaded = { id: string; title: string; icon: string; content: unknown };

export default function NotesPageView() {
  const { pageId } = useParams<{ pageId: string }>();
  const refresh = useNotesRefresh();
  const [page, setPage] = useState<Loaded | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setPage(null); setNotFound(false);
    fetch(`/api/notes/${pageId}`).then(async (r) => {
      if (!r.ok) { setNotFound(true); return; }
      setPage((await r.json()).page);
    });
  }, [pageId]);

  const saveMeta = async (patch: { title?: string; icon?: string }) => {
    await fetch(`/api/notes/${pageId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch),
    });
    refresh();
  };

  if (notFound) return <div className="p-8 text-sm" style={{ color: "var(--text-faint)" }}>Page not found.</div>;
  if (!page) return <div className="p-8 text-sm" style={{ color: "var(--text-faint)" }}>Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-10 py-8">
      <input
        aria-label="Page icon"
        defaultValue={page.icon}
        onBlur={(e) => saveMeta({ icon: e.target.value || "📄" })}
        className="text-4xl bg-transparent outline-none w-14"
        maxLength={8}
      />
      <input
        aria-label="Page title"
        defaultValue={page.title}
        placeholder="Untitled"
        onBlur={(e) => saveMeta({ title: e.target.value })}
        className="block w-full text-3xl font-bold bg-transparent outline-none mt-2 mb-6"
        style={{ color: "var(--text-primary)" }}
      />
      <NotesEditorLoader pageId={page.id} initialContent={page.content} />
    </div>
  );
}
```

- [ ] **Step 5: Build check**

Run: `pnpm build 2>&1 | tail -4`
Expected: compiles.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/notes" src/components/notes/notes-screen.tsx
git commit -m "feat(notes): two-pane Notes screen + routes"
```

---

## Task 13: Navigation integration

**Files:**
- Modify: `src/components/layout/content-shell.tsx`
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/components/layout/mobile-menu.tsx`
- Modify: `src/components/layout/top-bar.tsx`

- [ ] **Step 1: `content-shell.tsx` — make `/notes` full-bleed.** Change the `fullBleed` line:

```tsx
  const fullBleed = !!pathname && (pathname.includes("/sections/calendar-") || pathname.startsWith("/notes"));
```

- [ ] **Step 2: `app-sidebar.tsx` — pin a Notes link under Calendar.** Add `NotebookPen` to the lucide import, then inside the pinned block (right after the `calendarSection` `NavItem`):

```tsx
          <NavItem
            href="/notes"
            icon={NotebookPen}
            label="Notes"
            active={isActive("/notes")}
          />
```

- [ ] **Step 3: `mobile-menu.tsx` — add Notes to the pinned items.** Add `NotebookPen` to the lucide import, then after the calendar `MenuLink`:

```tsx
                <MenuLink
                  href="/notes"
                  icon={NotebookPen}
                  label="Notes"
                  active={isActive("/notes")}
                  onClick={onClose}
                />
```

- [ ] **Step 4: `top-bar.tsx` — page title for /notes.** In `getPageTitle`, add near the other fixed routes:

```tsx
  if (pathname === "/notes" || pathname.startsWith("/notes/")) return "Notes";
```

- [ ] **Step 5: Lint + build**

Run: `pnpm lint 2>&1 | tail -3 && pnpm build 2>&1 | tail -3`
Expected: 0 errors; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/content-shell.tsx src/components/layout/app-sidebar.tsx src/components/layout/mobile-menu.tsx src/components/layout/top-bar.tsx
git commit -m "feat(notes): pin Notes in sidebar + mobile nav, full-bleed shell, page title"
```

---

## Final verification

- [ ] **Lint:** `pnpm lint` → 0 errors.
- [ ] **Build:** `pnpm build` → success.
- [ ] **Unit tests:** `pnpm test` → all pass (existing 240 + new: page-tree 3, order 4, presets 4, notes-validations 4, use-debounced-save 1).
- [ ] **Manual (local, `pnpm dev`):**
  - Notes appears in the sidebar; clicking opens the two-pane screen.
  - "+ New page" → preset picker → creating each preset opens it with seeded blocks.
  - Typing autosaves ("Saving…/Saved"); reload preserves content.
  - "/" slash menu works; blocks drag-reorder within the editor; headings/to-dos/quote/code/table render.
  - Nesting: create a sub-page, it nests; expand/collapse works; delete removes page + descendants.
  - Title + emoji edits persist and update the tree.
  - Mobile (≤375px): tree is a drawer; editor full-width.
  - Image paste/drop uploads (only if `BLOB_READ_WRITE_TOKEN` is set; otherwise shows the 503 message).
- [ ] Push branch; finish via finishing-a-development-branch; deploy after user confirmation **and** after the user sets `BLOB_READ_WRITE_TOKEN` in Vercel (text works without it; images need it).

## Notes / caveats
- BlockNote ships Mantine CSS; imported only in `notes-editor.tsx` (client, dynamically loaded) so it doesn't leak globally or run during SSR.
- The `initialContent` cast (`as never`/`undefined`) accommodates BlockNote's strict block typing while we store content as `Mixed`.
- Drag-reorder uses native HTML5 drag for v1; richer dnd-kit interactions and inline rename are documented follow-ups.
- E2E (Cypress) for Notes is a fast-follow, not part of v1.

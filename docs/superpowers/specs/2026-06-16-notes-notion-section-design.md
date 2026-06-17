# Notes — Notion-style section — Design

**Date:** 2026-06-16
**Status:** Approved (pending spec review)

## Problem / goal

Add a third built-in default screen, **Notes**: a Notion-style workspace where the user creates nestable pages, writes freely with a block editor, uses a "/" slash menu, and starts pages from presets. It must *feel* like Notion and be architected so we can extend it toward closer Notion parity over time.

## Scope

**In scope (v1):**
- A pinned default screen "Notes" at `/notes` (+ `/notes/[pageId]`), in the global sidebar next to Today & Calendar.
- Nestable pages (any page can contain sub-pages, any depth) — the Notion-true model. "Folders" emerge as pages with children.
- Block editor via **BlockNote** (React, TipTap/ProseMirror-based): slash menu, drag-handle reordering, headings, lists, to-do checkboxes, quote, code, divider, tables, images — themed to the app.
- Page tree rail: expand/collapse, select, create, drag to re-nest/reorder, soft-delete.
- Per-page emoji icon + title.
- Presets (New-page picker): Blank, To-do list, Meeting notes, Daily journal, Project tracker.
- Image upload via **Vercel Blob** (paste/drop).
- Autosave (debounced).
- Mobile: tree collapses to a drawer; editor full-width.

**Out of scope (explicit, future):** databases/table-views with multiple view types, inline @-mentions, comments, real-time multi-user collaboration, sharing/permissions, page history/versions, embeds beyond images, public publishing. The architecture must not preclude these, but they are not built in v1.

## Non-goals
- Not branded "Notion" in the UI (trademark) — the product label is **Notes**.
- No migration of existing journal/notes data into this section in v1.

---

## Architecture

### Naming & navigation
- New built-in screen labeled **Notes**, icon a notebook (lucide `NotebookPen` or `FileText`), pinned in `app-sidebar.tsx` and `mobile-menu.tsx` directly under Calendar.
- Routes: `/notes` (empty state + tree) and `/notes/[pageId]` (selected page in the editor).
- No per-user seeding required (unlike Calendar): an empty tree is valid; pages are created on demand. A small client `NotesProvider` is **not** needed — the screen fetches its own data.

### Data model — new `NotesPage` Mongoose model
File: `src/lib/models/notes-page.ts`. Distinct from the custom-entry/section-template system (block content + a tree don't fit fields/entries).
```ts
interface INotesPage {
  userId: ObjectId;
  parentId: ObjectId | null;   // null = root-level page
  title: string;               // default "Untitled"
  icon: string;                // emoji, default "📄"
  content: unknown;            // BlockNote document JSON (array of blocks)
  order: number;               // float; sibling sort, drag-reorder without renumbering
  archived: boolean;           // soft-delete
  createdAt: Date;
  updatedAt: Date;
}
```
Indexes: `{ userId, parentId }` (tree fetch), `{ userId, archived }`.

### Tree building
Pure function `buildPageTree(pages: FlatPage[]): TreeNode[]` in `src/lib/notes/page-tree.ts`:
- Groups by `parentId`, sorts each sibling group by `order` then `createdAt`.
- Attaches children recursively; pages whose `parentId` no longer resolves are treated as root (orphan safety).
- Returns `{ id, title, icon, children: TreeNode[] }[]`.

### Reorder / re-nest math
Pure helper `orderBetween(prev?: number, next?: number): number` in `src/lib/notes/order.ts`:
- Midpoint between neighbors (`(prev+next)/2`); if dropping at start → `next - 1`; at end → `prev + 1`; empty list → `0`.
- Drag sets the page's `parentId` (new container) and `order` (between drop neighbors), persisted via PATCH.

### API routes (all scoped by `userId`, mirroring existing entry routes' auth pattern)
- `GET /api/notes` → `{ pages: FlatPage[] }` (non-archived, `content` omitted for list payload weight — include only `id,parentId,title,icon,order`).
- `POST /api/notes` → body `{ parentId?: string|null, title?: string, preset?: PresetKey }`; creates a page, seeding `content` from the preset (default Blank). Returns the created page.
- `GET /api/notes/[id]` → full page incl. `content`, scoped `{ _id, userId }`.
- `PATCH /api/notes/[id]` → partial update of `{ title?, icon?, content?, parentId?, order? }`, scoped `{ _id, userId }`. Used by autosave, rename, icon change, and drag.
- `DELETE /api/notes/[id]` → soft-delete: set `archived: true` on the page **and all descendants** (recursive over `parentId`).
- `POST /api/notes/upload` → image upload to Vercel Blob; returns `{ url }`. Validates content-type (image/*) and size cap (e.g. 10MB).

Validation via Zod schemas in `src/lib/validations.ts` (`notesPageCreateSchema`, `notesPageUpdateSchema`).

### Editor & persistence
- `src/components/notes/notes-editor.tsx`: wraps BlockNote `useCreateBlockNote` + `<BlockNoteView>`, themed via app CSS tokens (light/dark per existing theme). Configured with the Vercel Blob `uploadFile` handler hitting `/api/notes/upload`.
- **Autosave:** a `useDebouncedSave` hook (~600ms idle) PATCHes `content`; title/icon edits PATCH immediately on blur. Save status indicator ("Saving…/Saved"). Optimistic — the editor is the source of truth between saves.

### Presets
`src/lib/notes/presets.ts` — pure functions returning starter BlockNote block arrays, keyed by `PresetKey = "blank" | "todo" | "meeting" | "journal" | "project"`:
- **blank** → one empty paragraph.
- **todo** → "To-dos" heading + three checkBox blocks.
- **meeting** → headings/fields: Date, Attendees, Agenda, Notes, Action items (checkbox list).
- **journal** → dated H1 + prompts: Highlights, Gratitude, Notes.
- **project** → Goals, Milestones (checkbox list), Notes sections.
`PRESETS` registry (key, label, description, icon, `build()`), consumed by the New-page picker and `POST /api/notes`.

### Page tree component
`src/components/notes/page-tree.tsx`: renders `buildPageTree` output; expand/collapse with persisted-in-memory open state; select navigates to `/notes/[id]`; "+ New page" opens the preset picker (`src/components/notes/new-page-menu.tsx`); drag via `@dnd-kit` (already a dependency) to re-nest/reorder → PATCH `{ parentId, order }`; per-row "…" menu (rename, delete).

### Screen shell
`src/app/(app)/notes/layout.tsx` renders the two-pane shell (tree rail + outlet); `notes/page.tsx` is the empty/welcome state; `notes/[pageId]/page.tsx` loads the editor. Tree rail is `hidden md:block`; on mobile a drawer toggled from a header button. The Notes screen is full-bleed within `ContentShell` (add `/notes` to the full-bleed check, or render its own height-managed shell).

---

## File structure

- `src/lib/models/notes-page.ts` — model.
- `src/lib/notes/page-tree.ts` + test — tree builder.
- `src/lib/notes/order.ts` + test — order math.
- `src/lib/notes/presets.ts` + test — preset block generators + registry.
- `src/lib/validations.ts` — add notes Zod schemas.
- `src/app/api/notes/route.ts` — GET list, POST create.
- `src/app/api/notes/[id]/route.ts` — GET, PATCH, DELETE.
- `src/app/api/notes/upload/route.ts` — Blob upload.
- `src/components/notes/notes-editor.tsx` — BlockNote wrapper + autosave.
- `src/components/notes/page-tree.tsx` + `new-page-menu.tsx` — tree + preset picker.
- `src/hooks/use-debounced-save.ts` + test.
- `src/app/(app)/notes/layout.tsx`, `notes/page.tsx`, `notes/[pageId]/page.tsx`.
- Nav: edit `src/components/layout/app-sidebar.tsx`, `src/components/layout/mobile-menu.tsx`, `src/components/layout/content-shell.tsx` (full-bleed), `src/components/layout/top-bar.tsx` (page title).
- Deps: add `@blocknote/core`, `@blocknote/react`, `@blocknote/mantine` (styles), `@vercel/blob`.

## Dependencies / infra
- New npm deps above (pnpm).
- **User provisions** a Vercel Blob store and sets `BLOB_READ_WRITE_TOKEN` (local `.env.local` + Vercel project env). Documented in the plan.

## Testing strategy
- **Unit (Vitest):** `buildPageTree` (nesting, sibling order, orphan→root); `orderBetween` (start/middle/end/empty); each preset generator returns valid non-empty blocks; `useDebouncedSave` fires exactly one save after rapid edits.
- **Component (RTL):** page-tree renders nested rows, selecting navigates, new-page menu lists presets.
- **Manual:** slash menu, drag reorder/re-nest, image paste→Blob, autosave indicator, mobile drawer, dark mode.
- E2E (Cypress) optional fast-follow; not gating v1.

## Rollout
One feature branch. Lint + build + Vitest must pass (existing CI gate). The Blob token must be set in Vercel before image upload works in production; text/blocks work without it. Deploy after user confirmation.

## Risks / notes
- BlockNote ships its own CSS/theme (Mantine) — must be scoped so it doesn't leak into the rest of the app; theme-map to existing tokens for visual consistency.
- BlockNote is ESM/client-only — the editor component is `"use client"` and must be dynamically imported (`next/dynamic`, `ssr:false`) to avoid SSR issues.
- Large `content` documents: list endpoint omits `content`; only the open page fetches it.

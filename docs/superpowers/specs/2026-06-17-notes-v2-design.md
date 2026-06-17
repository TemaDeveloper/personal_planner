# Notes v2 — sub-pages, customization, template library — Design

**Date:** 2026-06-17
**Status:** Approved (pending spec review)

## Problem / goal

Extend the shipped Notes (Notion-style) section toward closer Notion parity with three enhancements, built together as "Notes v2":

- **A.** `/page` slash command that creates a child page and embeds a **live sub-page block** in the parent (page-in-page, recursive).
- **B.** Richer page customization: an **emoji picker** for the page icon and a **cover/header image**.
- **C.** A browsable **template library** grouped by life-area (Basic, Students, Hobbies, Work & Productivity, Personal & Health), picked when creating a page.

Builds directly on the existing Notes feature (`NotesPage` model, `/notes` routes, BlockNote editor, `/api/notes*` routes, preset system).

## Scope

**In scope:**
- Custom BlockNote `subPage` block + a "Page" slash-menu item that creates a child and inserts the block.
- Live title/icon in the sub-page block via a shared page-list context; muted "(deleted)" state when the child is gone.
- Emoji picker popover for the page icon (`@emoji-mart`).
- Cover image (new `coverUrl` field; banner with Add/Change/Remove; upload reuses the Blob route).
- Template library registry (~17 templates across 5 categories) + a gallery modal replacing the new-page dropdown.
- `POST /api/notes` accepts `template: string` (registry-validated).

**Out of scope / deferred (explicit):**
- Cover **repositioning** (fixed full-width banner in v2).
- **Image-as-icon** (emoji-only icons in v2).
- Drag-reordering *between* siblings (still append-on-re-nest, unchanged from v1).
- User-authored/saved custom templates (the library is a fixed built-in set in v2).
- Real-time collab, comments, mentions (unchanged out-of-scope).

## Non-goals
- No change to the existing nesting/tree, autosave, or auth model beyond what these features require.

---

## Architecture

### A. `/page` inline sub-pages

**Custom block** (`src/components/notes/blocks/sub-page-block.tsx`): a BlockNote custom block via `createReactBlockSpec`, type `"subPage"`, prop `pageId: string`. Render: looks up the child in the page-list context and shows `icon + title` as a clickable row (routes to `/notes/[pageId]` via `useRouter`). If the child is missing (deleted/archived), render a muted "Untitled (deleted)" non-link.

**Editor schema:** `notes-editor.tsx` builds a custom schema = default blocks + `subPage`. `useCreateBlockNote({ schema, initialContent, uploadFile })`.

**Slash item:** add a "Page" item (label "Page", subtext "Create a sub-page") to the slash menu. On select:
1. `POST /api/notes { parentId: currentPageId, template: "blank" }` → `{ page: { id } }`.
2. Insert a `subPage` block (`editor.insertBlocks([{ type: "subPage", props: { pageId: id } }], referenceBlock, "after")`).
3. Call `refresh()` (from `useNotesRefresh`) so the tree rail shows the new child.

The editor needs `currentPageId` (already passed as `pageId` prop) and `refresh` (use `useNotesRefresh()`).

**Live title/icon context:** `NotesScreen` already holds the flat `pages` list. Add a `NotesPagesContext` exposing `pages` (and keep `useNotesRefresh`). Export `useNotesPages()`. The `subPage` block consumes it. (Both contexts provided by `NotesScreen`, which wraps the routed editor — consumer is nested in provider.)

Recursion is automatic: each child page is itself a `/notes/[id]` editor that can contain its own `subPage` blocks.

### B. Page customization

**Model:** add `coverUrl?: string` to `INotesPage` + schema (`src/lib/models/notes-page.ts`). Include in GET `[id]` response and allow in `notesPageUpdateSchema` (`coverUrl: z.string().url().max(1000).nullable().optional()`).

**Emoji picker** (`src/components/notes/emoji-picker-button.tsx`): wraps `@emoji-mart/react` `Picker` (data from `@emoji-mart/data`) in a popover. The page header icon becomes a button; clicking opens the picker; selecting calls `onPick(emoji)` → `PATCH {icon}` → `refresh()`. Replaces the raw `<input>` icon field in `[pageId]/page.tsx`.

**Cover image** (`src/components/notes/page-cover.tsx`): if `coverUrl` set, render a full-width banner (e.g. `h-44`, `object-cover`); on hover show **Change** + **Remove**. If unset, an **Add cover** button near the title. Upload: file input → `POST /api/notes/upload` (existing) → `PATCH {coverUrl}` → `refresh()`. Remove → `PATCH {coverUrl: null}`. The page header (`[pageId]/page.tsx`) composes: cover → icon (emoji picker) → title → editor.

### C. Template library

**Registry** (`src/lib/notes/templates.ts`):
```ts
export interface NotesTemplate {
  key: string;
  category: "Basic" | "Students" | "Hobbies" | "Work & Productivity" | "Personal & Health";
  label: string;
  description: string;
  icon: string;        // emoji
  build: () => PresetBlock[];
}
export const TEMPLATES: NotesTemplate[];
export function buildTemplate(key: string): PresetBlock[]; // falls back to blank for unknown keys
export const TEMPLATE_CATEGORIES: NotesTemplate["category"][];
```
- **Basic:** blank, todo, meeting, journal, project (moved from `presets.ts`; `presets.ts` re-exports `buildTemplate` as `buildPreset` for back-compat, or callers updated).
- **Students:** study planner, course/lecture notes, assignment & exam tracker, reading notes.
- **Hobbies:** hobby tracker, project log, practice journal, collection list.
- **Work & Productivity:** meeting notes (alias), project tracker, OKRs/goals, weekly planner.
- **Personal & Health:** daily journal (alias), habit tracker, workout log, travel plan.
Each `build()` returns a `PresetBlock[]` of headings/paragraphs/checkListItems (same block vocabulary as v1 presets).

**Gallery modal** (`src/components/notes/template-gallery.tsx`): replaces the `NewPageMenu` dropdown. Opens from "+ New page". Shows templates grouped by `TEMPLATE_CATEGORIES` as sections of cards (icon + label + description). Selecting a card → `POST /api/notes { parentId, template: key }` → route to the new page. Reuses the existing modal component if present, else a lightweight overlay.

**API:** `notesPageCreateSchema` — replace `preset` enum with `template: z.string().max(60).optional()`. `POST /api/notes` seeds content via `buildTemplate(template ?? "blank")`, and sets the page `icon` from the template's `icon` (so a new "Workout log" page starts with its emoji). Returns the created page incl. icon.

---

## File structure

- Modify: `src/lib/models/notes-page.ts` (+`coverUrl`).
- Modify: `src/lib/validations.ts` (`template` string in create; `coverUrl` in update).
- Create: `src/lib/notes/templates.ts` (+ test) — registry + `buildTemplate`.
- **Remove** `src/lib/notes/presets.ts` and `src/lib/notes/__tests__/presets.test.ts` — the 5 base presets move into `templates.ts` (category "Basic"); `templates.ts` is the single source of truth. The only importer is `POST /api/notes`, updated to `buildTemplate`. Replace presets.test with `templates.test.ts`. (`PresetBlock` type moves to `templates.ts` and is exported from there.)
- Modify: `src/app/api/notes/route.ts` (POST uses `buildTemplate`, sets icon); `src/app/api/notes/[id]/route.ts` (GET returns `coverUrl`; PATCH allows it).
- Create: `src/components/notes/blocks/sub-page-block.tsx` — custom block.
- Modify: `src/components/notes/notes-editor.tsx` — custom schema, "Page" slash item.
- Modify: `src/components/notes/notes-screen.tsx` — add `NotesPagesContext` + `useNotesPages`.
- Create: `src/components/notes/emoji-picker-button.tsx`, `src/components/notes/page-cover.tsx`, `src/components/notes/template-gallery.tsx`.
- **Remove** `src/components/notes/new-page-menu.tsx`; `PageTree` renders a "+ New page" button that opens `<TemplateGallery>` instead. (Gallery owns the create+route logic the old menu had.)
- Modify: `src/app/(app)/notes/[pageId]/page.tsx` — compose cover + emoji-picker icon + title + editor; load `coverUrl`.
- Deps: `emoji-mart`, `@emoji-mart/data`, `@emoji-mart/react`.

## Testing strategy
- **Unit (Vitest):**
  - `buildTemplate` returns ≥1 block for every key in `TEMPLATES`; unknown key → blank (1 paragraph).
  - `TEMPLATES` includes all 5 categories; `TEMPLATE_CATEGORIES` lists them in order; every template has label/description/icon.
  - Create schema accepts `{ template: "study-planner" }` and `{}`; update schema accepts `{ coverUrl: "https://…" }` and `{ coverUrl: null }`, rejects a non-URL coverUrl.
  - A pure helper for the sub-page block props (e.g. `subPageBlockSpec` shape) if extractable; otherwise cover via manual.
- **Manual:** `/page` creates a child + live block that navigates and reflects renames; emoji picker sets icon; cover add/change/remove; gallery creates pages from each category; nesting still works; mobile.
- BlockNote custom-block + emoji-mart are client-only — keep within the dynamically-imported editor / client components (no SSR).

## Dependencies / infra
- `emoji-mart` + `@emoji-mart/data` + `@emoji-mart/react` (npm/pnpm).
- Cover/image upload reuses the existing Blob route — still needs `BLOB_READ_WRITE_TOKEN` for uploads to work in production (text/templates/sub-pages work without it; the cover "Add" shows the same 503 message if unset).

## Rollout
One branch (`feat/notes-v2`). Lint + build + Vitest gate. Deploy after user confirmation.

## Risks / notes
- BlockNote custom blocks (`createReactBlockSpec`) + custom schema must match the installed 0.51.x API; the editor stays client-only/dynamically imported. If the custom-block API differs, adapt within the editor component.
- emoji-mart bundle size is non-trivial; it's inside the client-only editor/header path so it won't bloat SSR or other routes.
- `coverUrl` stored as a Blob URL; removing a cover doesn't delete the blob (acceptable; blob cleanup is a future nicety).

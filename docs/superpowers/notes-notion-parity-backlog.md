# Notes → Notion parity backlog

Goal: make the Notes section feel/behave like Notion (Pro), free & out-of-the-box. Living doc — updated each `/goal` iteration. Branch `feat/notes-notion-parity`.

## Already shipped (v1 + v2)
- Nestable pages (infinite), page tree rail, drag-to-re-nest, delete-cascade, autosave.
- BlockNote editor with default blocks already available via slash: paragraph, headings, bullet/numbered/check/toggle lists, quote, code block, table, image, video, audio, file.
- `/page` live sub-page block; template library (gallery, ~21 templates); emoji picker; cover images (private Blob via authenticated route).

## Parity gaps (prioritized)
1. **Full-width expandable layout** — replace the centered `max-w-3xl` column with a wide, full-bleed workspace (Notion "full width" feel). [ITER 1 — in progress]
2. **Broader `/` slash menu** — ensure ALL default BlockNote blocks are surfaced + grouped (Basic / Lists / Media / Advanced), with good labels/aliases. Currently only defaults + /page are wired.
3. **Callout block** — custom block: icon + colored background.
4. **Divider** — `/divider` horizontal rule (custom block; not in BlockNote defaults).
5. **Columns / multi-column layout** — add `@blocknote/xl-multi-column` (`/2 columns`, `/3 columns`).
6. **Toggle headings** — expose BlockNote's `isToggleable` heading variant in the slash menu.
7. **Text color & highlight** — formatting toolbar + `/color` style commands (BlockNote supports text/background color).
8. **Bookmark / web embed** — `/bookmark` link-preview card; BlockNote embed blocks.
9. **Table of contents** — custom block listing the page's headings, click-to-scroll.
10. **Math equation** — `/math` inline + block (KaTeX).
11. **Resizable / collapsible page-tree rail** — drag to resize, collapse toggle (expandable workspace).
12. **Per-page "full width" toggle** + page options menu (Notion-style ··· menu: width, lock, etc.).
13. **Inline page links / @-mentions** — link to other pages; `@` mention menu.
14. **Favorites / quick switcher** — pin pages, Ctrl-P style search across pages.
15. **Breadcrumbs** — show the page's ancestor path at the top.
16. **Drag blocks across / nested indentation polish**, block ··· menu (duplicate, move, color) — mostly BlockNote built-in; verify exposed.

## Notes / decisions
- Keep BlockNote as the foundation; extend via custom blocks + slash items + extension packages.
- Out of scope for now (heavy / multi-user / backend-deep): real-time collaboration, comments, synced blocks across pages, full database views (board/calendar/gallery with filters), permissions/sharing, public publishing, version history. Revisit if requested.

## Sources
- BlockNote built-in blocks: https://www.blocknotejs.org/docs/block-types
- BlockNote multi-column: https://www.blocknotejs.org/docs/features/blocks (xl-multi-column)
- Notion slash commands: https://www.notion.com/help/guides/using-slash-commands

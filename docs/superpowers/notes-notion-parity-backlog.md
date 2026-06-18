# Notes → Notion parity backlog

Goal: make the Notes section feel/behave like Notion (Pro), free & out-of-the-box. Living doc — updated each `/goal` iteration. Branch `feat/notes-notion-parity`.

## Already shipped (v1 + v2)
- Nestable pages (infinite), page tree rail, drag-to-re-nest, delete-cascade, autosave.
- BlockNote editor with default blocks already available via slash: paragraph, headings, bullet/numbered/check/toggle lists, quote, code block, table, image, video, audio, file.
- `/page` live sub-page block; template library (gallery, ~21 templates); emoji picker; cover images (private Blob via authenticated route).

## Parity gaps (prioritized)
1. ~~**Full-width expandable layout**~~ ✅ DONE (iter 1) — centered column replaced with full-width page.
2. ~~**Broader `/` slash menu**~~ ✅ DONE — default BlockNote items already surface headings/lists/toggle/quote/code/table/image/video/audio/file; custom items added for sub-page, callout, divider, columns.
3. ~~**Callout block**~~ ✅ DONE (iter 2).
4. ~~**Divider**~~ ✅ DONE (iter 2).
5. ~~**Columns / multi-column layout**~~ ✅ DONE (iter 3) — `@blocknote/xl-multi-column` wired (schema + slash items + drop cursor).
6. **Toggle headings** — expose BlockNote's `isToggleable` heading variant in the slash menu.
7. **Text color & highlight** — formatting toolbar + `/color` style commands (BlockNote supports text/background color).
8. ~~**Bookmark / web embed**~~ ✅ DONE (iter 7) — `/bookmark` paste-a-link preview card; server unfurl route with SSRF guard (isPublicHttpUrl, TDD) + OG-meta parser (extractMeta, TDD) + redirect-hop validation.
9. ~~**Table of contents**~~ ✅ DONE (iter 6) — live ToC block (collectHeadings helper, TDD), click-to-scroll, updates on edit.
10. **Math equation** — `/math` inline + block (KaTeX).
11. ~~**Resizable / collapsible page-tree rail**~~ ✅ DONE — collapse toggle (iter 4) + drag-to-resize divider (iter 9), both persisted.
12. **Per-page "full width" toggle** + page options menu (Notion-style ··· menu: width, lock, etc.).
13. **Inline page links / @-mentions** — link to other pages; `@` mention menu.
14. **Favorites / quick switcher** — pin pages, Ctrl-P style search across pages.
15. ~~**Breadcrumbs**~~ ✅ DONE (iter 5) — root→current ancestor path, clickable, cycle-safe helper.
16. **Drag blocks across / nested indentation polish**, block ··· menu (duplicate, move, color) — mostly BlockNote built-in; verify exposed.

## Notes / decisions
- Keep BlockNote as the foundation; extend via custom blocks + slash items + extension packages.
- Out of scope for now (heavy / multi-user / backend-deep): real-time collaboration, comments, synced blocks across pages, full database views (board/calendar/gallery with filters), permissions/sharing, public publishing, version history. Revisit if requested.

## Sources
- BlockNote built-in blocks: https://www.blocknotejs.org/docs/block-types
- BlockNote multi-column: https://www.blocknotejs.org/docs/features/blocks (xl-multi-column)
- Notion slash commands: https://www.notion.com/help/guides/using-slash-commands

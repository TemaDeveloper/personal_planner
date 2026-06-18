# Notion Rendered-Design Spec (Playwright teardown)

Source: 3 public templates inspected with Playwright (Chromium @ 1440px) — computed CSS, DOM class taxonomy, and screenshots. All values are **[observed]** from the live rendered pages, not docs.
Artifacts: `scripts/notion-inspect/out/render/` (summary.json, *-classes.json, *-viewport.png, *-full.png).

## 1. Typography (exact, rendered)
Font stack: `ui-sans-serif, -apple-system, system-ui, "Segoe UI Variable Display", "Segoe UI", Helvetica, …` — **Notion uses the system UI stack by default, not Inter.**

| Element | font-size | line-height | weight |
|---|---|---|---|
| Page title | 40px | 48px (1.2) | 700 |
| H1 (`header`) | 30px | 39px (1.3) | 600 |
| H2 (`sub_header`) | 24px | 31.2px (1.3) | 600 |
| H3 (`sub_sub_header`) | 20px | 26px (1.3) | 600 |
| Body (`text`) | 16px | 24px (1.5) | 400 |

Primary text color: **`rgb(44,44,43)` = #2C2C2B**. (Our Phase-0 scale 40/30/24/20 + body 16/24 already matches; the divergence is elsewhere — see §5.)

## 2. Layout geometry
- Full-width pages render content at **1248px with 96px side gutters** at a 1440px viewport (i.e. gutter ≈ 6.7vw, not a fixed max-width). All three templates are full-width.
- Non-full-width Notion pages use a ~708–900px centered column (not measured here; these were all full-width).
- `notion-page-content` has `padding-top: 8px`; blocks get ~8px vertical rhythm.

## 3. Component taxonomy (DOM classes, by frequency)
`notion-selectable` wraps every block. Block classes: `notion-text-block`, `notion-header-block` / `sub_header` / `sub_sub_header`, `notion-callout-block`, `notion-quote-block`, `notion-bulleted_list-block`, `notion-to_do-block`, `notion-toggle-block`, `notion-image-block`, `notion-button-block`, `notion-divider-block`, `notion-column_list-block` / `notion-column-block`, `notion-page-block` (sub-page), `notion-collection_view-block` (database).

Database internals: `notion-collection-view-tab` / `-tab-button` (the **view switcher**), `notion-table-view-header-row` / `-cell`, `notion-board-group`, `notion-calendar-view-day`, `notion-collection-item`, `notion-collection-filter` / `-sort`, `notion-record-icon`. Page chrome: `notion-topbar`, `notion-sidebar`, `notion-frame`, `notion-record-icon`.

## 4. Callout & database tints (rendered)
- Callout padding 8px all sides, small border-radius, borderless.
- `purple_background` tint renders as **`rgb(243,235,249)` = #F3EBF9** (our token had #F6F3F9 — close but not exact).
- Light hover/zebra greys observed: `rgba(42,28,0,0.07)`, `rgba(66,35,3,0.03)` (warm-tinted, not pure grey).
- Status/select chips colored per-option; rollup rendered as a **progress ring**.

## 5. Where OUR app diverges (why it "doesn't look the same")
1. **Databases are entirely missing** — and these templates are *dominated* by them: calendar/board/gallery/table/timeline/list/chart views, each behind a **view-switcher tab bar**. This is the #1 visual gap.
2. **Button block** missing (Japanese template uses 6 as card CTAs).
3. **View-tab switcher** component (`</> By Chapter | Table`) — distinct horizontal tab strip above a database.
4. **Full-width gutter model**: Notion uses ~96px fluid side gutters; our full-width uses `px-6/14/20`. Match the ~96px (6–7vw) gutter for parity.
5. **Font**: Notion default = system-ui; we scoped Inter to Notes. Minor, but switch Notes to the system stack for true parity (or keep Inter as a deliberate choice).
6. **Callout tints** are ~1 step off Notion's exact rendered values (e.g. purple #F3EBF9 vs our #F6F3F9). Re-derive the 9 tints from rendered values for pixel parity.
7. **Relations + rollups** (progress ring) — needed for the Python roadmap look.

## 6. Verdict
Block/typography parity is essentially correct. The reason these pages look different in our app is **structural, not stylistic**: two of the three templates are database documents, and we render none of the database view family. The faithful-copy path is to build `collection_view` (shared schema → multi-view: table/board/calendar/gallery/list/timeline) with a view-switcher tab bar, colored select/status chips, and relation/rollup support. Secondary: Button block, exact tint re-derivation, system font, 96px gutter.

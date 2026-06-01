# Work earnings + gas/routes in Excel export & shared view

**Date:** 2026-05-31
**Status:** Approved

## Goal

When the "work" section is exported to Excel or viewed via a shared link, show how
much money was earned and the gas cost of all driving.

- Each work row shows: **Job Name, Date, Hours, Note, Total** (Total = Hours × the
  job's hourly rate).
- Below the table, a **TOTAL block**: gross earnings, gas cost, and **Net** (earnings − gas).
- A **Gas & Routes** section listing every route (all time) with the computed gas total.

## Surfaces

1. Excel export (`.xlsx`) — `/api/export/[section]` (the styled per-section download).
2. Shared link view — `/api/shared/[token]` + the public viewer page.

## Computations — `src/lib/work-report.ts` (new, pure functions)

### Earnings
- Input: work sessions `{ jobName, date, hours, note }[]` + jobs `{ name, hourlyRate }[]`.
- For each session: look up rate by `jobName` (case-sensitive exact match); `rowTotal = hours × rate`.
  Missing job or rate → `rowTotal = 0`.
- Output: rows with an added `total` field, plus `grossEarnings` = sum of row totals.

### Gas
- Input: `totalKm` (sum of all routes' `distanceKm`) + `workConfig.gasPrice` (cents/litre)
  and `workConfig.carConsumption` (L/100km).
- Reuse existing `calculateGasCost(totalKm, { gasPriceCentsPerLitre, carConsumptionLPer100km })`
  → `{ totalKm, litresUsed, totalCostDollars, costPerKm }`.

### Net
- `net = grossEarnings − gas.totalCostDollars`.

A single helper `buildWorkReport({ sessions, jobs, routes, workConfig })` returns:
`{ rows, grossEarnings, gas, net }` where `rows` include `total`, and a `routeRows`
projection `{ date, origin, destination, distanceKm }`.

## Excel — `src/lib/excel.ts`

Extend `generateExcel(sheetName, columns, rows, options?)` with an optional 4th arg:

```ts
interface ExcelOptions {
  summaryRows?: { label: string; value: number | string; currency?: boolean }[];
  sections?: { title: string; columns: ExcelColumn[]; rows: Record<string, unknown>[] }[];
}
```

- `summaryRows` render as bold `label | value` lines, two rows below the main table.
  `currency: true` applies the `#,##0.00` number format.
- Each `sections` entry renders below the summary as a titled sub-table (title row styled
  like the sheet title, then its own header + data rows, reusing the existing styling helpers).
- When `options` is omitted, output is byte-for-byte identical to today (existing tests must pass).

Single stacked sheet. No extra worksheet tabs.

## Excel route — `src/app/api/export/[section]/route.ts`

`buildExport` return type gains optional `summaryRows` and `sections`. The `work` case:
1. Load `User.workConfig` (jobs, gasPrice, carConsumption) and all `Route` docs (all time, ignoring date filter).
2. Call `buildWorkReport`.
3. Columns: `Job Name, Date, Hours, Note, Total`. Rows include `total`.
4. `summaryRows`: Gross earnings (currency), Gas cost (currency), **Net** (currency).
5. `sections`: one "Gas & Routes — all routes, all time" section with columns
   `Date, Origin, Destination, Distance (km)` and the route rows, followed by its own
   summary line (total km, litres, gas cost) — implemented as trailing rows in that section.
6. Pass `summaryRows`/`sections` through to `generateExcel`. Other sections unchanged.

## Shared route — `src/app/api/shared/[token]/route.ts`

`work` case: build the same report. The JSON payload gains:
- `data`: work rows including `Total` (keys renamed for display: `Job Name, Date, Hours, Note, Total`).
- `summary`: `{ grossEarnings, gasCost, net, totalKm, litres }`.
- `routes`: `{ date, origin, destination, distanceKm }[]`.

`stripInternalFields` still applies to `data`. `summary`/`routes` are server-built (no internal
fields) and returned alongside. Other section types return `summary: null, routes: null`.

`sectionType` is already a free-form string, so "work" needs no model change.

## Public viewer page

Below the existing data table, when `summary` is present render a **totals card**
(Gross earnings / Gas cost / Net). When `routes` is present render a **routes table**
(Date / Origin / Destination / Distance km). Both are read-only and styled like the
existing viewer table.

## Tests

- `src/lib/__tests__/work-report.test.ts` (new): earnings with normal/zero/missing rates,
  gas math, net, route projection.
- `src/lib/__tests__/excel.test.ts` (extend): `summaryRows` and `sections` render and place
  cells where expected; omitting `options` preserves current output.

## Non-goals

- Routes are not job-linked (no `jobName` on the Route model), so the gas section always
  covers **all** routes for all time, even for a single-job export. Labeled as such.
- No maps / distance API; distances remain manual entry.
- CSV export page and on-screen `/work` page are out of scope (Excel + shared only).

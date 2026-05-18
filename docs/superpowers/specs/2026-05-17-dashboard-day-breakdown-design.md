# Dashboard Day Breakdown with Inline Editing

**Date:** 2026-05-17  
**Scope:** New dashboard feature — tap a day on the calendar, see detailed section breakdown with inline edit/add/delete

---

## Overview

Replace the current small section chips that appear when tapping a day on the dashboard calendar with a full detailed breakdown showing actual data per section. Each section's data is inline-editable.

## New API Endpoint

### `GET /api/dashboard/day-detail?date=2026-05-17`

Returns all section data for a specific date in one call. Only returns sections the user has enabled.

**Response:**
```json
{
  "work": [{ "_id": "...", "jobName": "Advapay", "hours": 5.5, "note": "..." }],
  "gym": [{ "_id": "...", "date": "2026-05-17" }],
  "habits": [{ "_id": "...", "habitId": "...", "name": "Read", "emoji": "📖", "completed": true }],
  "study": [{ "_id": "...", "subject": "Math", "minutes": 45 }],
  "hobbies": [{ "_id": "...", "hobby": "Guitar", "minutes": 30 }],
  "housework": [{ "_id": "...", "choreName": "Dishes", "completed": true }],
  "health": [{ "_id": "...", "water": 2.5, "sleepHours": 7, "weight": 80, "mood": 4 }],
  "journal": [{ "_id": "...", "content": "Good day...", "mood": 4 }],
  "reading": [],
  "shopping": [],
  "mealprep": [{ "_id": "...", "meals": [...] }],
  "goals": [],
  "finances": { "expenses": [...], "routes": [...] }
}
```

Only sections with data for that day are included in the response. Empty sections are omitted.

## UI Component

### `DashboardDayDetail`

**Location:** `src/components/dashboard/dashboard-day-detail.tsx`

**Props:**
- `date: string` — selected date in `yyyy-MM-dd` format
- `enabledSections: SectionId[]`
- `onClose: () => void`
- `onDataChange: () => void` — callback to refresh dashboard cards/calendar after edits

**Behavior:**
- Fetches `/api/dashboard/day-detail?date=...` when date changes
- Shows a loading skeleton while fetching
- Renders one collapsible card per section that has data
- Each card shows section-specific data with inline controls

### Per-Section Rendering

Each section type has its own inline display and edit pattern:

| Section | Display | Edit | Add |
|---------|---------|------|-----|
| Work | Job name, hours, note | Edit hours/note inline | Add session form (job picker, hours, note) |
| Gym | "Attended" badge | Toggle attendance (delete) | Toggle attendance (create) |
| Habits | List of habits with check/uncheck | Toggle completion | Toggle completion |
| Study | Subject, minutes, note | Edit minutes/note | Add session form |
| Hobbies | Hobby name, minutes, note | Edit minutes/note | Add session form |
| Housework | Chore name, completed status | Toggle completion, delete | Add chore form |
| Health | Water, sleep, weight, mood | Edit values inline | Create log form |
| Journal | Content preview, mood | Edit content/mood | Create entry form |
| Reading | Book title, pages read | Edit pages | — |
| Shopping | List name, pending count | — (link to section) | — |
| Mealprep | Meals list | — (link to section) | — |
| Finances | Expenses and routes | Edit/delete expense | Add expense form |

### Edit Pattern

- Tap an entry → it expands into an inline edit form (same fields as the section's add form)
- Save button commits via the existing section API route (e.g., `PATCH /api/work/sessions/:id`)
- Delete button with confirmation via `DELETE` to the same route
- Cancel collapses back to view mode
- After save/delete, refetch day-detail and trigger `onDataChange`

### Add Pattern

- "+" button at the bottom of each section card
- Opens an inline form within the card
- Submits via the existing section `POST` route
- After success, refetch day-detail and trigger `onDataChange`

## Integration with Existing Dashboard

### Changes to `dashboard-calendar.tsx`

- Replace the current chips display (lines 144-167) with `<DashboardDayDetail>` when a day is selected
- Pass `onDataChange` to refresh the activity dots on the calendar

### Changes to `dashboard/page.tsx`

- No changes needed — the calendar component handles its own state

## Mutation API Routes

No new mutation routes. All edits use existing routes:

- `POST/PATCH/DELETE /api/work/sessions[/:id]`
- `POST/DELETE /api/gym/workouts[/:id]`
- `POST /api/habits/:id/log`
- `POST/PATCH/DELETE /api/study/sessions[/:id]`
- `POST/PATCH/DELETE /api/hobbies/sessions[/:id]`
- `POST/PATCH/DELETE /api/housework[/:id]`
- `POST/PATCH /api/health[/:id]`
- `POST/PATCH /api/journal[/:id]`
- `POST/PATCH/DELETE /api/expenses[/:id]`
- `POST/PATCH/DELETE /api/routes[/:id]`

## Files Affected

| File | Change |
|------|--------|
| `src/app/api/dashboard/day-detail/route.ts` | Create — new aggregation endpoint |
| `src/components/dashboard/dashboard-day-detail.tsx` | Create — main day breakdown component |
| `src/components/dashboard/dashboard-calendar.tsx` | Modify — render DashboardDayDetail instead of chips |

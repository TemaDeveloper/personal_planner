# Supervisor Sharing & Excel Export

## Overview

Two features:
1. **Supervisor view-only sharing** — share a specific section (scoped to e.g. one job) with another person via magic link or account-based access, with email invitations via Resend.
2. **Excel export** — download any section's data as `.xlsx`, including custom sections.

## ShareToken Model

```
ShareToken {
  _id: ObjectId
  token: string (unique, crypto.randomUUID)
  ownerId: ObjectId (ref User)

  sectionType: string       // "work", "gym", "habits", "study", "hobbies",
                            // "housework", "health", "goals", "reading",
                            // "journal", "finances", "shopping", "mealprep",
                            // or "custom:<slug>"
  scopeFilter: string|null  // e.g. job name for work section; null = entire section

  inviteeEmail: string|null // null = pure magic link; set = account-based share
  permission: "view"        // only "view" for now, extensible later

  expiresAt: Date|null      // null = never expires
  revokedAt: Date|null      // set when owner revokes

  label: string             // owner's note, e.g. "For my manager John"
  createdAt, updatedAt
}

Indexes: token (unique), ownerId, inviteeEmail
Valid when: revokedAt is null AND (expiresAt is null OR expiresAt > now)
```

## API Endpoints

### Share management (authenticated, owner only)

- `POST /api/shares` — Create share token. Body: `{ sectionType, scopeFilter?, inviteeEmail?, expiresAt?, label? }`. If `inviteeEmail` provided and `RESEND_API_KEY` configured, sends email invite. Returns `{ token, url }`.
- `GET /api/shares` — List all shares created by the logged-in user.
- `PATCH /api/shares/[token]` — Update expiry, label, or revoke (`{ revokedAt: now }`). Only owner can modify.
- `DELETE /api/shares/[token]` — Hard delete. Only owner.

### Share viewer (public + auth)

- `GET /api/shared/[token]` — Returns shared section data if token is valid. No auth required (magic link support). Fetches scoped data using `ownerId` from the token.
- `GET /api/shared/me` — (Authenticated) Returns all active shares where `inviteeEmail` matches the logged-in user's email. Powers "Shared with me" sidebar.

### Excel export (authenticated)

- `GET /api/export/[section]?format=xlsx&job=JobName&from=YYYY-MM-DD&to=YYYY-MM-DD` — Exports section data as `.xlsx`. Query params for optional filtering. Returns binary download with `Content-Disposition` header.

## Pages & UI

### `/shared/[token]` — Share viewer (public)

- No auth required for magic links
- Banner: "Shared by [Owner Name] — View only"
- Clean read-only table of the section data (no edit controls, no sidebar nav)
- Expired/revoked tokens show: "This link is no longer active"

### `/shared` — "Shared with me" (authenticated)

- New sidebar item (icon: `Users` or `Eye`), only visible if user has active shares
- Lists all sections shared with the logged-in user as cards: section name, owner name, last updated
- Clicking a card navigates to `/shared/[token]`

### Settings — "Sharing" section

- Lists active shares the user has created: section, scope, invitee, expiry, status
- "Share" button → modal:
  1. Pick section (dropdown of enabled sections)
  2. Pick scope (e.g. which job, if work section)
  3. Optional: invitee email
  4. Optional: expiry date
  5. Optional: label/note
  6. Creates token → copies magic link to clipboard + sends email if applicable
- Revoke button per share

### Export button on section pages

- Small download icon button in each section's page header
- Triggers `GET /api/export/[section]` download
- For work: uses current job context as filter

## Email Integration

- Package: `resend`
- Env var: `RESEND_API_KEY`
- Utility: `src/lib/email.ts` → `sendShareInvite(ownerName, inviteeEmail, sectionName, magicLinkUrl)`
- Email content: "[Owner] shared their [Section] with you" + magic link button
- Graceful degradation: if `RESEND_API_KEY` not set, skip email, just return the link

## Excel Export

- Package: `exceljs`
- Utility: `src/lib/excel.ts` → `generateExcel(sectionType, data, fields?): Buffer`
- Column mapping per section type:
  - work → Date, Job, Hours, Note, Earnings
  - gym → Date, Attended
  - habits → Date, Habit, Completed
  - study → Date, Subject, Hours, Notes
  - hobbies → Date, Hobby, Hours, Notes
  - housework → Date, Chore, Completed
  - health → Date, Water, Sleep, Weight, Mood
  - goals → Name, Target Date, Progress, Status
  - reading → Title, Author, Pages, Status
  - journal → Date, Mood, Content
  - finances → Date, Category, Amount, Note
  - shopping → List Name, Items
  - mealprep → Date, Meals
  - custom sections → use field definitions from SectionTemplate (key → column)
- Returns Buffer; API sets `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

## New Dependencies

- `resend` — email invitations
- `exceljs` — Excel file generation

## Data Flow

### Creating a share
1. Owner: Settings → Share → pick section/scope/email/expiry
2. `POST /api/shares` → `ShareToken.create()` with `crypto.randomUUID()`
3. If email: `sendShareInvite()` via Resend with `{APP_URL}/shared/{token}`
4. Return token + URL → copy to clipboard

### Accessing via magic link
1. Visitor opens `/shared/[token]`
2. `GET /api/shared/[token]` → validate token (not revoked, not expired)
3. Query scoped data with `ownerId` from token (e.g. `WorkSession.find({ userId: ownerId, jobName: scopeFilter })`)
4. Render read-only view

### Accessing via account
1. Logged-in user: sidebar "Shared with me" → `GET /api/shared/me`
2. Click share card → `/shared/[token]`
3. Same viewer page, additional check: `inviteeEmail === session.user.email`

### Exporting to Excel
1. User clicks download icon on section page
2. `GET /api/export/[section]?job=X` → query all data for section
3. `generateExcel()` → workbook with columns + data
4. Response: binary `.xlsx` download

### Revoking a share
1. Owner: Settings → Sharing → Revoke
2. `PATCH /api/shares/[token]` → `{ revokedAt: new Date() }`
3. Next viewer access shows "This link is no longer active"

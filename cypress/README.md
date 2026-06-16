# E2E tests (Cypress)

Run locally against a dev server.

## Prereqs
1. A seeded test user in the database with onboarding completed.
2. Env vars for the run:
   - `CYPRESS_TEST_EMAIL` — the test account email
   - `CYPRESS_TEST_PASSWORD` — its password
   - `CYPRESS_BASE_URL` — optional, defaults to http://localhost:3000

## Run
```bash
pnpm dev            # in one terminal
CYPRESS_TEST_EMAIL=you@example.com CYPRESS_TEST_PASSWORD=secret pnpm e2e
# or interactive:
CYPRESS_TEST_EMAIL=… CYPRESS_TEST_PASSWORD=… pnpm e2e:open
```

Not wired into CI yet (needs a live DB + creds). Follow-up: add a CI job with a seeded test DB.

## Notes
- Login inputs have no `name` attribute; `cy.login()` selects by `input[type="email"]` / `input[type="password"]`.
- The calendar slug is `calendar-<userId>`, so specs navigate via the "Calendar" nav link rather than a hardcoded URL.
- Drag-create event flows are asserted structurally (not driven) to avoid flaky pointer simulation.

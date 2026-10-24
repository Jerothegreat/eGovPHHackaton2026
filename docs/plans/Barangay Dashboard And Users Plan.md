## Goal

Build the fastest demoable HANDA slice for barangay users: a barangay official can create and activate a disaster campaign, see the barangay dashboard update from resident/manual check-ins, mark cases visited/resolved, export CSV, and archive the campaign; the offline outreach path must support field deployment, on-site interview, manual submission, and immediate dashboard recompute.

## Source Of Truth

- `PRD.md`
- `design.html`
- Barangay Official Workflow diagram: login -> campaign setup -> question builder -> campaign activation -> dashboard aggregator -> status tracker -> export service -> archive campaign
- Offline Outreach Workflow diagram: connection failure -> field deployment -> on-site interview -> manual submission -> real-time update
- `supabase/migrations/20250101000000_initial_schema.sql`
- `api-catalog.md`

## Non-Goals

- No security hardening, RLS policies, JWT minting, middleware, refresh tokens, or role enforcement beyond plain mock/session fields.
- No production-grade error handling, retry framework, audit logs, permissions matrix, monitoring, or analytics.
- No donation, inventory, route planning, relief distribution, LGU rollup, national dashboard, push notifications, or real disaster feed.
- No new backend, Edge Functions, or API server; keep this frontend-only for hackathon speed.
- No pixel-perfect rewrite beyond matching the main look and flows in `design.html`.

## Execution Order

## PR Stacking Strategy

Stack the work so each PR is small and demoable:

```text
main
  -> handa-data-and-state
    -> handa-official-dashboard
      -> handa-resident-and-manual-entry
        -> handa-export-and-archive
```

Merge from the top of the stack down after review, then merge `handa-data-and-state` into `main`. Use Graphite if available: `gt create handa-data-and-state`, then create each next branch from the previous one; with vanilla git use `git checkout -b <branch>` from the branch below it and open PRs against the immediate parent.

## Linear Sub-Issue Tracking

Create sub-issues from this plan when ready.

Suggested sub-issues:

- Data and app state shell: `handa-data-and-state`
- Barangay official dashboard: `handa-official-dashboard`
- Resident and manual check-in flows: `handa-resident-and-manual-entry`
- CSV export and campaign archive: `handa-export-and-archive`

### 1. Data And App State Shell

- Touch `src/App.tsx`, `src/App.css`, `src/features/index.ts`, `src/shared/index.ts`, and optionally add `src/shared/handaData.ts`.
- Replace the starter Vite screen with one HANDA app state containing campaigns, questions, households, members, check-ins, and answers using the table shapes from `supabase/migrations/20250101000000_initial_schema.sql`; keep data in React state first so the demo works before Supabase wiring.
- Seam: keep all data reads/writes behind a tiny set of functions in `src/shared/index.ts` like `createCampaign`, `submitCheckIn`, `updateCaseStatus`, `archiveCampaign`, `getDashboard`, and `exportCsv`; do not add interfaces/classes unless a real Supabase repository is added later.

### 2. Barangay Official Login And Campaign Setup

- Touch `src/App.tsx`, `src/App.css`, `.env.example`, and maybe `api-catalog.md` only as reference.
- Add a simple official mode with mock eGovPH user values (`uniqid`, name, barangay code, role), then implement campaign setup fields for disaster name/type/date plus question builder rows matching `design.html` campaign builder.
- Seam: official login is a button that sets mock session state for now; keep real eGovPH SSO out of this pass except env names already present in `.env.example`.

### 3. Campaign Activation And Dashboard Aggregator

- Touch `src/App.tsx`, `src/App.css`, and `src/shared/index.ts`.
- Implement publish/close/archive status buttons and a dashboard that shows affected household count, unresolved count, no-check-in count, need breakdown, and household queue.
- Seam: `getDashboard(campaignId)` must dedupe by `household_id`, merge all yes answers by need category, and compute non-respondents by comparing `households` against submitted check-ins.

### 4. Status Tracker And Case Modal

- Touch `src/App.tsx`, `src/App.css`, and `src/shared/index.ts`.
- Add a case detail modal from the dashboard table where a junior dev can wire a select for `unresolved`, `visited`, and `resolved`, plus a save button that updates the matching check-in status.
- Constraint: no complex state machine; use the existing enum values from the migration and render chips like `design.html`.

### 5. Resident Check-In Flow

- Touch `src/App.tsx`, `src/App.css`, and `src/shared/index.ts`.
- Implement the mobile-style flow from `design.html`: home notification, affected yes/no prompt, household match/selection, campaign questions, and confirmation screen.
- Seam: household matching can be a simple first match by barangay code plus member last name/name text; if no match, show a dropdown/list from the same barangay.

### 6. Offline Outreach Manual Submission

- Touch `src/App.tsx`, `src/App.css`, and `src/shared/index.ts`.
- Add the offline outreach workflow as a manual entry modal: connection failure/no response means field team visits, interviews on site, then selects household and reported needs in the barangay console.
- Constraint: saving manual entry should call the same `submitCheckIn` path as resident check-in so the dashboard recomputes immediately and no second code path is created.

### 7. Export Service And Archive Campaign

- Touch `src/App.tsx`, `src/App.css`, and `src/shared/index.ts`.
- Add an `Export CSV` button that builds a CSV from dashboard rows with household, address, needs, status, submitted by, and created date, then downloads it with `Blob` and `URL.createObjectURL`.
- Constraint: use browser APIs only; no CSV library, no server export, and archive is just setting campaign status to `archived`.

### 8. Optional Supabase Wiring Last

- Touch `.env.example`, `src/shared/index.ts`, and add a Supabase client file only if the local-state demo is already working.
- Add `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=` to `.env.example`, install `@supabase/supabase-js` only if the team decides live persistence is required, then swap the data functions to Supabase calls.
- Constraint: do this last because local React state is enough for the hackathon walkthrough and avoids blocking on database setup.

## Acceptance Criteria

- Barangay official can enter mock login/session mode and create a campaign with disaster name, type, date, and questions.
- Official can publish a campaign and see it as the active campaign on the dashboard.
- Resident flow follows the provided design: notification/home -> affected prompt -> household match/select -> questions -> confirmation.
- Manual offline entry follows the provided workflow and uses the same submission path as resident check-in.
- Dashboard shows deduped affected households, unresolved count, no-check-in count, need breakdown, household queue, and status chips.
- Official can change a household case to `visited` or `resolved` and see dashboard counts update.
- Export button downloads a CSV of affected households for the active campaign.
- Official can archive the campaign so it no longer behaves like the active live campaign.
- UI stays close to `design.html` visual language: eGovPH blue, rounded cards, mobile resident shell, barangay response console.
- Verification commands pass: `npm run build` and `npm run lint`.
- No backend, auth hardening, RLS, production error handling, or extra full-stack architecture is added.

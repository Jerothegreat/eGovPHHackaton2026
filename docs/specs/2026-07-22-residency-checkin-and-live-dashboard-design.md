# Residency Check-in & Live Barangay Dashboard — Design

**Date:** 2026-07-22
**Status:** Approved
**Scope:** Full PRD minus manual check-in entry (#15, owned elsewhere)

## Context

HANDA is a disaster check-in system for barangay residents embedded in eGovPH. Auth (eGovPH SSO + OTP, mock + real) and DB schema (6 tables, 12 seeded households for barangay `0105503021`) already exist. `CheckInPage.tsx` and `DashboardPage.tsx` are stubs. The 7 PRD modules (CampaignService, QuestionBuilder, CheckInFlow, HouseholdMatcher, DashboardAggregator, StatusTracker, ExportService) are not started. Realtime is enabled in `supabase/config.toml` but no client subscribes.

## Goal

A working end-to-end happy path demo under 3 minutes: official creates + publishes a campaign → resident checks in → official's dashboard updates live → official marks status + exports CSV.

## Non-goals

- Manual check-in on behalf of residents (#15) — owned by another person
- Low-bandwidth / bundle optimization (#23) — post-hackathon
- RLS / proper auth — disabled per PRD
- Location API dropdowns (PSA regions/provinces/barangays) — unused in happy path
- Multi-barangay rollups

## Architecture

Mirror the PRD's 7 modules with the existing `src/features/*` layout. Pure deep modules live in `src/lib/`; realtime is contained in one hook.

```
src/
  lib/
    supabase.ts               (exists)
    matcher.ts                NEW — HouseholdMatcher (pure, tested)
    aggregator.ts            NEW — DashboardAggregator (pure, tested)
    csv.ts                    NEW — ExportService
  features/
    campaigns/                NEW
      service.ts              create/list/get/publish/close/archive/copyQuestions
      types.ts
      CampaignBuilder.tsx     3-step inline form component (rendered inside /dashboard)
      useCampaigns.ts
    checkin/                  (stub exists)
      CheckInPage.tsx         REPLACE stub — prompt → match → questions → confirm
      service.ts              upsertCheckIn + merge answers
      matcher-query.ts        fetch households/members, feed matcher
      useActiveCampaign.ts
    dashboard/                (stub exists)
      DashboardPage.tsx       REPLACE stub — metrics + builder + status + export + close
      live.ts                 useCampaignLive (Supabase Realtime)
      useDashboardData.ts     load + aggregate
      status.ts               setStatus(checkInId, status)
  components/ui/              shadcn primitives added as needed: Card, Dialog, Select,
                             RadioGroup, Badge, Input, Textarea
  __tests__/
    matcher.test.ts
    aggregator.test.ts
supabase/migrations/
  20250101000003_check_ins_unique.sql
  20250101000004_realtime_publication.sql
```

**Each file's responsibility:**
- `lib/matcher.ts` — `match(resident, members, households) → { householdId? } | { candidates: Household[] }`. Pure, no Supabase.
- `lib/aggregator.ts` — `aggregate(checkIns, answers, questions, households) → { totalAffected, byNeedType, byStatus, affected: AffectedRow[], nonRespondents: Household[] }`; `filter(rows, { needType?, status? })`. Pure.
- `lib/csv.ts` — `toCsv(rows)` + `download(filename, csv)`.
- `features/campaigns/service.ts` — CRUD + `publish(id)` (draft→active), `close(id)` (active→closed), `copyQuestions(fromId, toId)`.
- `features/checkin/service.ts` — `upsertCheckIn({ campaignId, householdId, submittedBy, answers })`. Insert with `on conflict (campaign_id, household_id) do update` then merge answers (union by question_id, never lose a "yes").
- `features/dashboard/live.ts` — `useCampaignLive(campaignId, onChange)` subscribes to `postgres_changes` INSERT on `check_ins` + `check_in_answers`, UPDATE on `check_ins.status`; calls `onChange` to re-run aggregator.
- `features/dashboard/status.ts` — `setStatus(checkInId, status)`: invalid transitions blocked (unresolved→visited→resolved only).

## Data model changes

**`20250101000003_check_ins_unique.sql`**
```sql
alter table check_ins
  add constraint check_ins_campaign_household_unique
  unique (campaign_id, household_id);
```

**`20250101000004_realtime_publication.sql`**
```sql
alter publication supabase_realtime add table campaigns;
alter publication supabase_realtime add table check_ins;
alter publication supabase_realtime add table check_in_answers;
```
(Defensive — Supabase typically publishes all tables by default.)

No other schema changes. Existing seed (12 households, 27 members) supports happy-path auto-match (Maria Santos→HH 001, Pedro Reyes→HH 002) and candidate-selection for partial-name demos.

## Official happy path (`/dashboard`)

1. **Create mode**: inline 3-step builder toggled on the dashboard (not a new route — hand-rolled router stays simple):
   - Step 1: name + disaster_type + disaster_date (`created_by = uniqid`, `barangay_code` from session)
   - Step 2: add ≥1 question; each has `question_text` + `need_category` ∈ {shelter, medical, food_water} + `display_order`; optional **"Copy from previous campaign"** dropdown populates the list
   - Step 3: review + **Publish** (status `draft → active`)
2. **Live view**: campaign selector dropdown at top → select active campaign → `useDashboardData(campaignId)` loads `check_ins`, `check_in_answers`, `campaign_questions`, `households` → passes to `aggregate()` → renders metrics: **Active campaigns / Affected households / Non-respondents**, **Need-type breakdown** (shelter/medical/food_water counts), **Affected list** (household head, address, need badges, status), **Non-respondent list**.
3. `useCampaignLive(campaignId)` re-aggregates on every realtime INSERT/UPDATE; metrics and lists update live.
4. **Filter bar**: by need type + by status (runs `filter()` on aggregator output).
5. **Status control** per affected row: `unresolved → visited → resolved`; writes `check_ins.status`; realtime fans the update to any other open official view.
6. **Export CSV** button: `toCsv(affectedRows)` → `download("affected-households.csv", csv)`.
7. **Close** campaign button (active → closed).

## Resident happy path (`/check-in`)

1. Read the single active campaign for `session.profile.barangay_code`. If none → empty state ("No active campaign in your barangay").
2. **Prompt**: "Are you affected by `{campaign.name}`?" → Yes / No. No → toast, return.
3. **Yes** → `matcher-query` fetches households + members for `barangay_code` → `matcher.match(profile, ...)`:
   - 1 unique match (last_name + first_name ILIKE exact) → auto-attach `household_id`.
   - 0 or >1 → render candidate radio list, resident picks → `household_id`.
4. Render campaign questions as yes/no toggles + optional free-text.
5. **Submit** → `upsertCheckIn(...)` → `on conflict (campaign_id, household_id) do update` merges answers (union of "yes"; "yes" wins over "no"; free-text appended).
6. **Confirmation screen**.

## Testing

`vitest` with inline typed fixtures (PRD testing decisions):
- `matcher.test.ts`: exact unique match → householdId; ambiguous → candidates; none → []; case-insensitive.
- `aggregator.test.ts`: dedup count by household; need-type breakdown; status filter; non-respondent identification.

No E2E, no component unit tests (per PRD).

## Dependencies to add

- `vitest` (+ `jsdom` only if needed by fixture tests — matcher/aggregator are pure so likely not)

## Out of scope (re-affirmed)

#15 manual entry, #23 low-bandwidth, location API dropdowns, E2E tests, RLS, multi-barangay.

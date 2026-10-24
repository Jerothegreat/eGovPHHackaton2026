# HANDA — Happy Path Flows

## Current State

The repo is still the **Vite boilerplate** — no application flow implemented:

- `src/App.tsx` is the default "Get started / Count is N" template.
- `src/shared/index.ts` and `src/features/index.ts` are **empty files**. No modules (CampaignService, CheckInFlow, HouseholdMatcher, DashboardAggregator, StatusTracker, ExportService) have been built.
- No `@supabase/supabase-js` in `package.json`, no auth/provider/router code, no eGovPH SSO client, no React context for the eGovPH profile.
- `.env.example` now keeps eGov secrets as Supabase Edge Function secrets; auth code no longer reads partner credentials from the client.

The stack story (frontend → eGovPH SSO directly → Supabase directly) is **only described in the PRD, never wired up**.

---

## The Flows

### Flow A — Authentication (eGovPH SSO) — shared by both actors

OAuth 2.0 authorization-code flow, executed entirely client-side per PRD:

1. App needs an **exchange code**. Per catalog endpoint 12, this is minted from a test eGov identity using `partner_code`.
2. App **POSTs `/api/token`** with `{ exchange_code, scope: "SSO_AUTHENTICATION", partner_code, partner_secret }` → receives `access_token`.
3. App **POSTs `/api/partner/sso_authentication`** with `Authorization: Bearer <access_token>` → receives the full user profile (`uniqid`, `first_name`, `last_name`, `barangay`, `barangay_code`, `region_code`).
4. App stores the profile in **React context** (in-memory, session only — no JWT, no refresh). `uniqid` + `barangay_code` are passed as plain columns on every Supabase write.
5. Role gating: barangay officials vs residents is derived from eGovPH role info — restricts campaign creation.

> Story beat: "User opens HANDA in eGovPH → taps Sign in → redirected to eGovPH → returns with a verified Filipino profile showing their real barangay (`barangay_code: 0105503021`, POBLACION). No separate signup; identity is already trusted."

### Flow B — Setup/Seeding (one-time, demo prerequisite)

PRD requires a **fully demonstrable end-to-end demo under 3 minutes without a live disaster.** Required seed data:

1. Supabase project provisioned, migration `20250101000000_initial_schema.sql` applied (6 tables + enums + indexes).
2. `households` + `household_members` pre-populated for one `barangay_code` (to demonstrate matching + non-respondents).
3. eGovPH integration token fetched once via `POST /api/integration/token` (using `access_code` from `.env`) and reused for location dropdowns (regions → provinces → municipalities → barangays).

> Story beat: opens with "Barangay POBLACION already has 12 profiled families on file."

### Flow C — Barangay Official Flow (campaign setup + monitoring)

1. **Login** (Flow A) → role check shows "barangay official".
2. **Create campaign** (draft): name, disaster_type, disaster_date, `created_by = uniqid`, `barangay_code` from profile. (CampaignService)
3. **Build question set** (QuestionBuilder): add questions with `need_category` (shelter/medical/food_water) + `display_order`. Optional: **reuse from prior campaign**.
4. **Publish** campaign: status `draft → active`. This is what opens check-ins.
5. **Dashboard** (DashboardAggregator): poll Supabase `check_ins`/`check_in_answers`, aggregate to: total affected households (deduplicated by `household_id`), need-type breakdown, unresolved/visited/resolved counts, and **non-respondents** = `households` minus those with a `check_ins` row for this campaign.
6. **Filter** by need type / resolution status.
7. **Status update** (StatusTracker): mark a household's case `unresolved → visited → resolved`.
8. **Manual check-in entry** on behalf of offline resident.
9. **Export CSV** (ExportService) for LGU/relief handoff.
10. **Close/archive** campaign at end of relief period.

### Flow D — Resident Flow (check-in, < 60 seconds)

1. **Login** (Flow A) — same SSO. (Demo can run in the same browser session or a second one.)
2. **Prompt**: "Are you affected by [Disaster]?" Yes/No. Yes → continue; No → dismiss.
3. **HouseholdMatcher.match(residentInfo)**: try to auto-match against `households`/`household_members` using profile's `first_name`, `last_name`, `barangay_code`.
   - Unique match → attach `household_id`.
   - No/ambiguous match → return `candidates[]` for **manual selection**.
4. **Answer question set** for the campaign: yes/no booleans + free text.
5. **Deduplicate**: if another member of the same household already checked in, **merge** answers (union of needs) into one `check_ins` row for that `household_id`.
6. **Confirmation screen**.
7. Writes only go to `check_ins` + `check_in_answers` (with `submitted_by = uniqid`, `campaign_id`, `household_id`).

---

## Proposed Demo Happy Path Narrative (3-minute run)

A single walk-through that touches every layer and proves the architecture:

| Beat | Time | Actor | What happens | Stack pieces exercised |
|---|---|---|---|---|
| 1 | 0:00 | Official | Opens HANDA → eGovPH SSO redirect → returns profile with `barangay_code` | eGovPH endpoints 12→13→14 directly from client; React context stores profile |
| 2 | 0:20 | Official | Creates campaign "Super Typhoon Odette" + 3 questions (shelter/medical/food_water); publishes | React state → Supabase `campaigns`, `campaign_questions` insert (anon key) |
| 3 | 0:45 | Resident | Second session → SSO → sees "Are you affected by Odette?" → Yes | eGovPH SSO again (same flow, different identity); `campaigns` read filtered by `barangay_code` |
| 4 | 1:00 | Resident | Auto-matched to household via HouseholdMatcher → answers 3 questions → confirmation | `households`/`household_members` select; `check_ins` + `check_in_answers` insert |
| 5 | 2:00 | Official | Dashboard refreshes: 1 affected household, need breakdown shows "shelter, food_water", 11 non-respondents | DashboardAggregator pulls from Supabase, computes non-respondents vs `households` list |
| 6 | 2:30 | Resident 2 | Third SSO → household auto-match fails (partial name) → picks household from candidate list → checks in → dedup merges under existing `household_id` | HouseholdMatcher returning candidates; dedup logic |
| 7 | 2:45 | Official | Dashboard now shows 2 affected households; marks one "visited" → exports CSV | StatusTracker update; ExportService generates CSV from aggregator output |
| 8 | 3:00 | — | Stop. Full loop: SSO × 3, direct Supabase reads/writes, two deep modules, no backend. | The whole frontend-only stack story told. |

This single walk-through showcases every PRD design decision: direct-client SSO, direct-anon-key Supabase, dedup by household, non-respondent discovery, campaign lifecycle, and the two "deep modules" (HouseholdMatcher, DashboardAggregator) as the testable core.

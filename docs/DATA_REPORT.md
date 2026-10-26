# HANDA Residency Check-in & Live Dashboard — Data Report

**Date:** 2026-07-22  
**Branch:** `feat/residency-checkin-and-live-dashboard`  
**Status:** Complete — build/lint/tests passing

---

## Executive Summary

Implemented the full HANDA disaster check-in system for barangay residents and officials. Residents can check in to report household needs after a disaster, and officials see a live dashboard with real-time updates, status tracking, and CSV export.

**Total commits:** 10 (8 feature + 2 docs)  
**Files changed:** 43 (+5,550 / -85 lines)  
**Tests:** 14 unit tests (6 matcher + 8 aggregator), all passing

---

## Module Breakdown

| Module | Responsibility | Files | Status |
|--------|----------------|-------|--------|
| **HouseholdMatcher** | Match residents to households by name, fallback to candidates | `src/lib/matcher.ts` | ✅ Complete + tested |
| **DashboardAggregator** | Aggregate check-ins into metrics, need breakdown, non-respondents | `src/lib/aggregator.ts` | ✅ Complete + tested |
| **CampaignService** | CRUD for campaigns + questions, publish/close lifecycle | `src/features/campaigns/service.ts` | ✅ Complete |
| **QuestionBuilder** | UI for officials to define questions per campaign (3-step inline form) | `src/features/campaigns/CampaignBuilder.tsx` | ✅ Complete |
| **CheckInFlow** | Resident flow: prompt → match → questions → confirmation | `src/features/checkin/CheckInPage.tsx` | ✅ Complete |
| **StatusTracker** | Advance check-in status: unresolved → visited → resolved | `src/features/dashboard/status.ts` | ✅ Complete |
| **ExportService** | Generate CSV from affected household data | `src/lib/csv.ts` | ✅ Complete |
| **Realtime** | Supabase Realtime subscription for live dashboard updates | `src/features/dashboard/live.ts` | ✅ Complete |

---

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/types.ts` | 61 | Shared TypeScript types (Campaign, Household, CheckIn, etc.) |
| `src/lib/matcher.ts` | 39 | HouseholdMatcher deep module (pure, tested) |
| `src/lib/aggregator.ts` | 95 | DashboardAggregator deep module (pure, tested) |
| `src/lib/csv.ts` | 20 | CSV export utility |
| `src/__tests__/matcher.test.ts` | 67 | Unit tests for HouseholdMatcher |
| `src/__tests__/aggregator.test.ts` | 98 | Unit tests for DashboardAggregator |
| `src/features/campaigns/types.ts` | 14 | Campaign feature types |
| `src/features/campaigns/service.ts` | 68 | Campaign CRUD + publish/close |
| `src/features/campaigns/useCampaigns.ts` | 35 | React hook for campaign list |
| `src/features/campaigns/CampaignBuilder.tsx` | 222 | 3-step campaign creation form |
| `src/features/checkin/service.ts` | 73 | Check-in upsert with answer merging |
| `src/features/checkin/matcher-query.ts` | 24 | Bridge Supabase → HouseholdMatcher |
| `src/features/checkin/useActiveCampaign.ts` | 47 | Fetch active campaign for resident |
| `src/features/dashboard/status.ts` | 16 | Status advancement logic |
| `src/features/dashboard/useDashboardData.ts` | 90 | Dashboard data hook with aggregator |
| `src/features/dashboard/live.ts` | 19 | Supabase Realtime subscription |
| `vitest.config.ts` | 13 | Vitest configuration |
| `supabase/migrations/20250101000003_check_ins_unique.sql` | 3 | Unique constraint on (campaign_id, household_id) |
| `supabase/migrations/20250101000004_realtime_publication.sql` | 3 | Realtime publication for campaigns/check_ins/answers |

---

## Files Modified

| File | Change |
|------|--------|
| `src/features/checkin/CheckInPage.tsx` | Replaced stub with full check-in flow (+249 lines) |
| `src/features/dashboard/DashboardPage.tsx` | Replaced stub with live dashboard (+275 lines) |
| `package.json` | Added `vitest` dev dependency |
| `tsconfig.app.json` | Excluded `src/__tests__` from app build |

---

## User Stories Coverage

| # | Story | Status |
|---|-------|--------|
| 2 | Official creates campaign (name, type, date) | ✅ |
| 3 | Official defines custom questions per campaign | ✅ |
| 5 | Official publishes campaign (draft → active) | ✅ |
| 6 | Official closes campaign (active → closed) | ✅ |
| 7 | Official sees total affected households (deduped) | ✅ |
| 8 | Official sees need-type breakdown | ✅ |
| 9 | Official sees affected households with address | ✅ |
| 10 | Official filters by need type | ✅ |
| 11 | Official filters by resolution status | ✅ |
| 12 | Official marks case as visited/resolved | ✅ |
| 13 | Official sees non-respondent households | ✅ |
| 14 | Official exports CSV | ✅ |
| 16 | Dashboard updates in near real-time | ✅ |
| 17 | Resident sees "Are you affected?" prompt | ✅ |
| 18 | Resident auto-matched to household | ✅ |
| 19 | Resident manually selects household if auto-match fails | ✅ |
| 20 | Resident answers question set | ✅ |
| 21 | Multiple family members merge under one household | ✅ |
| 22 | Resident sees confirmation screen | ✅ |
| 26 | System collapses multiple check-ins per household | ✅ |

**Out of scope (owned by another person):**
- #15 Manual check-in entry on behalf of offline resident

---

## Test Coverage

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `matcher.test.ts` | 6 | Exact match, case-insensitive, no match → candidates, ambiguous → candidates, barangay filter |
| `aggregator.test.ts` | 8 | Dedup by household, need breakdown, non-respondents, status breakdown, affected rows, filters |
| **Total** | **14** | All passing |

---

## Database Schema Changes

| Migration | Change | Purpose |
|-----------|--------|---------|
| `20250101000003_check_ins_unique.sql` | `UNIQUE (campaign_id, household_id)` on `check_ins` | Enforces dedup-by-household at DB level |
| `20250101000004_realtime_publication.sql` | Adds `campaigns`, `check_ins`, `check_in_answers` to `supabase_realtime` publication | Enables live dashboard updates |

---

## Demo Happy Path

| Step | Time | Actor | Action | Result |
|------|------|-------|--------|--------|
| 1 | 0:00 | Official (josie) | Login → `/dashboard` | Sees empty dashboard |
| 2 | 0:20 | Official | Click "+ New Campaign" → fill name/type/date → add 3 questions → Publish | Campaign created, status = active |
| 3 | 0:45 | Resident (maria) | Login → `/check-in` → "Are you affected by Odette?" → Yes | Auto-matched to Santos Household |
| 4 | 1:00 | Resident | Answer 3 questions (shelter=yes, medical=no, food=yes) → Submit | Confirmation screen |
| 5 | 2:00 | Official | Dashboard refreshes (realtime) | Metrics: 1 affected, 11 non-respondents, need breakdown shows shelter + food |
| 6 | 2:30 | Resident (pedro) | Login → check in → auto-matched to Reyes Household | Dashboard: 2 affected, 10 non-respondents |
| 7 | 2:45 | Official | Mark Santos household "visited" → Export CSV | Status badge changes, CSV downloaded |
| 8 | 3:00 | — | Stop | Full loop demonstrated |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript 6 + Vite 8 |
| Styling | Tailwind CSS v4 + shadcn/ui (base-lyra style) |
| Data | Supabase (Postgres) via `@supabase/supabase-js` (anon key) |
| Auth | eGovPH SSO (OAuth 2.0) + OTP |
| Realtime | Supabase Realtime (postgres_changes subscriptions) |
| Testing | Vitest (14 unit tests) |
| State | React context (session) + hooks (data fetching) |

---

## Verification

```bash
pnpm build       # ✅ TypeScript + Vite build passes
pnpm lint        # ✅ ESLint passes (0 errors)
pnpm vitest run  # ✅ 14/14 tests pass
```

---

## Next Steps

1. **Apply migrations** to Supabase project: `npx supabase db push` or run SQL manually
2. **Test demo flow** with mock SSO (josie/maria/pedro identities)
3. **Post-hackathon:** Add RLS policies, proper JWT auth, multi-barangay support

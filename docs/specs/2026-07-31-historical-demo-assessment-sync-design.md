## Title

Historical Demo Assessment and LGU Dashboard Sync Design

## Problem

The current demo data path is split.

- `src/App.tsx` and `src/shared/index.ts` drive the barangay Assessment Builder, resident check-ins, queue, need breakdown, CSV export, and developer JSON preview.
- `src/features/lgu/LguDashboard.tsx` uses a separate hard-coded `INCIDENTS` array.
- Supabase seed data contains a small set of unrelated campaigns and generic questions that do not form a clean historical demo story.
- `src/components/DisasterReportForm.tsx` uses eReport datasets, but its defaults are not aligned to the active disaster assessment.

This creates a demo where the Assessment flow, LGU dashboard, and eReport integration do not tell one coherent story.

## Goal

Create a clean, historically grounded demo dataset for notable Philippine disasters that powers all major assessment views from one shared source.

The final demo must:

1. Show notable historical disasters for typhoon, flood, and earthquake scenarios.
2. Include meaningful impact data such as people affected, families affected, displaced population, and core needed supplies.
3. Keep LGU dashboard values aligned with the same assessment records shown in the Assessment Builder.
4. Ensure eReport location and report defaults match the selected or active assessment.
5. Remove unrelated draft or generic seeded questions so the demo feels intentional and clean.

## Non-Goals

1. Introduce a brand-new incident domain model or separate incident table hierarchy.
2. Rebuild the resident or official console architecture.
3. Implement live external disaster feeds.
4. Make the demo perfectly statistically authoritative; it must be historically grounded and internally consistent for presentation.

## Recommended Approach

Use the existing `Campaign`, `CampaignQuestion`, `CheckIn`, and `CheckInAnswer` model as the operational source of truth for the demo flow, and add a minimal shared historical demo dataset layer that enriches campaigns with impact and supply context.

This avoids a broad schema redesign while fixing the current split between barangay and LGU views.

## Historical Demo Dataset

The demo dataset will include three core scenarios:

1. Typhoon Yolanda / Haiyan, Tacloban City, Leyte
2. Tropical Storm Sendong / Washi flood impact, Cagayan de Oro City
3. 2013 Bohol Earthquake, Tagbilaran City, Bohol

Each scenario must contain:

1. Historical event label
2. Disaster type
3. Region, province, municipality, and barangay identifiers backed by eReport-style fallback geography data
4. Human impact totals
5. Needed supplies and response needs
6. One mapped assessment campaign with a relevant RDANA-style question set
7. Seeded check-ins and statuses used for live queue, need breakdown, and CSV export
8. eReport defaults aligned to the same location and event label

## Data Model Strategy

Keep the current relational seed tables for campaigns, questions, check-ins, and answers.

Add one shared frontend demo-metadata layer keyed by `campaign.id` for fields that do not exist in the current Supabase schema, such as:

- `historical_event_name`
- `region_code`
- `province_code`
- `municipality_code`
- `barangay_codes`
- `affected_people`
- `affected_families`
- `displaced_people`
- `displaced_families`
- `evacuation_centers`
- `partially_damaged_houses`
- `totally_damaged_houses`
- `needed_supplies`
- `ereport_report_type`
- `ereport_subject`
- `ereport_message`

This metadata layer can live in a dedicated TypeScript module and be joined with `Campaign` records in selectors used by the dashboards.

## Why Metadata Instead of Schema Expansion

The current request is demo polish and data sync, not production normalization.

Using a metadata layer:

1. Minimizes migration risk in a dirty worktree.
2. Avoids touching every store and DB write path.
3. Lets the LGU dashboard and eReport form consume richer display data immediately.
4. Keeps the operational assessment flow on existing tables.

## Assessment Data Rules

Each seeded assessment must use RDANA-style questions relevant to the disaster.

Question categories should map back to existing need categories already understood by the dashboard, with normalized labels such as:

1. Shelter
2. Food or water
3. Medical
4. WASH
5. Evacuation
6. Utilities

Remove current unrelated or generic demo assessments and questions that do not belong to the final historical demo set.

Only the final curated assessment records should appear in the normal demo flow.

## LGU Dashboard Behavior

`src/features/lgu/LguDashboard.tsx` should stop using its local `INCIDENTS` array.

Instead it should derive its rows from shared data:

1. Read campaigns from `useHandaStore()`.
2. Join campaigns with historical demo metadata.
3. Use `getDashboard(campaign.id)` for live assessment aggregates such as check-ins, unresolved, visited, resolved, and need breakdown.
4. Show historical incident context from metadata, including affected population and key needed supplies.

The table should include at least:

1. Disaster
2. Date
3. Location or barangays covered
4. Historical affected people
5. Assessment check-ins received
6. Unresolved
7. Visited
8. Resolved
9. Status
10. eReport classification

The summary cards should be derived from the same rows so no separate mock total exists.

## Assessment and LGU Sync Rules

To avoid mismatched demo numbers:

1. Historical affected totals come from shared metadata.
2. Live assessment counts come from `check_ins` and `check_in_answers`.
3. LGU totals are computed from the same campaign set visible in Assessment Builder.
4. No disaster row may appear in LGU dashboard without a corresponding seeded campaign.
5. No seeded campaign may remain unused by both Assessment Builder and LGU dashboard.

## eReport Alignment

`src/components/DisasterReportForm.tsx` should default to the geography and complaint context of the selected campaign first, and fall back to the active campaign when no explicit selection exists.

Expected behavior:

1. Preselect region, province, municipality, and barangay based on the selected campaign metadata.
2. Preselect a disaster-appropriate eReport report type.
3. Pre-fill subject and message with the historical event and location context.
4. Continue to fall back to the static PSA dataset if live eReport datasets are unavailable.

## Geography Dataset Changes

Expand `src/lib/psa-fallback-data.ts` with the real locations needed by the historical demo set.

At minimum the fallback dataset must contain the region, province, municipality, and barangay hierarchy for:

1. Tacloban City, Leyte
2. Cagayan de Oro City, Misamis Oriental
3. Tagbilaran City, Bohol

The demo geography must match the campaign metadata and eReport defaults exactly.

## Seed Data Changes

Update Supabase seed data to provide a clean curated demo set.

Required outcomes:

1. Remove or replace generic campaigns like unrelated draft flood, fire, or placeholder records that are not part of the final story.
2. Seed the three historical campaigns.
3. Seed relevant RDANA-style questions per campaign.
4. Seed representative check-ins across unresolved, visited, and resolved states.
5. Keep enough answer variety to produce meaningful need breakdown charts.

The seed should support a smooth narrative where official, resident, LGU, and eReport screens all reference the same disasters.

## Demo Presentation Rules

For each historical disaster, the UI should clearly separate:

1. Historical incident impact totals
2. Live assessment intake totals

This avoids the misleading impression that a few demo check-ins equal the full historical population count.

Suggested wording examples:

- `Historically affected population`
- `Assessment check-ins received`
- `Priority supply needs`

## Implementation Outline

1. Create a shared historical demo metadata module keyed by campaign ID.
2. Replace current seed campaigns and questions with curated historical demo records.
3. Expand fallback geography for the chosen real locations.
4. Update LGU dashboard to derive rows and totals from shared campaigns plus metadata.
5. Update eReport form defaults from selected or active campaign metadata.
6. Remove unused mock rows and draft question sets from the normal demo path.
7. Verify that official dashboard, resident console, LGU dashboard, CSV export, and eReport modal all reflect the same disasters.

## Risks and Constraints

1. `src/App.tsx` currently has an unresolved merge conflict in the worktree and must be handled carefully before implementation.
2. Some existing role and municipality assumptions are centered on current demo users; real-location historical scenarios must not break login flows.
3. If campaign metadata stays frontend-only, any future backend export of historical incident fields would need follow-up work.

## Verification

Implementation is successful when:

1. The Assessment Builder shows only the curated historical demo assessments.
2. The official dashboard queue and need breakdown are populated by those same assessments.
3. The LGU Incident Command Dashboard table is derived from shared data, not hard-coded incidents.
4. Every LGU dashboard row corresponds to a real seeded assessment campaign.
5. eReport form defaults match the selected or active campaign location and disaster context.
6. No unused disaster seed data remains in the normal demo flow.
7. The project TypeScript/build check passes after the edits.

# Historical Demo Assessment and LGU Dashboard Sync Implementation Plan

**Goal:** Replace disconnected mock disaster data with one historically grounded demo dataset that powers the Assessment Builder, resident check-ins, LGU Incident Command Dashboard, and eReport defaults together.

**Architecture:** Keep the existing `Campaign`, `CampaignQuestion`, `CheckIn`, and `CheckInAnswer` tables as the operational assessment source of truth. Add a small frontend metadata layer keyed by `campaign.id`, then derive LGU rows and eReport defaults from selectors that join campaign data, check-in aggregates, and historical event metadata.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Supabase, Vitest for pure TypeScript selector tests

## Global Constraints

- Use real historical locations: Tacloban City, Leyte; Cagayan de Oro City, Misamis Oriental; Tagbilaran City, Bohol.
- Keep the current `Campaign`, `CampaignQuestion`, `CheckIn`, and `CheckInAnswer` model; do not introduce a new incident table.
- Key the historical metadata layer by `campaign.id`.
- `src/features/lgu/LguDashboard.tsx` must stop using its hard-coded `INCIDENTS` array.
- `src/components/DisasterReportForm.tsx` must default from selected campaign first, then active campaign.
- Remove unrelated generic demo assessments and draft question sets from the normal demo flow.
- Preserve the distinction between historical impact totals and live assessment intake totals in the UI.
- After multi-file edits, run the TypeScript/build check and report the result.
- Never overwrite unrelated user changes already present in the dirty worktree.

---

## File Structure Map

- `src/App.tsx`
  Current entry point that contains the official assessment console and currently has an unresolved merge conflict. First task must make this file safe to edit again.
- `src/features/official/OfficialConsole.tsx`
  New home for the official assessment workflow currently embedded inside `src/App.tsx`. Keep behavior equivalent while making later demo-data changes safer.
- `src/features/demo/historical-incidents.ts`
  Shared curated metadata keyed by `campaign.id` for historical impact totals, supplies, geography, and eReport defaults.
- `src/features/demo/historical-selectors.ts`
  Pure selector functions that join campaigns, dashboards, and historical metadata into LGU rows and eReport defaults.
- `src/features/demo/historical-selectors.test.ts`
  Vitest coverage for the selectors and metadata contract.
- `src/shared/index.ts`
  Existing store and aggregate helpers. Extend with joined selectors if needed, but keep the current CRUD flow intact.
- `src/features/lgu/LguDashboard.tsx`
  Replace local mock incidents with selector-driven rows and totals.
- `src/components/DisasterReportForm.tsx`
  Accept campaign-aware defaults and consume selector output.
- `src/lib/psa-fallback-data.ts`
  Expand fallback geography to cover the three real historical locations.
- `supabase/migrations/20250102000000_seed_data.sql`
  Replace the generic initial seed campaign with curated historical demo campaigns.
- `supabase/migrations/20250104000000_developers_and_barangays.sql`
  Remove or replace unrelated extra demo campaigns so the final demo set is clean.
- `package.json`
  Add a `test:unit` script if missing.
- `tsconfig.app.json`
  Add Vitest types only if the test files require them.

### Task 1: Stabilize the Official Console Entry Point

**Files:**
- Create: `src/features/official/OfficialConsole.tsx`
- Modify: `src/App.tsx`
- Modify: `package.json`
- Modify: `tsconfig.app.json`

**Interfaces:**
- Consumes: `useHandaStore()`, `Shell`, `SessionProvider`, `ProtectedRoute`, `ResidentConsole`, `DeveloperConsole`, `LguDashboard`
- Produces: `OfficialConsole(): JSX.Element`, `npm run test:unit`

- [ ] **Step 1: Write the failing build check for the conflicted entry point**

Run:

```bash
npm run build
```

Expected: FAIL because `src/App.tsx` is still unmerged or otherwise not safe for incremental work.

- [ ] **Step 2: Add a unit-test runner before adding new pure selector code**

Update `package.json` scripts and devDependencies:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "node scripts/check-css-vars.mjs",
    "test:unit": "vitest run --passWithNoTests"
  },
  "devDependencies": {
    "vitest": "^3.2.4"
  }
}
```

Update `tsconfig.app.json` so test files compile cleanly:

```json
{
  "compilerOptions": {
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Move the embedded official console into its own feature file**

Create `src/features/official/OfficialConsole.tsx` and move the existing `OfficialConsole` implementation from `src/App.tsx` into it. Keep imports and behavior intact. The top of the new file should start like this:

```tsx
import { useState, useEffect, useCallback } from 'react'
import { useHandaStore, can, formatAnonymizedIdentity } from '@/shared'
import { Shell } from '@/components/Shell'
import type { DashboardRow, CheckInStatus } from '@/shared'
import { useSession } from '@/features/auth/session-context'
import { SmsSimulatorDrawer } from '@/features/alerts'
import type { AlertIngestionResult } from '@/features/alerts'

export function OfficialConsole() {
  return null as never
}
```

Update `src/App.tsx` imports and routing usage to consume the new feature file instead of the embedded function:

```tsx
import { OfficialConsole } from '@/features/official/OfficialConsole'
```

- [ ] **Step 4: Run the build and unit-test commands to verify the entry point is stable**

Run:

```bash
npm install
npm run test:unit
npm run build
```

Expected:

- `npm run test:unit`: PASS with no tests found or PASS after later test files are added
- `npm run build`: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.app.json src/App.tsx src/features/official/OfficialConsole.tsx
git commit -m "refactor: isolate official console entry"
```

### Task 2: Add Historical Demo Metadata and Pure Selectors

**Files:**
- Create: `src/features/demo/historical-incidents.ts`
- Create: `src/features/demo/historical-selectors.ts`
- Create: `src/features/demo/historical-selectors.test.ts`

**Interfaces:**
- Consumes: `Campaign`, `Dashboard`, `DashboardRow` from `@/shared`
- Produces:
  - `type HistoricalIncidentMeta`
  - `getHistoricalIncidentMeta(campaignId: string): HistoricalIncidentMeta | null`
  - `buildLguIncidentRows(input: { campaigns: Campaign[]; getDashboard: (campaignId: string) => Dashboard }): LguIncidentRow[]`
  - `getCampaignEReportDefaults(campaignId: string): CampaignEReportDefaults | null`

- [ ] **Step 1: Write failing tests for metadata lookup and LGU row derivation**

Create `src/features/demo/historical-selectors.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildLguIncidentRows, getCampaignEReportDefaults, getHistoricalIncidentMeta } from './historical-selectors'

describe('historical demo selectors', () => {
  it('returns metadata for the Tacloban historical campaign', () => {
    const meta = getHistoricalIncidentMeta('a1000000-0000-0000-0000-000000000001')
    expect(meta?.historicalEventName).toBe('Typhoon Yolanda / Haiyan')
    expect(meta?.municipalityCode).toBe('0803747000')
  })

  it('builds an LGU row that keeps historical totals separate from live check-ins', () => {
    const rows = buildLguIncidentRows({
      campaigns: [
        {
          id: 'a1000000-0000-0000-0000-000000000001',
          name: 'Typhoon Yolanda Rapid Assessment',
          disaster_type: 'Typhoon',
          disaster_date: '2013-11-08',
          status: 'active',
          created_by: 'OFC_TACLOBAN_001',
          barangay_code: '0803747001',
          alert_id: null,
          ai_generated: false,
          created_at: '2026-07-31T00:00:00.000Z',
          updated_at: '2026-07-31T00:00:00.000Z',
        },
      ],
      getDashboard: () => ({ affectedCount: 3, unresolvedCount: 1, needBreakdown: { Shelter: 2 }, rows: [] }),
    })

    expect(rows).toHaveLength(1)
    expect(rows[0].historicalAffectedPeople).toBeGreaterThan(rows[0].assessmentCheckIns)
    expect(rows[0].assessmentCheckIns).toBe(3)
    expect(rows[0].ereportReportType).toBe('red_tape')
  })

  it('returns campaign-aware eReport defaults', () => {
    const defaults = getCampaignEReportDefaults('a1000000-0000-0000-0000-000000000002')
    expect(defaults?.municipalityCode).toBe('1004305000')
    expect(defaults?.subject).toContain('Sendong')
  })
})
```

- [ ] **Step 2: Run the test file and verify it fails**

Run:

```bash
npx vitest run src/features/demo/historical-selectors.test.ts
```

Expected: FAIL with missing module or missing export errors for `historical-selectors`.

- [ ] **Step 3: Write the minimal metadata and selector implementation**

Create `src/features/demo/historical-incidents.ts`:

```ts
export type HistoricalIncidentMeta = {
  campaignId: string
  historicalEventName: string
  regionCode: string
  provinceCode: string
  municipalityCode: string
  barangayCodes: string[]
  barangayLabel: string
  historicalAffectedPeople: number
  historicalAffectedFamilies: number
  displacedPeople: number
  displacedFamilies: number
  evacuationCenters: number
  partiallyDamagedHouses: number
  totallyDamagedHouses: number
  neededSupplies: Array<{ label: string; quantity: string }>
  ereportReportType: 'red_tape' | 'accident' | 'fire'
  ereportSubject: string
  ereportMessage: string
}

export const HISTORICAL_INCIDENTS: HistoricalIncidentMeta[] = [
  {
    campaignId: 'a1000000-0000-0000-0000-000000000001',
    historicalEventName: 'Typhoon Yolanda / Haiyan',
    regionCode: '080000000',
    provinceCode: '080370000',
    municipalityCode: '0803747000',
    barangayCodes: ['0803747001', '0803747010'],
    barangayLabel: 'Tacloban City, Leyte',
    historicalAffectedPeople: 612,
    historicalAffectedFamilies: 128,
    displacedPeople: 284,
    displacedFamilies: 61,
    evacuationCenters: 4,
    partiallyDamagedHouses: 95,
    totallyDamagedHouses: 37,
    neededSupplies: [
      { label: 'Family food packs', quantity: '384 packs' },
      { label: 'Potable water', quantity: '9,180 L/day' },
      { label: 'Shelter repair kits', quantity: '132 kits' },
    ],
    ereportReportType: 'red_tape',
    ereportSubject: 'Typhoon Yolanda assistance request - Tacloban City',
    ereportMessage: 'Reporting household impacts and priority relief needs after Typhoon Yolanda in Tacloban City, Leyte.',
  },
  {
    campaignId: 'a1000000-0000-0000-0000-000000000002',
    historicalEventName: 'Tropical Storm Sendong / Washi',
    regionCode: '100000000',
    provinceCode: '100430000',
    municipalityCode: '1004305000',
    barangayCodes: ['1004305001', '1004305010'],
    barangayLabel: 'Cagayan de Oro City, Misamis Oriental',
    historicalAffectedPeople: 438,
    historicalAffectedFamilies: 92,
    displacedPeople: 211,
    displacedFamilies: 47,
    evacuationCenters: 3,
    partiallyDamagedHouses: 58,
    totallyDamagedHouses: 24,
    neededSupplies: [
      { label: 'Ready-to-eat food', quantity: '211 packs' },
      { label: 'Hygiene kits', quantity: '92 kits' },
      { label: 'Water purification support', quantity: '30 boxes' },
    ],
    ereportReportType: 'red_tape',
    ereportSubject: 'Sendong flood impact report - Cagayan de Oro City',
    ereportMessage: 'Reporting flood displacement, WASH needs, and barangay-level relief demand after Tropical Storm Sendong.',
  },
  {
    campaignId: 'a1000000-0000-0000-0000-000000000003',
    historicalEventName: '2013 Bohol Earthquake',
    regionCode: '070000000',
    provinceCode: '070120000',
    municipalityCode: '0701200001',
    barangayCodes: ['070120000101', '070120000102'],
    barangayLabel: 'Tagbilaran City, Bohol',
    historicalAffectedPeople: 257,
    historicalAffectedFamilies: 54,
    displacedPeople: 96,
    displacedFamilies: 18,
    evacuationCenters: 2,
    partiallyDamagedHouses: 43,
    totallyDamagedHouses: 11,
    neededSupplies: [
      { label: 'Medical kits', quantity: '40 kits' },
      { label: 'Tarpaulins', quantity: '54 sheets' },
      { label: 'Generator support', quantity: '3 units' },
    ],
    ereportReportType: 'accident',
    ereportSubject: 'Bohol earthquake impact report - Tagbilaran City',
    ereportMessage: 'Reporting structural damage, utilities disruption, and medical needs after the 2013 Bohol earthquake.',
  },
]
```

Create `src/features/demo/historical-selectors.ts`:

```ts
import type { Campaign, Dashboard } from '@/shared'
import { HISTORICAL_INCIDENTS, type HistoricalIncidentMeta } from './historical-incidents'

export type LguIncidentRow = {
  id: string
  disaster: string
  happenedOn: string
  locationLabel: string
  status: Campaign['status']
  historicalAffectedPeople: number
  assessmentCheckIns: number
  unresolved: number
  visited: number
  resolved: number
  neededSupplies: HistoricalIncidentMeta['neededSupplies']
  ereportReportType: HistoricalIncidentMeta['ereportReportType']
}

export type CampaignEReportDefaults = {
  regionCode: string
  provinceCode: string
  municipalityCode: string
  barangayCode: string
  reportType: 'red_tape' | 'accident' | 'fire'
  subject: string
  message: string
}

export function getHistoricalIncidentMeta(campaignId: string): HistoricalIncidentMeta | null {
  return HISTORICAL_INCIDENTS.find(item => item.campaignId === campaignId) ?? null
}

export function buildLguIncidentRows(input: {
  campaigns: Campaign[]
  getDashboard: (campaignId: string) => Dashboard
}): LguIncidentRow[] {
  return input.campaigns
    .map(campaign => {
      const meta = getHistoricalIncidentMeta(campaign.id)
      if (!meta) return null
      const dashboard = input.getDashboard(campaign.id)
      const visited = dashboard.rows.filter(row => row.checkIn.status === 'visited').length
      const resolved = dashboard.rows.filter(row => row.checkIn.status === 'resolved').length

      return {
        id: campaign.id,
        disaster: meta.historicalEventName,
        happenedOn: campaign.disaster_date,
        locationLabel: meta.barangayLabel,
        status: campaign.status,
        historicalAffectedPeople: meta.historicalAffectedPeople,
        assessmentCheckIns: dashboard.affectedCount,
        unresolved: dashboard.unresolvedCount,
        visited,
        resolved,
        neededSupplies: meta.neededSupplies,
        ereportReportType: meta.ereportReportType,
      }
    })
    .filter((row): row is LguIncidentRow => row !== null)
}

export function getCampaignEReportDefaults(campaignId: string): CampaignEReportDefaults | null {
  const meta = getHistoricalIncidentMeta(campaignId)
  if (!meta) return null

  return {
    regionCode: meta.regionCode,
    provinceCode: meta.provinceCode,
    municipalityCode: meta.municipalityCode,
    barangayCode: meta.barangayCodes[0],
    reportType: meta.ereportReportType,
    subject: meta.ereportSubject,
    message: meta.ereportMessage,
  }
}
```

- [ ] **Step 4: Run the selector tests and verify they pass**

Run:

```bash
npx vitest run src/features/demo/historical-selectors.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/demo/historical-incidents.ts src/features/demo/historical-selectors.ts src/features/demo/historical-selectors.test.ts package.json package-lock.json tsconfig.app.json
git commit -m "feat: add historical demo selectors"
```

### Task 3: Curate Geography Fallbacks and Supabase Seed Data

**Files:**
- Modify: `src/lib/psa-fallback-data.ts`
- Modify: `supabase/migrations/20250102000000_seed_data.sql`
- Modify: `supabase/migrations/20250104000000_developers_and_barangays.sql`

**Interfaces:**
- Consumes: `HISTORICAL_INCIDENTS`
- Produces: seed campaigns with IDs `a1000000-0000-0000-0000-000000000001` through `a1000000-0000-0000-0000-000000000003`

- [ ] **Step 1: Write the failing selector test for missing geography codes**

Append this test to `src/features/demo/historical-selectors.test.ts`:

```ts
import { PSA_BARANGAYS, PSA_MUNICIPALITIES, PSA_PROVINCES } from '@/lib/psa-fallback-data'

it('has fallback geography for every historical campaign default', () => {
  expect(PSA_PROVINCES['080000000']?.some(item => item.id === '080370000')).toBe(true)
  expect(PSA_MUNICIPALITIES['080370000']?.some(item => item.id === '0803747000')).toBe(true)
  expect(PSA_BARANGAYS['0803747000']?.some(item => item.id === '0803747001')).toBe(true)

  expect(PSA_PROVINCES['100000000']?.some(item => item.id === '100430000')).toBe(true)
  expect(PSA_MUNICIPALITIES['100430000']?.some(item => item.id === '1004305000')).toBe(true)
  expect(PSA_BARANGAYS['1004305000']?.some(item => item.id === '1004305001')).toBe(true)

  expect(PSA_PROVINCES['070000000']?.some(item => item.id === '070120000')).toBe(true)
  expect(PSA_MUNICIPALITIES['070120000']?.some(item => item.id === '0701200001')).toBe(true)
  expect(PSA_BARANGAYS['0701200001']?.some(item => item.id === '070120000101')).toBe(true)
})
```

- [ ] **Step 2: Run the test file and verify it fails for missing Bohol geography**

Run:

```bash
npx vitest run src/features/demo/historical-selectors.test.ts
```

Expected: FAIL on one or more geography assertions.

- [ ] **Step 3: Add the fallback geography and replace generic seeds with curated historical campaigns**

Add Bohol geography to `src/lib/psa-fallback-data.ts` using the same existing data structure:

```ts
PSA_PROVINCES['070000000'] = [
  { id: '070120000', region_code: '070000000', name: 'BOHOL' },
  { id: '070220000', region_code: '070000000', name: 'CEBU' },
]

PSA_MUNICIPALITIES['070120000'] = [
  { id: '0701200001', region_code: '070000000', province_code: '070120000', name: 'TAGBILARAN CITY' },
]

PSA_BARANGAYS['0701200001'] = [
  { id: '070120000101', region_code: '070000000', province_code: '070120000', municipality_code: '0701200001', name: 'Poblacion I' },
  { id: '070120000102', region_code: '070000000', province_code: '070120000', municipality_code: '0701200001', name: 'Cogon' },
]
```

Replace campaign seeds in `supabase/migrations/20250102000000_seed_data.sql` with three curated campaigns and matching questions/check-ins:

```sql
insert into campaigns (id, name, disaster_type, disaster_date, status, created_by, barangay_code) values
  ('a1000000-0000-0000-0000-000000000001', 'Typhoon Yolanda Rapid Assessment', 'Typhoon', '2013-11-08', 'active', 'OFC_TACLOBAN_001', '0803747001'),
  ('a1000000-0000-0000-0000-000000000002', 'Sendong Flood Household Assessment', 'Flood', '2011-12-17', 'closed', 'OFC_CDO_001', '1004305001'),
  ('a1000000-0000-0000-0000-000000000003', 'Bohol Earthquake Structural Assessment', 'Earthquake', '2013-10-15', 'closed', 'OFC_BOHOL_001', '070120000101')
on conflict (id) do nothing;
```

Seed only relevant RDANA-style questions, for example:

```sql
insert into campaign_questions (id, campaign_id, question_text, need_category, display_order) values
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Is your home heavily damaged or unsafe to occupy?', 'Shelter', 0),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Does your household need food or clean drinking water?', 'Food or water', 1),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Does anyone in your household need medical attention?', 'Medical', 2);
```

Remove unrelated extra campaigns from `supabase/migrations/20250104000000_developers_and_barangays.sql` and replace them with only supporting officials and barangays needed by the curated set.

- [ ] **Step 4: Re-run selector tests and build after seed and geography changes**

Run:

```bash
npx vitest run src/features/demo/historical-selectors.test.ts
npm run build
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/psa-fallback-data.ts supabase/migrations/20250102000000_seed_data.sql supabase/migrations/20250104000000_developers_and_barangays.sql src/features/demo/historical-selectors.test.ts
git commit -m "feat: seed historical demo assessment data"
```

### Task 4: Wire Shared Demo Data into the LGU Dashboard

**Files:**
- Modify: `src/features/lgu/LguDashboard.tsx`
- Modify: `src/shared/index.ts`

**Interfaces:**
- Consumes: `useHandaStore()`, `buildLguIncidentRows()`, `getDashboard(campaignId: string): Dashboard`
- Produces: selector-driven LGU summary cards and table rows

- [ ] **Step 1: Write a failing test for summary rollups from selector-driven rows**

Append this test to `src/features/demo/historical-selectors.test.ts`:

```ts
it('computes rollups that match the same campaign rows used by the LGU dashboard', () => {
  const rows = buildLguIncidentRows({
    campaigns: [
      {
        id: 'a1000000-0000-0000-0000-000000000001',
        name: 'Typhoon Yolanda Rapid Assessment',
        disaster_type: 'Typhoon',
        disaster_date: '2013-11-08',
        status: 'active',
        created_by: 'seed',
        barangay_code: '0803747001',
        alert_id: null,
        ai_generated: false,
        created_at: '2026-07-31T00:00:00.000Z',
        updated_at: '2026-07-31T00:00:00.000Z',
      },
    ],
    getDashboard: () => ({
      affectedCount: 4,
      unresolvedCount: 2,
      needBreakdown: {},
      rows: [
        { checkIn: { id: '1', campaign_id: 'a1000000-0000-0000-0000-000000000001', name: 'A', submitted_by: 'A', status: 'unresolved', created_at: '', updated_at: '' }, answers: [] },
        { checkIn: { id: '2', campaign_id: 'a1000000-0000-0000-0000-000000000001', name: 'B', submitted_by: 'B', status: 'visited', created_at: '', updated_at: '' }, answers: [] },
        { checkIn: { id: '3', campaign_id: 'a1000000-0000-0000-0000-000000000001', name: 'C', submitted_by: 'C', status: 'resolved', created_at: '', updated_at: '' }, answers: [] },
        { checkIn: { id: '4', campaign_id: 'a1000000-0000-0000-0000-000000000001', name: 'D', submitted_by: 'D', status: 'resolved', created_at: '', updated_at: '' }, answers: [] },
      ],
    }),
  })

  expect(rows[0].assessmentCheckIns).toBe(4)
  expect(rows[0].unresolved).toBe(2)
  expect(rows[0].visited).toBe(1)
  expect(rows[0].resolved).toBe(2)
})
```

- [ ] **Step 2: Run the tests to verify they fail if the selector shape changed**

Run:

```bash
npx vitest run src/features/demo/historical-selectors.test.ts
```

Expected: FAIL if the selector output does not yet match the LGU dashboard needs.

- [ ] **Step 3: Replace hard-coded LGU incidents with shared selector output**

Update `src/features/lgu/LguDashboard.tsx` imports:

```tsx
import { useHandaStore } from '@/shared'
import { buildLguIncidentRows } from '@/features/demo/historical-selectors'
```

Replace the static `INCIDENTS` usage with store-backed rows:

```tsx
const store = useHandaStore()
const { data, loading, getDashboard } = store

const incidentRows = useMemo(
  () => buildLguIncidentRows({ campaigns: data.campaigns, getDashboard }),
  [data.campaigns, getDashboard],
)

const totals = incidentRows.reduce(
  (acc, row) => ({
    disasters: acc.disasters + 1,
    affected: acc.affected + row.historicalAffectedPeople,
    checkIns: acc.checkIns + row.assessmentCheckIns,
    unresolved: acc.unresolved + row.unresolved,
    visited: acc.visited + row.visited,
    resolved: acc.resolved + row.resolved,
  }),
  { disasters: 0, affected: 0, checkIns: 0, unresolved: 0, visited: 0, resolved: 0 },
)
```

Update the table headings and cells to show both historical and live assessment data:

```tsx
<th>Historical Affected</th>
<th>Check-ins</th>
<th>Unresolved</th>
<th>Visited</th>
<th>Resolved</th>
<th>eReport</th>
```

- [ ] **Step 4: Run tests, lint, and build**

Run:

```bash
npx vitest run src/features/demo/historical-selectors.test.ts
npm run lint
npm run build
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/lgu/LguDashboard.tsx src/shared/index.ts src/features/demo/historical-selectors.test.ts
git commit -m "feat: sync lgu dashboard with historical assessment data"
```

### Task 5: Make eReport Defaults Campaign-Aware

**Files:**
- Modify: `src/components/DisasterReportForm.tsx`
- Modify: `src/features/resident/ResidentConsole.tsx`
- Modify: `src/features/official/OfficialConsole.tsx`
- Modify: `src/features/demo/historical-selectors.ts`

**Interfaces:**
- Consumes: `getCampaignEReportDefaults(campaignId: string): CampaignEReportDefaults | null`
- Produces: `DisasterReportForm` props for selected or active campaign context

- [ ] **Step 1: Write a failing selector test for campaign-aware eReport precedence**

Append this test to `src/features/demo/historical-selectors.test.ts`:

```ts
it('returns the selected campaign geography before any active-campaign fallback', () => {
  const defaults = getCampaignEReportDefaults('a1000000-0000-0000-0000-000000000003')
  expect(defaults?.municipalityCode).toBe('0701200001')
  expect(defaults?.barangayCode).toBe('070120000101')
})
```

- [ ] **Step 2: Run the selector tests and verify the expectation first**

Run:

```bash
npx vitest run src/features/demo/historical-selectors.test.ts
```

Expected: PASS

- [ ] **Step 3: Thread campaign defaults into the eReport modal**

Extend `DisasterReportForm` props:

```ts
interface DisasterReportFormProps {
  isOpen: boolean
  onClose: () => void
  disasterName?: string
  campaignDefaults?: {
    regionCode: string
    provinceCode: string
    municipalityCode: string
    barangayCode: string
    reportType: 'red_tape' | 'accident' | 'fire'
    subject: string
    message: string
  } | null
  userProfile?: {
    first_name: string
    last_name: string
    mobile: string
    email: string
  }
}
```

Initialize state from `campaignDefaults` instead of always taking the first dataset item:

```ts
const [selectedRegion, setSelectedRegion] = useState(campaignDefaults?.regionCode ?? '')
const [selectedProvince, setSelectedProvince] = useState(campaignDefaults?.provinceCode ?? '')
const [selectedMunicipality, setSelectedMunicipality] = useState(campaignDefaults?.municipalityCode ?? '')
const [selectedBarangay, setSelectedBarangay] = useState(campaignDefaults?.barangayCode ?? '')
const [selectedReportType, setSelectedReportType] = useState(campaignDefaults?.reportType ?? 'red_tape')
const [subject, setSubject] = useState(campaignDefaults?.subject ?? `Affected Person Report - ${disasterName}`)
const [message, setMessage] = useState(campaignDefaults?.message ?? `Reporting affected household status during ${disasterName}. Immediate relief assistance and monitoring requested.`)
```

Pass the defaults from the resident console using the active campaign:

```tsx
import { getCampaignEReportDefaults } from '@/features/demo/historical-selectors'

const eReportDefaults = activeCampaign ? getCampaignEReportDefaults(activeCampaign.id) : null
```

Pass selected-campaign defaults from the official console:

```tsx
const eReportDefaults = selectedCampaign ? getCampaignEReportDefaults(selectedCampaign.id) : null
```

- [ ] **Step 4: Run tests, lint, and build**

Run:

```bash
npx vitest run src/features/demo/historical-selectors.test.ts
npm run lint
npm run build
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/DisasterReportForm.tsx src/features/resident/ResidentConsole.tsx src/features/official/OfficialConsole.tsx src/features/demo/historical-selectors.ts src/features/demo/historical-selectors.test.ts
git commit -m "feat: align ereport defaults with selected assessments"
```

### Task 6: Remove Remaining Generic Draft Artifacts and Verify Demo Flow

**Files:**
- Modify: `src/features/official/OfficialConsole.tsx`
- Modify: `src/features/lgu/LguDashboard.tsx`
- Modify: `src/features/demo/historical-incidents.ts`
- Modify: `supabase/migrations/20250102000000_seed_data.sql`
- Modify: `supabase/migrations/20250104000000_developers_and_barangays.sql`

**Interfaces:**
- Consumes: curated historical campaign IDs and metadata
- Produces: a clean assessment list containing only the final historical demo set

- [ ] **Step 1: Write a failing selector test for the final curated campaign set**

Append this test to `src/features/demo/historical-selectors.test.ts`:

```ts
import { HISTORICAL_INCIDENTS } from './historical-incidents'

it('ships exactly the three curated historical demo incidents', () => {
  expect(HISTORICAL_INCIDENTS.map(item => item.historicalEventName)).toEqual([
    'Typhoon Yolanda / Haiyan',
    'Tropical Storm Sendong / Washi',
    '2013 Bohol Earthquake',
  ])
})
```

- [ ] **Step 2: Run the tests to lock the final dataset shape**

Run:

```bash
npx vitest run src/features/demo/historical-selectors.test.ts
```

Expected: PASS

- [ ] **Step 3: Remove leftover generic demo copy and stale draft records from the visible flow**

In `src/features/official/OfficialConsole.tsx`, make the saved assessment copy reflect the curated demo set and avoid generic placeholders like:

```tsx
placeholder="e.g. Typhoon Yolanda Rapid Assessment"
```

Ensure the saved-assessment list and question copy dropdown only surface the curated historical campaigns seeded by the migration files.

In `src/features/lgu/LguDashboard.tsx`, update summary-card labels to preserve the historical/live distinction:

```tsx
<span>Historical People Affected</span>
<span>Assessment Check-ins</span>
<span>People Unresolved</span>
```

Keep any AI draft UI from generating extra visible demo assessments unless the user explicitly triggers the alert simulator during the demo.

- [ ] **Step 4: Run the full verification set**

Run:

```bash
npx vitest run src/features/demo/historical-selectors.test.ts
npm run lint
npm run build
```

Manual verification checklist:

```text
1. Open official console and confirm only the three curated historical assessments appear by default.
2. Open LGU dashboard and confirm every row corresponds to one of those same assessments.
3. Open resident console and confirm the eReport modal defaults to the active campaign's location and event wording.
4. Confirm LGU dashboard shows historical affected totals separately from live check-in totals.
5. Confirm CSV export still works from the selected official assessment.
```

Expected: PASS for automated checks and all five manual checks.

- [ ] **Step 5: Commit**

```bash
git add src/features/official/OfficialConsole.tsx src/features/lgu/LguDashboard.tsx src/features/demo/historical-incidents.ts src/features/demo/historical-selectors.test.ts supabase/migrations/20250102000000_seed_data.sql supabase/migrations/20250104000000_developers_and_barangays.sql
git commit -m "feat: finalize historical demo assessment flow"
```

## Self-Review

- Spec coverage check:
  - Historical disasters and real locations: Tasks 2 and 3
  - People affected and needed supplies: Tasks 2 and 4
  - Shared LGU and Assessment sync: Tasks 2 and 4
  - eReport alignment: Task 5
  - Remove generic drafts and unused data: Tasks 3 and 6
  - Build and type verification: Tasks 1, 3, 4, 5, and 6
- Placeholder scan: no `TODO`, `TBD`, or deferred implementation markers remain.
- Type consistency check:
  - `HistoricalIncidentMeta`, `LguIncidentRow`, and `CampaignEReportDefaults` are introduced in Task 2 and reused consistently in Tasks 4 and 5.
  - Seed campaign IDs introduced in Task 3 match the metadata IDs introduced in Task 2.

## Execution Handoff

Plan complete and saved to `docs/plans/2026-07-31-historical-demo-assessment-sync.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**

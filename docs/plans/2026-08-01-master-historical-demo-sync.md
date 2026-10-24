# Master Historical Demo Sync Implementation Plan

**Goal:** Sync `master` to the worktree's newer historical demo flow so all `historical-*` demo imports, metadata, and consumers build correctly.

**Architecture:** Copy the historical demo data/selector layer from `.worktrees/edge-functions-sync` into `src/features/demo/`, then update `master` consumers to use that shared selector layer instead of mock-only or missing-module behavior. Keep the sync surgical: preserve worktree behavior for the historical path and avoid unrelated refactors.

**Tech Stack:** React 19, TypeScript, Vite, Vitest

## Global Constraints

- Treat `.worktrees/edge-functions-sync` as the source of truth for the historical demo flow and copy the relevant `historical-*` implementation into `master`.
- The sync should include all `src/features/demo/historical-*` files that exist in the worktree and are part of the historical demo flow.
- Consumers should import from the synced selector layer rather than duplicate logic inline.
- Historical campaign IDs used by selectors must match the seeded campaign IDs in `historical-demo-data.ts`.
- Run the TypeScript check for the project after the multi-file sync.
- Do not broadly merge the worktree into `master` or refactor unrelated demo, auth, or dashboard code.

---

### Task 1: Restore the Historical Selector Layer on `master`

**Files:**
- Create: `src/features/demo/historical-incidents.ts`
- Create: `src/features/demo/historical-selectors.ts`
- Test: `src/features/demo/historical-selectors.test.ts`
- Reference: `.worktrees/edge-functions-sync/src/features/demo/historical-incidents.ts`
- Reference: `.worktrees/edge-functions-sync/src/features/demo/historical-selectors.ts`
- Reference: `.worktrees/edge-functions-sync/src/features/demo/historical-selectors.test.ts`

**Interfaces:**
- Consumes: `Campaign` and `Dashboard` types from `@/shared`
- Produces: `getHistoricalIncidentMeta(campaignId: string): HistoricalIncidentMeta | null`
- Produces: `buildLguIncidentRows(input: { campaigns: Campaign[]; getDashboard: (campaignId: string) => Dashboard }): LguIncidentRow[]`
- Produces: `summarizeNeededSupplies(rows: LguIncidentRow[]): NeededSupplySummary[]`
- Produces: `getCampaignEReportDefaults(campaignId: string): CampaignEReportDefaults | null`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { buildLguIncidentRows, getCampaignEReportDefaults, getHistoricalIncidentMeta, summarizeNeededSupplies } from './historical-selectors'
import { PSA_BARANGAYS, PSA_MUNICIPALITIES, PSA_PROVINCES } from '@/lib/psa-fallback-data'
import { HISTORICAL_INCIDENTS } from './historical-incidents'

describe('historical demo selectors', () => {
  it('returns metadata for the Tacloban historical campaign', () => {
    const meta = getHistoricalIncidentMeta('a1000000-0000-0000-0000-000000000001')
    expect(meta?.historicalEventName).toBe('Typhoon Yolanda / Haiyan')
    expect(meta?.municipalityCode).toBe('0803747000')
  })

  it('returns campaign-aware eReport defaults', () => {
    const defaults = getCampaignEReportDefaults('a1000000-0000-0000-0000-000000000002')
    expect(defaults?.municipalityCode).toBe('1004305000')
    expect(defaults?.subject).toContain('Sendong')
  })

  it('ships exactly the three curated historical demo incidents', () => {
    expect(HISTORICAL_INCIDENTS.map(item => item.historicalEventName)).toEqual([
      'Typhoon Yolanda / Haiyan',
      'Tropical Storm Sendong / Washi',
      '2013 Bohol Earthquake',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:unit -- src/features/demo/historical-selectors.test.ts`
Expected: FAIL with module resolution or missing file errors for `./historical-selectors` and `./historical-incidents`

- [ ] **Step 3: Write the minimal implementation by copying the worktree modules**

```ts
// src/features/demo/historical-incidents.ts
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
]
```

```ts
// src/features/demo/historical-selectors.ts
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

export function getHistoricalIncidentMeta(campaignId: string): HistoricalIncidentMeta | null {
  return HISTORICAL_INCIDENTS.find(item => item.campaignId === campaignId) ?? null
}

export function getCampaignEReportDefaults(campaignId: string) {
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

Implementation note: copy the complete file contents from the worktree versions, not just the abbreviated snippet above.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm run test:unit -- src/features/demo/historical-selectors.test.ts`
Expected: PASS for the copied selector tests

- [ ] **Step 5: Commit**

```bash
git add src/features/demo/historical-incidents.ts src/features/demo/historical-selectors.ts src/features/demo/historical-selectors.test.ts
git commit -m "feat: sync historical demo selectors"
```

### Task 2: Sync `master` Consumers to the Shared Historical Demo Flow

**Files:**
- Modify: `src/features/resident/ResidentConsole.tsx`
- Modify: `src/features/lgu/LguDashboard.tsx`
- Modify: `src/features/official/OfficialConsole.tsx`
- Reference: `.worktrees/edge-functions-sync/src/features/resident/ResidentConsole.tsx`
- Reference: `.worktrees/edge-functions-sync/src/features/lgu/LguDashboard.tsx`
- Reference: `.worktrees/edge-functions-sync/src/features/official/OfficialConsole.tsx`

**Interfaces:**
- Consumes: `getCampaignEReportDefaults(campaignId: string): CampaignEReportDefaults | null`
- Consumes: `buildLguIncidentRows(input: { campaigns: Campaign[]; getDashboard: (campaignId: string) => Dashboard }): LguIncidentRow[]`
- Consumes: `summarizeNeededSupplies(rows: LguIncidentRow[]): NeededSupplySummary[]`
- Consumes: `getHistoricalIncidentMeta(campaignId: string): HistoricalIncidentMeta | null`
- Produces: buildable consumer imports with no missing historical demo modules

- [ ] **Step 1: Write or preserve the failing integration surface**

```ts
// ResidentConsole already contains the failing import surface on master.
import { getCampaignEReportDefaults } from '@/features/demo/historical-selectors'

// LguDashboard should consume the selector layer instead of the local INCIDENTS array.
import { buildLguIncidentRows, summarizeNeededSupplies } from '@/features/demo/historical-selectors'

// OfficialConsole should be able to derive metadata for the selected campaign.
import { getHistoricalIncidentMeta } from '@/features/demo/historical-selectors'
```

- [ ] **Step 2: Run the type check to capture the current consumer failures**

Run: `npm run build`
Expected: FAIL before the consumer sync if `master` still contains mismatched imports, unresolved symbols, or stale mock-only logic

- [ ] **Step 3: Copy the worktree consumer changes with minimal `master`-specific adjustment**

```ts
// src/features/lgu/LguDashboard.tsx
import { useHandaStore } from '@/shared'
import { buildLguIncidentRows, summarizeNeededSupplies } from '@/features/demo/historical-selectors'

const incidentRows = useMemo(
  () => buildLguIncidentRows({ campaigns: data.campaigns, getDashboard }),
  [data.campaigns, getDashboard],
)
const neededSupplies = useMemo(() => summarizeNeededSupplies(incidentRows), [incidentRows])
```

```ts
// src/features/official/OfficialConsole.tsx
import { getHistoricalIncidentMeta } from '@/features/demo/historical-selectors'

const selectedCampaignMeta = selectedCampaign ? getHistoricalIncidentMeta(selectedCampaign.id) : null
```

```ts
// src/features/resident/ResidentConsole.tsx
const eReportDefaults = activeCampaign ? getCampaignEReportDefaults(activeCampaign.id) : null
```

Implementation note: copy the relevant worktree UI blocks too, not only the imports, when the worktree relies on the derived incident rows or metadata in rendered output.

- [ ] **Step 4: Run the full type check again**

Run: `npm run build`
Expected: PASS for TypeScript and Vite build, with the original import-resolution error removed

- [ ] **Step 5: Commit**

```bash
git add src/features/resident/ResidentConsole.tsx src/features/lgu/LguDashboard.tsx src/features/official/OfficialConsole.tsx
git commit -m "feat: sync historical demo consumers"
```

### Task 3: Final Verification Against the Historical Demo Spec

**Files:**
- Verify: `src/features/demo/historical-demo-data.ts`
- Verify: `src/features/demo/historical-incidents.ts`
- Verify: `src/features/demo/historical-selectors.ts`
- Verify: `src/features/resident/ResidentConsole.tsx`
- Verify: `src/features/lgu/LguDashboard.tsx`
- Verify: `src/features/official/OfficialConsole.tsx`

**Interfaces:**
- Consumes: copied historical campaign IDs and metadata mappings
- Produces: confirmation that `master` matches the intended historical demo path closely enough to replace the broken partial sync

- [ ] **Step 1: Verify campaign IDs and selector mappings stay aligned**

```ts
// Confirm the three historical campaign IDs are shared consistently:
// - historical-demo-data.ts campaign ids
// - historical-incidents.ts campaignId values
// - selector tests using those ids
const expectedCampaignIds = [
  'a1000000-0000-0000-0000-000000000001',
  'a1000000-0000-0000-0000-000000000002',
  'a1000000-0000-0000-0000-000000000003',
]
```

- [ ] **Step 2: Run the focused unit tests and the full build**

Run: `npm run test:unit -- src/features/demo/historical-selectors.test.ts`
Expected: PASS

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Smoke-check the original failure path**

Run: `npm run dev`
Expected: Vite starts without `[plugin:vite:import-analysis] Failed to resolve import "@/features/demo/historical-selectors"`

- [ ] **Step 4: Record any remaining non-historical drift instead of broadening scope**

```md
If a remaining issue is outside the `historical-*` sync path, document it in the task handoff instead of adding unrelated fixes.
```

- [ ] **Step 5: Commit**

```bash
git add src/features/demo/historical-demo-data.ts src/features/demo/historical-incidents.ts src/features/demo/historical-selectors.ts src/features/demo/historical-selectors.test.ts src/features/resident/ResidentConsole.tsx src/features/lgu/LguDashboard.tsx src/features/official/OfficialConsole.tsx
git commit -m "test: verify historical demo sync"
```

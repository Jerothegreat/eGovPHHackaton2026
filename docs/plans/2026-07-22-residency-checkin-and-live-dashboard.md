# Residency Check-in & Live Barangay Dashboard — Implementation Plan

**Goal:** Implement the full HANDA happy path — official creates/publishes campaigns, residents check in with household matching, officials see a live dashboard with realtime updates, status tracking, and CSV export.

**Architecture:** Feature-based layout mirroring the PRD's 7 modules. Two deep pure modules (HouseholdMatcher, DashboardAggregator) in `src/lib/` with vitest unit tests. Supabase direct client access with anon key. Supabase Realtime for live dashboard updates. Inline styles using existing eGov theme tokens (matching existing page patterns).

**Tech Stack:** React 19 + TypeScript 6 + Vite 8 + Tailwind CSS v4 + shadcn/ui (base-lyra style) + @supabase/supabase-js + vitest

## Global Constraints

- RLS disabled (hackathon speed) — identity stored as plain columns
- No backend, no Edge Functions — frontend-only, direct Supabase anon key
- Demo must run end-to-end in under 3 minutes with seeded data
- Mock mode for eGovPH SSO (USE_MOCK !== "false") — 3 demo identities: josie (official), maria/pedro (residents)
- Need categories: `shelter`, `medical`, `food_water`
- Status transitions: `unresolved` → `visited` → `resolved` only
- Manual check-in entry (#15) is owned by another person — do NOT implement
- Existing eGov inline style pattern: `var(--egov-blue)`, `var(--egov-ink)`, `var(--egov-muted)`, `var(--egov-line)`, `var(--egov-soft)`, `var(--egov-radius)`, `var(--card)`

---

### Task 1: Install vitest + write shared types + HouseholdMatcher with tests

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/matcher.ts`
- Create: `src/__tests__/matcher.test.ts`
- Modify: `package.json` (add vitest)
- Modify: `tsconfig.app.json` (exclude tests from app build)
- Create: `vitest.config.ts`

**Interfaces:**
- Produces: `HouseholdMatcher.match(resident, members, households) → { kind: "match"; householdId: string } | { kind: "candidates"; candidates: Household[] }`
- Produces: shared types `Campaign`, `CampaignQuestion`, `Household`, `HouseholdMember`, `CheckIn`, `CheckInAnswer`, `CampaignStatus`, `CheckInStatus`

- [ ] **Step 1: Install vitest**

Run:
```bash
pnpm add -D vitest
```

- [ ] **Step 2: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    include: ["src/__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
```

- [ ] **Step 3: Exclude tests from app TypeScript build**

In `tsconfig.app.json`, add to the existing object (after `"include": ["src"]`):
```json
"exclude": ["src/__tests__"]
```

- [ ] **Step 4: Create shared types**

Create `src/lib/types.ts`:
```ts
export type CampaignStatus = "draft" | "active" | "closed" | "archived"
export type CheckInStatus = "unresolved" | "visited" | "resolved"
export type NeedCategory = "shelter" | "medical" | "food_water"

export interface Campaign {
  id: string
  name: string
  disaster_type: string
  disaster_date: string
  status: CampaignStatus
  created_by: string
  barangay_code: string
  created_at: string
  updated_at: string
}

export interface CampaignQuestion {
  id: string
  campaign_id: string
  question_text: string
  need_category: NeedCategory
  display_order: number
}

export interface Household {
  id: string
  barangay_code: string
  household_head_name: string
  address: string
  member_count: number
}

export interface HouseholdMember {
  id: string
  household_id: string
  first_name: string
  last_name: string
}

export interface CheckIn {
  id: string
  campaign_id: string
  household_id: string
  submitted_by: string
  status: CheckInStatus
  created_at: string
  updated_at: string
}

export interface CheckInAnswer {
  id: string
  check_in_id: string
  question_id: string
  answer: string
}

export interface ResidentInfo {
  first_name: string
  last_name: string
  barangay_code: string
}
```

- [ ] **Step 5: Write failing matcher tests**

Create `src/__tests__/matcher.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { matchHousehold } from "@/lib/matcher"
import type { HouseholdMember, Household, ResidentInfo } from "@/lib/types"

const households: Household[] = [
  { id: "hh-1", barangay_code: "0105503021", household_head_name: "Santos Household", address: "Blk 4", member_count: 4 },
  { id: "hh-2", barangay_code: "0105503021", household_head_name: "Reyes Household", address: "Blk 5", member_count: 3 },
  { id: "hh-3", barangay_code: "0105503021", household_head_name: "Cruz Household", address: "Blk 6", member_count: 5 },
]

const members: HouseholdMember[] = [
  { id: "m-1", household_id: "hh-1", first_name: "MARIA", last_name: "SANTOS" },
  { id: "m-2", household_id: "hh-1", first_name: "JUAN", last_name: "SANTOS" },
  { id: "m-3", household_id: "hh-2", first_name: "PEDRO", last_name: "REYES" },
  { id: "m-4", household_id: "hh-2", first_name: "ROSA", last_name: "REYES" },
  { id: "m-5", household_id: "hh-3", first_name: "JOSE", last_name: "CRUZ" },
]

describe("matchHousehold", () => {
  it("returns match when exactly one member matches by last_name + first_name (case-insensitive)", () => {
    const resident: ResidentInfo = { first_name: "maria", last_name: "santos", barangay_code: "0105503021" }
    const result = matchHousehold(resident, members, households)
    expect(result).toEqual({ kind: "match", householdId: "hh-1" })
  })

  it("returns match for exact uppercase match", () => {
    const resident: ResidentInfo = { first_name: "PEDRO", last_name: "REYES", barangay_code: "0105503021" }
    const result = matchHousehold(resident, members, households)
    expect(result).toEqual({ kind: "match", householdId: "hh-2" })
  })

  it("returns candidates when no member matches", () => {
    const resident: ResidentInfo = { first_name: "UNKNOWN", last_name: "PERSON", barangay_code: "0105503021" }
    const result = matchHousehold(resident, members, households)
    expect(result).toEqual({ kind: "candidates", candidates: households })
  })

  it("returns candidates when multiple members match (same last_name, different households)", () => {
    const extraMembers: HouseholdMember[] = [
      ...members,
      { id: "m-6", household_id: "hh-3", first_name: "MARIA", last_name: "CRUZ" },
    ]
    const resident: ResidentInfo = { first_name: "MARIA", last_name: "CRUZ", barangay_code: "0105503021" }
    const result = matchHousehold(resident, extraMembers, households)
    expect(result.kind).toBe("candidates")
    if (result.kind === "candidates") {
      expect(result.candidates.length).toBe(1)
      expect(result.candidates[0].id).toBe("hh-3")
    }
  })

  it("returns candidates when same name appears in multiple households", () => {
    const ambiguousMembers: HouseholdMember[] = [
      { id: "m-10", household_id: "hh-1", first_name: "MARIA", last_name: "SANTOS" },
      { id: "m-11", household_id: "hh-2", first_name: "MARIA", last_name: "SANTOS" },
    ]
    const resident: ResidentInfo = { first_name: "MARIA", last_name: "SANTOS", barangay_code: "0105503021" }
    const result = matchHousehold(resident, ambiguousMembers, households)
    expect(result.kind).toBe("candidates")
  })

  it("filters members by barangay_code via household filter", () => {
    const resident: ResidentInfo = { first_name: "maria", last_name: "santos", barangay_code: "9999999999" }
    const result = matchHousehold(resident, members, households)
    expect(result).toEqual({ kind: "candidates", candidates: [] })
  })
})
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `pnpm vitest run`
Expected: FAIL — `Cannot find module '@/lib/matcher'`

- [ ] **Step 7: Implement matcher**

Create `src/lib/matcher.ts`:
```ts
import type { Household, HouseholdMember, ResidentInfo } from "./types"

export type MatchResult =
  | { kind: "match"; householdId: string }
  | { kind: "candidates"; candidates: Household[] }

export function matchHousehold(
  resident: ResidentInfo,
  members: HouseholdMember[],
  households: Household[]
): MatchResult {
  const barangayHouseholds = households.filter((h) => h.barangay_code === resident.barangay_code)
  const barangayHouseholdIds = new Set(barangayHouseholds.map((h) => h.id))

  const barangayMembers = members.filter((m) => barangayHouseholdIds.has(m.household_id))

  const matchingMembers = barangayMembers.filter(
    (m) =>
      m.last_name.toUpperCase() === resident.last_name.toUpperCase() &&
      m.first_name.toUpperCase() === resident.first_name.toUpperCase()
  )

  const matchedHouseholdIds = new Set(matchingMembers.map((m) => m.household_id))

  if (matchedHouseholdIds.size === 1) {
    return { kind: "match", householdId: matchedHouseholdIds.values().next().value! }
  }

  if (matchedHouseholdIds.size > 1) {
    const candidates = barangayHouseholds.filter((h) => matchedHouseholdIds.has(h.id))
    return { kind: "candidates", candidates }
  }

  if (matchedHouseholdIds.size === 0) {
    return { kind: "candidates", candidates: barangayHouseholds }
  }

  return { kind: "candidates", candidates: barangayHouseholds }
}
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `pnpm vitest run`
Expected: All 6 tests PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/types.ts src/lib/matcher.ts src/__tests__/matcher.test.ts vitest.config.ts package.json pnpm-lock.yaml tsconfig.app.json
git commit -m "feat: add shared types, HouseholdMatcher, and vitest tests"
```

---

### Task 2: DashboardAggregator with tests

**Files:**
- Create: `src/lib/aggregator.ts`
- Create: `src/__tests__/aggregator.test.ts`

**Interfaces:**
- Consumes: types from `src/lib/types.ts`
- Produces: `aggregate(checkIns, answers, questions, households) → DashboardData`
- Produces: `filterAffected(rows, filters) → AffectedRow[]`

- [ ] **Step 1: Write failing aggregator tests**

Create `src/__tests__/aggregator.test.ts`:
```ts
import { describe, it, expect } from "vitest"
import { aggregate, filterAffected } from "@/lib/aggregator"
import type { CheckIn, CheckInAnswer, CampaignQuestion, Household } from "@/lib/types"

const households: Household[] = [
  { id: "hh-1", barangay_code: "0105503021", household_head_name: "Santos", address: "Blk 4", member_count: 4 },
  { id: "hh-2", barangay_code: "0105503021", household_head_name: "Reyes", address: "Blk 5", member_count: 3 },
  { id: "hh-3", barangay_code: "0105503021", household_head_name: "Cruz", address: "Blk 6", member_count: 5 },
]

const questions: CampaignQuestion[] = [
  { id: "q-1", campaign_id: "c-1", question_text: "Home damaged?", need_category: "shelter", display_order: 0 },
  { id: "q-2", campaign_id: "c-1", question_text: "Need medical?", need_category: "medical", display_order: 1 },
  { id: "q-3", campaign_id: "c-1", question_text: "Need food?", need_category: "food_water", display_order: 2 },
]

describe("aggregate", () => {
  it("counts distinct affected households (dedup by household_id)", () => {
    const checkIns: CheckIn[] = [
      { id: "ci-1", campaign_id: "c-1", household_id: "hh-1", submitted_by: "u1", status: "unresolved", created_at: "", updated_at: "" },
      { id: "ci-2", campaign_id: "c-1", household_id: "hh-1", submitted_by: "u2", status: "unresolved", created_at: "", updated_at: "" },
      { id: "ci-3", campaign_id: "c-1", household_id: "hh-2", submitted_by: "u3", status: "unresolved", created_at: "", updated_at: "" },
    ]
    const answers: CheckInAnswer[] = []
    const result = aggregate(checkIns, answers, questions, households)
    expect(result.totalAffected).toBe(2)
  })

  it("computes need-type breakdown from answers", () => {
    const checkIns: CheckIn[] = [
      { id: "ci-1", campaign_id: "c-1", household_id: "hh-1", submitted_by: "u1", status: "unresolved", created_at: "", updated_at: "" },
    ]
    const answers: CheckInAnswer[] = [
      { id: "a-1", check_in_id: "ci-1", question_id: "q-1", answer: "yes" },
      { id: "a-2", check_in_id: "ci-1", question_id: "q-2", answer: "no" },
      { id: "a-3", check_in_id: "ci-1", question_id: "q-3", answer: "yes" },
    ]
    const result = aggregate(checkIns, answers, questions, households)
    expect(result.byNeedType).toEqual({ shelter: 1, medical: 0, food_water: 1 })
  })

  it("identifies non-respondents (households with no check-in)", () => {
    const checkIns: CheckIn[] = [
      { id: "ci-1", campaign_id: "c-1", household_id: "hh-1", submitted_by: "u1", status: "unresolved", created_at: "", updated_at: "" },
    ]
    const result = aggregate(checkIns, [], questions, households)
    expect(result.nonRespondents.length).toBe(2)
    expect(result.nonRespondents.map((h) => h.id)).toEqual(["hh-2", "hh-3"])
  })

  it("breaks down by status", () => {
    const checkIns: CheckIn[] = [
      { id: "ci-1", campaign_id: "c-1", household_id: "hh-1", submitted_by: "u1", status: "unresolved", created_at: "", updated_at: "" },
      { id: "ci-2", campaign_id: "c-1", household_id: "hh-2", submitted_by: "u2", status: "visited", created_at: "", updated_at: "" },
      { id: "ci-3", campaign_id: "c-1", household_id: "hh-3", submitted_by: "u3", status: "resolved", created_at: "", updated_at: "" },
    ]
    const result = aggregate(checkIns, [], questions, households)
    expect(result.byStatus).toEqual({ unresolved: 1, visited: 1, resolved: 1 })
  })

  it("builds affected rows with need badges", () => {
    const checkIns: CheckIn[] = [
      { id: "ci-1", campaign_id: "c-1", household_id: "hh-1", submitted_by: "u1", status: "unresolved", created_at: "", updated_at: "" },
    ]
    const answers: CheckInAnswer[] = [
      { id: "a-1", check_in_id: "ci-1", question_id: "q-1", answer: "yes" },
      { id: "a-2", check_in_id: "ci-1", question_id: "q-3", answer: "yes" },
    ]
    const result = aggregate(checkIns, answers, questions, households)
    expect(result.affected.length).toBe(1)
    expect(result.affected[0].needs).toEqual(["shelter", "food_water"])
    expect(result.affected[0].household.household_head_name).toBe("Santos")
  })
})

describe("filterAffected", () => {
  const affected = [
    { checkInId: "ci-1", household: households[0], needs: ["shelter"] as string[], status: "unresolved" as const },
    { checkInId: "ci-2", household: households[1], needs: ["medical"] as string[], status: "visited" as const },
    { checkInId: "ci-3", household: households[2], needs: ["shelter", "food_water"] as string[], status: "resolved" as const },
  ]

  it("filters by need type", () => {
    const result = filterAffected(affected, { needType: "shelter" })
    expect(result.length).toBe(2)
  })

  it("filters by status", () => {
    const result = filterAffected(affected, { status: "visited" })
    expect(result.length).toBe(1)
    expect(result[0].checkInId).toBe("ci-2")
  })

  it("returns all when no filters", () => {
    const result = filterAffected(affected, {})
    expect(result.length).toBe(3)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run`
Expected: FAIL — `Cannot find module '@/lib/aggregator'`

- [ ] **Step 3: Implement aggregator**

Create `src/lib/aggregator.ts`:
```ts
import type { CheckIn, CheckInAnswer, CampaignQuestion, Household, NeedCategory } from "./types"

export interface AffectedRow {
  checkInId: string
  household: Household
  needs: NeedCategory[]
  status: CheckIn["status"]
}

export interface DashboardData {
  totalAffected: number
  byNeedType: Record<NeedCategory, number>
  byStatus: Record<CheckIn["status"], number>
  affected: AffectedRow[]
  nonRespondents: Household[]
}

export function aggregate(
  checkIns: CheckIn[],
  answers: CheckInAnswer[],
  questions: CampaignQuestion[],
  households: Household[]
): DashboardData {
  const householdById = new Map(households.map((h) => [h.id, h]))

  const checkInByHousehold = new Map<string, CheckIn>()
  for (const ci of checkIns) {
    if (!checkInByHousehold.has(ci.household_id)) {
      checkInByHousehold.set(ci.household_id, ci)
    }
  }

  const answersByCheckIn = new Map<string, CheckInAnswer[]>()
  for (const a of answers) {
    const list = answersByCheckIn.get(a.check_in_id) ?? []
    list.push(a)
    answersByCheckIn.set(a.check_in_id, list)
  }

  const questionById = new Map(questions.map((q) => [q.id, q]))

  const byNeedType: Record<NeedCategory, number> = { shelter: 0, medical: 0, food_water: 0 }
  const byStatus: Record<CheckIn["status"], number> = { unresolved: 0, visited: 0, resolved: 0 }
  const affected: AffectedRow[] = []
  const checkedInHouseholdIds = new Set<string>()

  for (const [householdId, ci] of checkInByHousehold) {
    const hh = householdById.get(householdId)
    if (!hh) continue

    checkedInHouseholdIds.add(householdId)
    byStatus[ci.status]++

    const hhAnswers = answersByCheckIn.get(ci.id) ?? []
    const needs = new Set<NeedCategory>()
    for (const a of hhAnswers) {
      if (a.answer.toLowerCase() === "yes") {
        const q = questionById.get(a.question_id)
        if (q) needs.add(q.need_category)
      }
    }

    for (const need of needs) {
      byNeedType[need]++
    }

    affected.push({
      checkInId: ci.id,
      household: hh,
      needs: Array.from(needs).sort(),
      status: ci.status,
    })
  }

  const nonRespondents = households.filter((h) => !checkedInHouseholdIds.has(h.id))

  return {
    totalAffected: affected.length,
    byNeedType,
    byStatus,
    affected,
    nonRespondents,
  }
}

export function filterAffected(
  rows: AffectedRow[],
  filters: { needType?: NeedCategory; status?: CheckIn["status"] }
): AffectedRow[] {
  return rows.filter((row) => {
    if (filters.needType && !row.needs.includes(filters.needType)) return false
    if (filters.status && row.status !== filters.status) return false
    return true
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run`
Expected: All 8 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/aggregator.ts src/__tests__/aggregator.test.ts
git commit -m "feat: add DashboardAggregator with vitest tests"
```

---

### Task 3: CSV ExportService

**Files:**
- Create: `src/lib/csv.ts`

**Interfaces:**
- Consumes: `AffectedRow` from `src/lib/aggregator.ts`
- Produces: `toCsv(rows) → string`, `downloadCsv(filename, csv)`

- [ ] **Step 1: Implement csv.ts**

Create `src/lib/csv.ts`:
```ts
import type { AffectedRow } from "./aggregator"

export function toCsv(rows: AffectedRow[]): string {
  const header = "Household,Address,Needs,Status"
  const lines = rows.map((row) => {
    const needs = row.needs.join("; ")
    return `"${row.household.household_head_name}","${row.household.address}","${needs}","${row.status}"`
  })
  return [header, ...lines].join("\n")
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/csv.ts
git commit -m "feat: add CSV ExportService"
```

---

### Task 4: Database migrations (unique constraint + realtime publication)

**Files:**
- Create: `supabase/migrations/20250101000003_check_ins_unique.sql`
- Create: `supabase/migrations/20250101000004_realtime_publication.sql`

- [ ] **Step 1: Create unique constraint migration**

Create `supabase/migrations/20250101000003_check_ins_unique.sql`:
```sql
alter table check_ins
  add constraint check_ins_campaign_household_unique
  unique (campaign_id, household_id);
```

- [ ] **Step 2: Create realtime publication migration**

Create `supabase/migrations/20250101000004_realtime_publication.sql`:
```sql
alter publication supabase_realtime add table campaigns;
alter publication supabase_realtime add table check_ins;
alter publication supabase_realtime add table check_in_answers;
```

- [ ] **Step 3: Apply migrations to local Supabase**

Run:
```bash
npx supabase db push
```
Expected: Both migrations applied successfully.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add unique constraint on check_ins and realtime publication"
```

---

### Task 5: Campaigns feature (types, service, builder, hooks)

**Files:**
- Create: `src/features/campaigns/types.ts`
- Create: `src/features/campaigns/service.ts`
- Create: `src/features/campaigns/useCampaigns.ts`
- Create: `src/features/campaigns/CampaignBuilder.tsx`

**Interfaces:**
- Consumes: `Campaign`, `CampaignQuestion`, `NeedCategory` from `src/lib/types.ts`
- Consumes: `supabase` from `src/lib/supabase.ts`
- Produces: `useCampaigns(barangayCode) → { campaigns, loading, refetch }`
- Produces: `CampaignBuilder` component (3-step inline form)

- [ ] **Step 1: Create campaigns feature types**

Create `src/features/campaigns/types.ts`:
```ts
import type { Campaign, CampaignQuestion, NeedCategory } from "@/lib/types"

export interface CampaignDraft {
  name: string
  disaster_type: string
  disaster_date: string
}

export interface QuestionDraft {
  question_text: string
  need_category: NeedCategory
}

export type { Campaign, CampaignQuestion }
```

- [ ] **Step 2: Create campaigns service**

Create `src/features/campaigns/service.ts`:
```ts
import { supabase } from "@/lib/supabase"
import type { Campaign, CampaignQuestion } from "@/lib/types"
import type { CampaignDraft, QuestionDraft } from "./types"

export async function listCampaigns(barangayCode: string): Promise<Campaign[]> {
  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("barangay_code", barangayCode)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data as Campaign[]
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const { data, error } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle()
  if (error) throw error
  return data as Campaign | null
}

export async function getQuestions(campaignId: string): Promise<CampaignQuestion[]> {
  const { data, error } = await supabase
    .from("campaign_questions")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("display_order")
  if (error) throw error
  return data as CampaignQuestion[]
}

export async function createCampaign(
  draft: CampaignDraft,
  createdBy: string,
  barangayCode: string
): Promise<Campaign> {
  const { data, error } = await supabase
    .from("campaigns")
    .insert({ ...draft, created_by: createdBy, barangay_code: barangayCode })
    .select()
    .single()
  if (error) throw error
  return data as Campaign
}

export async function addQuestions(
  campaignId: string,
  questions: QuestionDraft[]
): Promise<CampaignQuestion[]> {
  const rows = questions.map((q, i) => ({
    campaign_id: campaignId,
    question_text: q.question_text,
    need_category: q.need_category,
    display_order: i,
  }))
  const { data, error } = await supabase.from("campaign_questions").insert(rows).select()
  if (error) throw error
  return data as CampaignQuestion[]
}

export async function publishCampaign(id: string): Promise<void> {
  const { error } = await supabase.from("campaigns").update({ status: "active" }).eq("id", id)
  if (error) throw error
}

export async function closeCampaign(id: string): Promise<void> {
  const { error } = await supabase.from("campaigns").update({ status: "closed" }).eq("id", id)
  if (error) throw error
}
```

- [ ] **Step 3: Create useCampaigns hook**

Create `src/features/campaigns/useCampaigns.ts`:
```ts
import { useCallback, useEffect, useState } from "react"
import type { Campaign } from "@/lib/types"
import { listCampaigns } from "./service"

export function useCampaigns(barangayCode: string) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listCampaigns(barangayCode)
      setCampaigns(data)
    } finally {
      setLoading(false)
    }
  }, [barangayCode])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { campaigns, loading, refetch }
}
```

- [ ] **Step 4: Create CampaignBuilder component**

Create `src/features/campaigns/CampaignBuilder.tsx`:
```tsx
import { useState } from "react"
import { useSession } from "@/features/auth"
import type { NeedCategory } from "@/lib/types"
import { createCampaign, addQuestions, publishCampaign } from "./service"
import type { QuestionDraft } from "./types"

const NEED_CATEGORIES: { value: NeedCategory; label: string }[] = [
  { value: "shelter", label: "Shelter" },
  { value: "medical", label: "Medical" },
  { value: "food_water", label: "Food / Water" },
]

interface Props {
  onDone: () => void
}

export function CampaignBuilder({ onDone }: Props) {
  const { session } = useSession()
  if (!session) return null

  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [disasterType, setDisasterType] = useState("")
  const [disasterDate, setDisasterDate] = useState("")
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { question_text: "", need_category: "shelter" },
  ])
  const [submitting, setSubmitting] = useState(false)

  function addQuestion() {
    setQuestions([...questions, { question_text: "", need_category: "shelter" }])
  }

  function updateQuestion(index: number, field: keyof QuestionDraft, value: string) {
    const next = [...questions]
    next[index] = { ...next[index], [field]: value }
    setQuestions(next)
  }

  function removeQuestion(index: number) {
    setQuestions(questions.filter((_, i) => i !== index))
  }

  async function handlePublish() {
    if (!session) return
    setSubmitting(true)
    try {
      const campaign = await createCampaign(
        { name, disaster_type: disasterType, disaster_date: disasterDate },
        session.profile.uniqid,
        session.profile.barangay_code
      )
      const validQuestions = questions.filter((q) => q.question_text.trim())
      if (validQuestions.length > 0) {
        await addQuestions(campaign.id, validQuestions)
      }
      await publishCampaign(campaign.id)
      onDone()
    } finally {
      setSubmitting(false)
    }
  }

  const cardStyle = {
    background: "var(--card)",
    borderRadius: "var(--egov-radius)",
    border: "1px solid var(--egov-line)",
  }

  return (
    <div className="p-6" style={cardStyle}>
      <h2 className="text-sm font-bold mb-4" style={{ color: "var(--egov-ink)" }}>
        Create Campaign — Step {step}/3
      </h2>

      {step === 1 && (
        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium" style={{ color: "var(--egov-muted)" }}>
            Campaign Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Super Typhoon Odette"
              className="mt-1 w-full px-3 py-2 text-xs"
              style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
            />
          </label>
          <label className="text-xs font-medium" style={{ color: "var(--egov-muted)" }}>
            Disaster Type
            <input
              type="text"
              value={disasterType}
              onChange={(e) => setDisasterType(e.target.value)}
              placeholder="e.g. typhoon, fire, flood"
              className="mt-1 w-full px-3 py-2 text-xs"
              style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
            />
          </label>
          <label className="text-xs font-medium" style={{ color: "var(--egov-muted)" }}>
            Disaster Date
            <input
              type="date"
              value={disasterDate}
              onChange={(e) => setDisasterDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 text-xs"
              style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
            />
          </label>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!name || !disasterType || !disasterDate}
            className="mt-2 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
            style={{ background: "var(--egov-blue)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
          >
            Next
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-3">
          {questions.map((q, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex-1 flex flex-col gap-1">
                <input
                  type="text"
                  value={q.question_text}
                  onChange={(e) => updateQuestion(i, "question_text", e.target.value)}
                  placeholder="Question text"
                  className="w-full px-3 py-2 text-xs"
                  style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
                />
                <select
                  value={q.need_category}
                  onChange={(e) => updateQuestion(i, "need_category", e.target.value)}
                  className="w-full px-3 py-2 text-xs"
                  style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
                >
                  {NEED_CATEGORIES.map((nc) => (
                    <option key={nc.value} value={nc.value}>
                      {nc.label}
                    </option>
                  ))}
                </select>
              </div>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(i)}
                  className="px-2 py-2 text-xs"
                  style={{ color: "var(--egov-red)" }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addQuestion}
            className="text-xs font-medium"
            style={{ color: "var(--egov-blue)" }}
          >
            + Add question
          </button>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-medium"
              style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.4)", color: "var(--egov-muted)" }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={questions.every((q) => !q.question_text.trim())}
              className="px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
              style={{ background: "var(--egov-blue)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-3">
          <div className="p-3" style={{ background: "var(--egov-soft)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}>
            <p className="text-xs font-bold" style={{ color: "var(--egov-ink)" }}>{name}</p>
            <p className="text-xs" style={{ color: "var(--egov-muted)" }}>{disasterType} — {disasterDate}</p>
            <p className="text-xs mt-2" style={{ color: "var(--egov-muted)" }}>
              {questions.filter((q) => q.question_text.trim()).length} question(s)
            </p>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs font-medium"
              style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.4)", color: "var(--egov-muted)" }}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
              style={{ background: "var(--egov-blue)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
            >
              {submitting ? "Publishing..." : "Publish Campaign"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/campaigns/
git commit -m "feat: add campaigns feature (service, builder, hooks)"
```

---

### Task 6: Check-in feature (service, matcher-query, useActiveCampaign, CheckInPage)

**Files:**
- Create: `src/features/checkin/service.ts`
- Create: `src/features/checkin/matcher-query.ts`
- Create: `src/features/checkin/useActiveCampaign.ts`
- Modify: `src/features/checkin/CheckInPage.tsx` (replace stub)

**Interfaces:**
- Consumes: `supabase`, types, `matchHousehold`
- Produces: `upsertCheckIn({ campaignId, householdId, submittedBy, answers })`
- Produces: `CheckInPage` — full flow: prompt → match → questions → confirm

- [ ] **Step 1: Create check-in service**

Create `src/features/checkin/service.ts`:
```ts
import { supabase } from "@/lib/supabase"
import type { CheckIn, CheckInAnswer } from "@/lib/types"

export interface UpsertCheckInInput {
  campaignId: string
  householdId: string
  submittedBy: string
  answers: { questionId: string; answer: string }[]
}

export async function upsertCheckIn(input: UpsertCheckInInput): Promise<CheckIn> {
  const { data: existing, error: findError } = await supabase
    .from("check_ins")
    .select("*")
    .eq("campaign_id", input.campaignId)
    .eq("household_id", input.householdId)
    .maybeSingle()

  if (findError) throw findError

  let checkIn: CheckIn

  if (existing) {
    const { data, error } = await supabase
      .from("check_ins")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single()
    if (error) throw error
    checkIn = data as CheckIn
  } else {
    const { data, error } = await supabase
      .from("check_ins")
      .insert({
        campaign_id: input.campaignId,
        household_id: input.householdId,
        submitted_by: input.submittedBy,
      })
      .select()
      .single()
    if (error) throw error
    checkIn = data as CheckIn
  }

  for (const a of input.answers) {
    const { data: existingAnswer } = await supabase
      .from("check_in_answers")
      .select("*")
      .eq("check_in_id", checkIn.id)
      .eq("question_id", a.questionId)
      .maybeSingle()

    if (existingAnswer) {
      const merged = mergeAnswer(existingAnswer.answer, a.answer)
      await supabase
        .from("check_in_answers")
        .update({ answer: merged })
        .eq("id", existingAnswer.id)
    } else {
      await supabase
        .from("check_in_answers")
        .insert({ check_in_id: checkIn.id, question_id: a.questionId, answer: a.answer })
    }
  }

  return checkIn
}

function mergeAnswer(existing: string, incoming: string): string {
  if (existing.toLowerCase() === "yes" || incoming.toLowerCase() === "yes") return "yes"
  return incoming
}
```

- [ ] **Step 2: Create matcher-query**

Create `src/features/checkin/matcher-query.ts`:
```ts
import { supabase } from "@/lib/supabase"
import type { Household, HouseholdMember } from "@/lib/types"
import { matchHousehold, type MatchResult } from "@/lib/matcher"

export async function fetchHouseholdsAndMembers(
  barangayCode: string
): Promise<{ households: Household[]; members: HouseholdMember[] }> {
  const [{ data: hhData, error: hhError }, { data: memData, error: memError }] = await Promise.all([
    supabase.from("households").select("*").eq("barangay_code", barangayCode),
    supabase.from("household_members").select("*"),
  ])
  if (hhError) throw hhError
  if (memError) throw memError
  return { households: (hhData ?? []) as Household[], members: (memData ?? []) as HouseholdMember[] }
}

export async function matchResidentToHousehold(
  firstName: string,
  lastName: string,
  barangayCode: string
): Promise<MatchResult> {
  const { households, members } = await fetchHouseholdsAndMembers(barangayCode)
  return matchHousehold({ first_name: firstName, last_name: lastName, barangay_code: barangayCode }, members, households)
}
```

- [ ] **Step 3: Create useActiveCampaign hook**

Create `src/features/checkin/useActiveCampaign.ts`:
```ts
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Campaign, CampaignQuestion } from "@/lib/types"

interface ActiveCampaignData {
  campaign: Campaign | null
  questions: CampaignQuestion[]
  loading: boolean
}

export function useActiveCampaign(barangayCode: string): ActiveCampaignData {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [questions, setQuestions] = useState<CampaignQuestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("*")
        .eq("barangay_code", barangayCode)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)

      const active = campaigns?.[0] ?? null
      setCampaign(active as Campaign | null)

      if (active) {
        const { data: qs } = await supabase
          .from("campaign_questions")
          .select("*")
          .eq("campaign_id", active.id)
          .order("display_order")
        setQuestions((qs ?? []) as CampaignQuestion[])
      } else {
        setQuestions([])
      }

      setLoading(false)
    }
    load()
  }, [barangayCode])

  return { campaign, questions, loading }
}
```

- [ ] **Step 4: Replace CheckInPage stub with full flow**

Replace `src/features/checkin/CheckInPage.tsx` entirely:
```tsx
import { useState } from "react"
import { useSession } from "@/features/auth"
import { useActiveCampaign } from "./useActiveCampaign"
import { matchResidentToHousehold } from "./matcher-query"
import { upsertCheckIn } from "./service"
import type { MatchResult } from "@/lib/matcher"
import type { Household } from "@/lib/types"

type FlowStep = "prompt" | "matching" | "select" | "questions" | "submitting" | "confirmed"

export function CheckInPage() {
  const { session, logout } = useSession()
  if (!session) return null

  const { campaign, questions, loading } = useActiveCampaign(session.profile.barangay_code)
  const [step, setStep] = useState<FlowStep>("prompt")
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const cardStyle = {
    background: "var(--card)",
    borderRadius: "var(--egov-radius)",
    boxShadow: "0 18px 50px rgba(25, 57, 116, 0.08)",
    border: "1px solid rgba(255,255,255,0.78)",
  }

  async function handleYes() {
    setStep("matching")
    try {
      const result = await matchResidentToHousehold(
        session.profile.first_name,
        session.profile.last_name,
        session.profile.barangay_code
      )
      setMatchResult(result)
      if (result.kind === "match") {
        setSelectedHouseholdId(result.householdId)
        setStep("questions")
      } else {
        setStep("select")
      }
    } catch {
      setStep("prompt")
    }
  }

  async function handleSubmit() {
    if (!campaign || !selectedHouseholdId) return
    setStep("submitting")
    try {
      await upsertCheckIn({
        campaignId: campaign.id,
        householdId: selectedHouseholdId,
        submittedBy: session.profile.uniqid,
        answers: questions.map((q) => ({ questionId: q.id, answer: answers[q.id] ?? "no" })),
      })
      setStep("confirmed")
    } catch {
      setStep("questions")
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: "var(--egov-soft)" }}>
        <p className="text-xs" style={{ color: "var(--egov-muted)" }}>Loading...</p>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-4" style={{ background: "var(--egov-soft)" }}>
        <div className="w-full max-w-sm p-8 text-center" style={cardStyle}>
          <img src="/egovph-logo.png" alt="eGovPH" className="w-32 mx-auto" />
          <p className="text-xs mt-4" style={{ color: "var(--egov-muted)" }}>
            No active campaign in your barangay.
          </p>
          <button type="button" onClick={logout} className="mt-4 text-xs" style={{ color: "var(--egov-muted)" }}>
            Sign out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4" style={{ background: "var(--egov-soft)" }}>
      <div className="w-full max-w-sm flex flex-col gap-4 p-8" style={cardStyle}>
        <img src="/egovph-logo.png" alt="eGovPH" className="w-32 mx-auto" />

        <div className="text-center">
          <h1 className="text-sm font-bold" style={{ color: "var(--egov-ink)" }}>
            Hi, {session.profile.first_name}
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--egov-muted)" }}>
            Barangay {session.profile.barangay}
          </p>
        </div>

        {step === "prompt" && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-center" style={{ color: "var(--egov-ink)" }}>
              Are you affected by <strong>{campaign.name}</strong>?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleYes}
                className="flex-1 py-2.5 text-xs font-medium text-white"
                style={{ background: "var(--egov-blue)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={logout}
                className="flex-1 py-2.5 text-xs font-medium"
                style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.4)", color: "var(--egov-muted)" }}
              >
                No
              </button>
            </div>
          </div>
        )}

        {step === "matching" && (
          <p className="text-xs text-center" style={{ color: "var(--egov-muted)" }}>
            Matching your household...
          </p>
        )}

        {step === "select" && matchResult?.kind === "candidates" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs" style={{ color: "var(--egov-muted)" }}>
              Select your household:
            </p>
            {matchResult.candidates.map((hh: Household) => (
              <label key={hh.id} className="flex items-center gap-2 p-2 cursor-pointer" style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.3)" }}>
                <input
                  type="radio"
                  name="household"
                  value={hh.id}
                  checked={selectedHouseholdId === hh.id}
                  onChange={() => setSelectedHouseholdId(hh.id)}
                />
                <div>
                  <p className="text-xs font-medium" style={{ color: "var(--egov-ink)" }}>{hh.household_head_name}</p>
                  <p className="text-xs" style={{ color: "var(--egov-muted)" }}>{hh.address}</p>
                </div>
              </label>
            ))}
            <button
              type="button"
              onClick={() => setStep("questions")}
              disabled={!selectedHouseholdId}
              className="mt-2 py-2.5 text-xs font-medium text-white disabled:opacity-50"
              style={{ background: "var(--egov-blue)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
            >
              Continue
            </button>
          </div>
        )}

        {step === "questions" && (
          <div className="flex flex-col gap-3">
            {questions.map((q) => (
              <div key={q.id} className="flex flex-col gap-1">
                <p className="text-xs font-medium" style={{ color: "var(--egov-ink)" }}>{q.question_text}</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, [q.id]: "yes" })}
                    className="flex-1 py-2 text-xs font-medium"
                    style={{
                      background: answers[q.id] === "yes" ? "var(--egov-blue)" : "transparent",
                      color: answers[q.id] === "yes" ? "#fff" : "var(--egov-muted)",
                      border: "1px solid var(--egov-line)",
                      borderRadius: "calc(var(--egov-radius) * 0.3)",
                    }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnswers({ ...answers, [q.id]: "no" })}
                    className="flex-1 py-2 text-xs font-medium"
                    style={{
                      background: answers[q.id] === "no" ? "var(--egov-muted)" : "transparent",
                      color: answers[q.id] === "no" ? "#fff" : "var(--egov-muted)",
                      border: "1px solid var(--egov-line)",
                      borderRadius: "calc(var(--egov-radius) * 0.3)",
                    }}
                  >
                    No
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={handleSubmit}
              className="mt-2 py-2.5 text-xs font-medium text-white"
              style={{ background: "var(--egov-blue)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
            >
              Submit
            </button>
          </div>
        )}

        {step === "submitting" && (
          <p className="text-xs text-center" style={{ color: "var(--egov-muted)" }}>
            Submitting...
          </p>
        )}

        {step === "confirmed" && (
          <div className="text-center">
            <p className="text-sm font-bold" style={{ color: "var(--egov-blue)" }}>
              Thank you!
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--egov-muted)" }}>
              Your report has been submitted. The barangay has been notified.
            </p>
            <button
              type="button"
              onClick={logout}
              className="mt-4 py-2.5 text-xs font-medium"
              style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.4)", color: "var(--egov-muted)" }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/checkin/
git commit -m "feat: implement full resident check-in flow"
```

---

### Task 7: Dashboard feature (live, useDashboardData, status, DashboardPage)

**Files:**
- Create: `src/features/dashboard/live.ts`
- Create: `src/features/dashboard/useDashboardData.ts`
- Create: `src/features/dashboard/status.ts`
- Modify: `src/features/dashboard/DashboardPage.tsx` (replace stub)

**Interfaces:**
- Consumes: `supabase`, types, `aggregate`, `filterAffected`, `toCsv`, `downloadCsv`
- Produces: `useCampaignLive(campaignId, onRefresh)` — subscribes to realtime
- Produces: `setStatus(checkInId, status)` — updates status
- Produces: `DashboardPage` — full dashboard with builder, metrics, lists, status, export, close

- [ ] **Step 1: Create status tracker**

Create `src/features/dashboard/status.ts`:
```ts
import { supabase } from "@/lib/supabase"
import type { CheckInStatus } from "@/lib/types"

const TRANSITIONS: Record<CheckInStatus, CheckInStatus | null> = {
  unresolved: "visited",
  visited: "resolved",
  resolved: null,
}

export async function advanceStatus(checkInId: string, currentStatus: CheckInStatus): Promise<CheckInStatus> {
  const next = TRANSITIONS[currentStatus]
  if (!next) return currentStatus
  const { error } = await supabase.from("check_ins").update({ status: next }).eq("id", checkInId)
  if (error) throw error
  return next
}
```

- [ ] **Step 2: Create useDashboardData hook**

Create `src/features/dashboard/useDashboardData.ts`:
```ts
import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Campaign, CampaignQuestion, CheckIn, CheckInAnswer, Household } from "@/lib/types"
import { aggregate, type DashboardData } from "@/lib/aggregator"

interface DashboardState {
  data: DashboardData | null
  loading: boolean
  refresh: () => Promise<void>
}

export function useDashboardData(campaignId: string | null, barangayCode: string): DashboardState {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!campaignId) {
      setData(null)
      setLoading(false)
      return
    }

    const [checkInsRes, answersRes, questionsRes, householdsRes] = await Promise.all([
      supabase.from("check_ins").select("*").eq("campaign_id", campaignId),
      supabase.from("check_in_answers").select("*"),
      supabase.from("campaign_questions").select("*").eq("campaign_id", campaignId),
      supabase.from("households").select("*").eq("barangay_code", barangayCode),
    ])

    const checkIns = (checkInsRes.data ?? []) as CheckIn[]
    const answers = (answersRes.data ?? []) as CheckInAnswer[]
    const questions = (questionsRes.data ?? []) as CampaignQuestion[]
    const households = (householdsRes.data ?? []) as Household[]

    setData(aggregate(checkIns, answers, questions, households))
    setLoading(false)
  }, [campaignId, barangayCode])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { data, loading, refresh }
}

export async function listActiveCampaigns(barangayCode: string): Promise<Campaign[]> {
  const { data } = await supabase
    .from("campaigns")
    .select("*")
    .eq("barangay_code", barangayCode)
    .eq("status", "active")
    .order("created_at", { ascending: false })
  return (data ?? []) as Campaign[]
}

export async function getQuestionsForCampaign(campaignId: string): Promise<CampaignQuestion[]> {
  const { data } = await supabase
    .from("campaign_questions")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("display_order")
  return (data ?? []) as CampaignQuestion[]
}
```

- [ ] **Step 3: Create live realtime hook**

Create `src/features/dashboard/live.ts`:
```ts
import { useEffect } from "react"
import { supabase } from "@/lib/supabase"

export function useCampaignLive(campaignId: string | null, onRefresh: () => void) {
  useEffect(() => {
    if (!campaignId) return

    const channel = supabase
      .channel(`campaign-${campaignId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "check_ins", filter: `campaign_id=eq.${campaignId}` }, onRefresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "check_ins", filter: `campaign_id=eq.${campaignId}` }, onRefresh)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "check_in_answers" }, onRefresh)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [campaignId, onRefresh])
}
```

- [ ] **Step 4: Replace DashboardPage stub with full dashboard**

Replace `src/features/dashboard/DashboardPage.tsx` entirely:
```tsx
import { useState } from "react"
import { useSession } from "@/features/auth"
import { useCampaigns } from "@/features/campaigns/useCampaigns"
import { CampaignBuilder } from "@/features/campaigns/CampaignBuilder"
import { closeCampaign } from "@/features/campaigns/service"
import { useDashboardData } from "./useDashboardData"
import { useCampaignLive } from "./live"
import { advanceStatus } from "./status"
import { toCsv, downloadCsv } from "@/lib/csv"
import type { NeedCategory, CheckInStatus } from "@/lib/types"
import { filterAffected } from "@/lib/aggregator"

export function DashboardPage() {
  const { session, logout } = useSession()
  if (!session) return null

  const { campaigns, refetch: refetchCampaigns } = useCampaigns(session.profile.barangay_code)
  const [showBuilder, setShowBuilder] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    campaigns.find((c) => c.status === "active")?.id ?? null
  )
  const [filterNeed, setFilterNeed] = useState<NeedCategory | "">("")
  const [filterStatus, setFilterStatus] = useState<CheckInStatus | "">("")

  const { data, loading, refresh } = useDashboardData(selectedCampaignId, session.profile.barangay_code)
  useCampaignLive(selectedCampaignId, refresh)

  const selectedCampaign = campaigns.find((c) => c.id === selectedCampaignId) ?? null

  const filteredRows = data
    ? filterAffected(data.affected, {
        needType: filterNeed || undefined,
        status: filterStatus || undefined,
      })
    : []

  async function handleAdvanceStatus(checkInId: string, currentStatus: CheckInStatus) {
    await advanceStatus(checkInId, currentStatus)
    await refresh()
  }

  async function handleClose() {
    if (!selectedCampaignId) return
    await closeCampaign(selectedCampaignId)
    await refetchCampaigns()
    setSelectedCampaignId(null)
  }

  function handleExport() {
    if (!data) return
    const csv = toCsv(filteredRows)
    downloadCsv("affected-households.csv", csv)
  }

  const cardStyle = {
    background: "var(--card)",
    borderRadius: "var(--egov-radius)",
    border: "1px solid var(--egov-line)",
  }

  return (
    <div className="min-h-dvh" style={{ background: "var(--egov-soft)" }}>
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ background: "rgba(255,255,255,0.82)", borderBottom: "1px solid var(--egov-line)" }}
      >
        <div className="flex items-center gap-3">
          <img src="/egovph-logo.png" alt="eGovPH" className="h-8" />
          <div>
            <h1 className="text-sm font-bold" style={{ color: "var(--egov-ink)" }}>
              HANDA — Dashboard
            </h1>
            <p className="text-xs" style={{ color: "var(--egov-muted)" }}>
              Barangay {session.profile.barangay}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--egov-muted)" }}>
            {session.profile.first_name} {session.profile.last_name}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--egov-blue)", color: "#fff" }}>
            Official
          </span>
          <button type="button" onClick={logout} className="text-xs px-3 py-1.5 rounded-full" style={{ border: "1px solid var(--egov-line)", color: "var(--egov-muted)" }}>
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select
              value={selectedCampaignId ?? ""}
              onChange={(e) => setSelectedCampaignId(e.target.value || null)}
              className="px-3 py-2 text-xs"
              style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
            >
              <option value="">Select campaign...</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
            {selectedCampaign?.status === "active" && (
              <button type="button" onClick={handleClose} className="px-3 py-2 text-xs font-medium" style={{ color: "var(--egov-red)" }}>
                Close Campaign
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowBuilder(!showBuilder)}
            className="px-4 py-2 text-xs font-medium text-white"
            style={{ background: "var(--egov-blue)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
          >
            {showBuilder ? "Cancel" : "+ New Campaign"}
          </button>
        </div>

        {showBuilder && (
          <CampaignBuilder
            onDone={async () => {
              setShowBuilder(false)
              await refetchCampaigns()
            }}
          />
        )}

        {!showBuilder && selectedCampaign && (
          <>
            {loading ? (
              <p className="text-xs text-center py-8" style={{ color: "var(--egov-muted)" }}>Loading...</p>
            ) : data ? (
              <>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "Active campaigns", value: campaigns.filter((c) => c.status === "active").length },
                    { label: "Affected households", value: data.totalAffected },
                    { label: "Non-respondents", value: data.nonRespondents.length },
                  ].map((m) => (
                    <div key={m.label} className="p-4" style={cardStyle}>
                      <p className="text-xs" style={{ color: "var(--egov-muted)" }}>{m.label}</p>
                      <p className="text-2xl font-bold mt-1" style={{ color: "var(--egov-ink)" }}>{m.value}</p>
                    </div>
                  ))}
                </div>

                <div className="p-4" style={cardStyle}>
                  <h3 className="text-xs font-bold mb-2" style={{ color: "var(--egov-ink)" }}>Need Breakdown</h3>
                  <div className="flex gap-4">
                    {(["shelter", "medical", "food_water"] as NeedCategory[]).map((cat) => (
                      <div key={cat} className="text-center">
                        <p className="text-lg font-bold" style={{ color: "var(--egov-blue)" }}>{data.byNeedType[cat]}</p>
                        <p className="text-xs" style={{ color: "var(--egov-muted)" }}>{cat.replace("_", " / ")}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <select
                    value={filterNeed}
                    onChange={(e) => setFilterNeed(e.target.value as NeedCategory | "")}
                    className="px-3 py-2 text-xs"
                    style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
                  >
                    <option value="">All needs</option>
                    <option value="shelter">Shelter</option>
                    <option value="medical">Medical</option>
                    <option value="food_water">Food / Water</option>
                  </select>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as CheckInStatus | "")}
                    className="px-3 py-2 text-xs"
                    style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.4)" }}
                  >
                    <option value="">All statuses</option>
                    <option value="unresolved">Unresolved</option>
                    <option value="visited">Visited</option>
                    <option value="resolved">Resolved</option>
                  </select>
                  <button type="button" onClick={handleExport} className="px-3 py-2 text-xs font-medium" style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.4)", color: "var(--egov-muted)" }}>
                    Export CSV
                  </button>
                </div>

                <div className="p-4" style={cardStyle}>
                  <h3 className="text-xs font-bold mb-2" style={{ color: "var(--egov-ink)" }}>Affected Households ({filteredRows.length})</h3>
                  {filteredRows.length === 0 ? (
                    <p className="text-xs" style={{ color: "var(--egov-muted)" }}>No affected households yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {filteredRows.map((row) => (
                        <div key={row.checkInId} className="flex items-center justify-between p-3" style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.3)" }}>
                          <div>
                            <p className="text-xs font-medium" style={{ color: "var(--egov-ink)" }}>
                              {row.household.household_head_name}
                            </p>
                            <p className="text-xs" style={{ color: "var(--egov-muted)" }}>{row.household.address}</p>
                            <div className="flex gap-1 mt-1">
                              {row.needs.map((need) => (
                                <span key={need} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--egov-soft)", color: "var(--egov-blue)" }}>
                                  {need}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{
                              background: row.status === "resolved" ? "#138a4b" : row.status === "visited" ? "var(--egov-gold)" : "var(--egov-red)",
                              color: "#fff",
                            }}>
                              {row.status}
                            </span>
                            {row.status !== "resolved" && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceStatus(row.checkInId, row.status)}
                                className="text-xs px-2 py-1"
                                style={{ border: "1px solid var(--egov-line)", borderRadius: "calc(var(--egov-radius) * 0.3)", color: "var(--egov-muted)" }}
                              >
                                Advance →
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {data.nonRespondents.length > 0 && (
                  <div className="p-4" style={cardStyle}>
                    <h3 className="text-xs font-bold mb-2" style={{ color: "var(--egov-ink)" }}>
                      Non-Respondents ({data.nonRespondents.length})
                    </h3>
                    <div className="flex flex-col gap-1">
                      {data.nonRespondents.map((hh) => (
                        <div key={hh.id} className="flex justify-between text-xs">
                          <span style={{ color: "var(--egov-ink)" }}>{hh.household_head_name}</span>
                          <span style={{ color: "var(--egov-muted)" }}>{hh.address}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </>
        )}

        {!showBuilder && !selectedCampaign && (
          <div className="p-6 text-center" style={cardStyle}>
            <p className="text-sm" style={{ color: "var(--egov-muted)" }}>
              Select a campaign or create a new one to view the dashboard.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/
git commit -m "feat: implement live barangay dashboard with realtime, status tracking, and CSV export"
```

---

### Task 8: Final verification — typecheck + lint + tests

- [ ] **Step 1: Run TypeScript type check**

Run: `pnpm build`
Expected: No errors.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: No errors.

- [ ] **Step 3: Run all tests**

Run: `pnpm vitest run`
Expected: All 14 tests pass (6 matcher + 8 aggregator).

- [ ] **Step 4: Run dev server and verify happy path manually**

Run: `pnpm dev`

Manual verification steps:
1. Login as **josie** (official) → `/dashboard` → create campaign "Super Typhoon Odette" with 3 questions (shelter/medical/food_water) → publish
2. Open new browser session → login as **maria** → `/check-in` → "Are you affected?" → Yes → auto-matched to Santos Household → answer questions → submit → confirmation
3. Back to josie's dashboard → metrics update live: 1 affected, 11 non-respondents
4. Login as **pedro** → check in → auto-matched to Reyes Household
5. Dashboard updates: 2 affected, 10 non-respondents
6. Mark one household "visited" → status badge changes
7. Export CSV → download file with correct data

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address typecheck/lint/test issues from final verification"
```

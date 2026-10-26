# Graph Report - eGovPHHackaton2026  (2026-07-31)

## Corpus Check
- 68 files · ~47,152 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 424 nodes · 533 edges · 45 communities (25 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `951b937c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 21 edges
2. `compilerOptions` - 15 edges
3. `db()` - 14 edges
4. `table()` - 14 edges
5. `Endpoints` - 12 edges
6. `HANDA Residency Check-in & Live Dashboard ΓÇö Data Report` - 12 edges
7. `Residency Check-in & Live Barangay Dashboard — Design` - 11 edges
8. `useSession()` - 9 edges
9. `Global Constraints` - 9 edges
10. `Linear Sub-Issue Tracking` - 9 edges

## Surprising Connections (you probably didn't know these)
- `AppRouter()` --calls--> `useSession()`  [INFERRED]
  src/App.tsx → src/features/auth/session-context.tsx
- `OfficialConsole()` --calls--> `useSession()`  [INFERRED]
  src/App.tsx → src/features/auth/session-context.tsx
- `ResidentConsole()` --calls--> `useSession()`  [INFERRED]
  src/features/resident/ResidentConsole.tsx → src/features/auth/session-context.tsx
- `AlertSimulatorProps` --references--> `AlertIngestionResult`  [EXTRACTED]
  src/features/alerts/AlertSimulator.tsx → src/features/alerts/alert-service.ts
- `Session` --references--> `EgovProfile`  [EXTRACTED]
  src/features/auth/session-context.tsx → src/features/auth/types.ts

## Import Cycles
- None detected.

## Communities (45 total, 20 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.10
Nodes (31): AccessTokenResponse, BASE_URL, EXCHANGE_CODE_PATH, ExchangeCodeResponse, generateAccessToken(), generateExchangeCode(), MOCK_PROFILES, PARTNER_CODE (+23 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (27): devDependencies, @babel/core, babel-plugin-react-compiler, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (35): Shell(), ShellProps, ResidentConsole(), Campaign, CampaignQuestion, CampaignStatus, can(), CheckIn (+27 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (23): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, baseUrl, erasableSyntaxOnly, ignoreDeprecations, jsx, lib (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.11
Nodes (18): 10. Reports List, 11. View Report by Case Number, 12. Generate Exchange Code, 13. Generate Access Token, 14. SSO Authentication, 1. Report Type List, 2. Region List, 3. Province List by Region (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (18): Architecture, Barangay Official, Data Model (Supabase), Further Notes, HANDA — Hazard Assessment and Needs Determination Application, Implementation Decisions, Key Design Decisions, Modules to Test (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (17): 1. Auth Consolidation (One Path), 2. Mock SSO Keys Logging, 3. RBAC, 4. Resident Console, 5. Data/Official Plumbing, 6. Ponytail Cleanup (Surgical), Delete, Edit (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.12
Nodes (15): 1. Data And App State Shell, 2. Barangay Official Login And Campaign Setup, 3. Campaign Activation And Dashboard Aggregator, 4. Status Tracker And Case Modal, 5. Resident Check-In Flow, 6. Offline Outreach Manual Submission, 7. Export Service And Archive Campaign, 8. Optional Supabase Wiring Last (+7 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (38): AlertIngestionResult, getPresetScenarios(), processInboundAlert(), AlertSimulator(), AlertSimulatorProps, CAPAlertInfo, CAPParameter, extractPSGCCodes() (+30 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (14): dependencies, @base-ui/react, class-variance-authority, clsx, @fontsource-variable/jetbrains-mono, @phosphor-icons/react, react, react-dom (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (12): Database Schema Changes, Demo Happy Path, Executive Summary, Files Created, Files Modified, HANDA Residency Check-in & Live Dashboard ΓÇö Data Report, Module Breakdown, Next Steps (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (11): Architecture, Context, Data model changes, Dependencies to add, Goal, Non-goals, Official happy path (`/dashboard`), Out of scope (re-affirmed) (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (10): Global Constraints, Residency Check-in & Live Barangay Dashboard — Implementation Plan, Task 1: Install vitest + write shared types + HouseholdMatcher with tests, Task 2: DashboardAggregator with tests, Task 3: CSV ExportService, Task 4: Database migrations (unique constraint + realtime publication), Task 5: Campaigns feature (types, service, builder, hooks), Task 6: Check-in feature (service, matcher-query, useActiveCampaign, CheckInPage) (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (8): Current State, Flow A — Authentication (eGovPH SSO) — shared by both actors, Flow B — Setup/Seeding (one-time, demo prerequisite), Flow C — Barangay Official Flow (campaign setup + monitoring), Flow D — Resident Flow (check-in, < 60 seconds), HANDA — Happy Path Flows, Proposed Demo Happy Path Narrative (3-minute run), The Flows

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (6): Commits Created, Concerns, Files Created, Status: DONE, Supabase DB Push, Task 4 Report

### Community 17 - "Community 17"
Cohesion: 0.33
Nodes (4): css, defined, missing, root

### Community 18 - "Community 18"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

## Knowledge Gaps
- **249 isolated node(s):** `buttonVariants`, `$schema`, `style`, `rsc`, `tsx` (+244 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useSession()` connect `Community 0` to `Community 2`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `OfficialConsole()` connect `Community 2` to `Community 0`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **What connects `buttonVariants`, `$schema`, `style` to the rest of the system?**
  _249 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08773784355179703 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
## Title

Master Historical Demo Sync Design

## Problem

`master` is behind the newer historical demo flow already present in `.worktrees/edge-functions-sync`.

The immediate failure is that `src/features/resident/ResidentConsole.tsx` imports `@/features/demo/historical-selectors`, but `src/features/demo/historical-selectors.ts` does not exist on `master`.

This means `master` currently contains partial adoption of the historical demo feature set rather than a complete, buildable version of it.

## Goal

Synchronize `master` with the worktree's historical demo implementation so the current branch uses the same `historical-*` demo files, imports, and derived behavior.

Success means:

1. `master` contains the full `historical-*` demo support required by current consumers.
2. The resident flow and any related consumers use the same selector and metadata path as the worktree.
3. The project type-checks after the sync.
4. Any related tests copied with the feature pass, or remaining failures are clearly identified.

## Non-Goals

1. Broadly merging the worktree into `master`.
2. Refactoring unrelated demo, auth, or dashboard code.
3. Reworking the historical demo design itself.
4. Changing behavior outside the worktree-aligned historical demo path unless required to restore build correctness.

## Recommended Approach

Treat `.worktrees/edge-functions-sync` as the source of truth for the historical demo flow and copy the relevant `historical-*` implementation into `master`.

This is preferable to patching one missing import because the worktree already shows a coherent feature set spanning selectors, metadata, tests, and consumers. Pulling over only one file would likely leave `master` in another partially synced state.

## Scope

The sync should include:

1. All `src/features/demo/historical-*` files that exist in the worktree and are part of the historical demo flow.
2. Direct consumers on `master` that rely on those files, especially `src/features/resident/ResidentConsole.tsx`.
3. Any related test files for the historical selector layer.

The sync should not include:

1. Unrelated worktree-only features.
2. Incidental formatting-only changes outside touched files.
3. Additional branch housekeeping.

## Architecture

The synced flow should keep the same layered structure used in the worktree:

1. `historical-demo-data.ts` provides curated seeded campaigns, questions, check-ins, and answers.
2. `historical-incidents.ts` provides campaign-keyed metadata for historical context and eReport defaults.
3. `historical-selectors.ts` derives consumer-friendly data such as LGU rows, supply summaries, and campaign-aware eReport defaults.
4. UI consumers such as `ResidentConsole` use selectors rather than embedding historical demo knowledge directly.

This keeps seeded operational data separate from derived presentation metadata while avoiding schema changes.

## File-Level Sync Plan

Expected sync targets include, at minimum:

1. `src/features/demo/historical-incidents.ts`
2. `src/features/demo/historical-selectors.ts`
3. `src/features/demo/historical-selectors.test.ts`
4. Any additional `src/features/demo/historical-*` files present in the worktree and referenced by the synced modules

Expected consumer review targets include:

1. `src/features/resident/ResidentConsole.tsx`
2. Any `master` files that already reference the historical demo selectors or incident metadata

Each copied file should preserve the worktree behavior unless a small adjustment is required because `master` differs in adjacent code.

## Data and Behavior Rules

1. Historical campaign IDs used by selectors must match the seeded campaign IDs in `historical-demo-data.ts`.
2. eReport defaults must continue to derive from campaign-linked historical metadata.
3. Selectors must remain the single place that maps campaign IDs to historical incident context.
4. Consumers should import from the synced selector layer rather than duplicate logic inline.

## Failure Modes Being Addressed

Primary failure:

1. Vite cannot resolve `@/features/demo/historical-selectors` because the file is missing on `master`.

Secondary failure risks during sync:

1. Copied selector code may depend on additional `historical-*` files not yet present on `master`.
2. Tests may reveal drift between campaign IDs, PSA fallback geography, or consumer expectations.
3. A consumer on `master` may differ slightly from the worktree and need a small compatibility adjustment.

## Verification

After the sync:

1. Run the TypeScript check for the project.
2. Run the historical selector test file if the project test setup supports it.
3. Run the standard project build if available.
4. Confirm the original import-resolution error is gone.

Implementation is successful when the copied historical demo path builds cleanly on `master` and matches the worktree's newer flow closely enough that consumers no longer reference missing modules.

## Risks and Constraints

1. The current workspace is dirty, including untracked docs and a `.worktrees/` directory, so edits must stay narrowly scoped.
2. `master` may not contain every consumer currently updated in the worktree, so the sync should be guided by actual references present on `master`.
3. The goal is behavioral alignment with the worktree's historical demo path, not a full branch merge.

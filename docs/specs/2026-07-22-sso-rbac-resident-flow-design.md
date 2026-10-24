# SSO + RBAC + Resident Flow Design

**Date:** 2026-07-22
**Status:** Approved
**Scope:** Fix SSO sign-in wiring, enforce role-based access, add resident disaster notification flow, ponytail cleanup

---

## Problem

Two parallel auth paths exist:
1. `src/features/auth/*` — proper SSO module (LoginPage OTP flow, SessionProvider, ProtectedRoute, resolveRole via Supabase officials table). **Orphaned** — App.tsx ignores it.
2. `src/shared/index.ts` + inline login in App.tsx — calls `runSSO` directly, skips OTP, skips `resolveRole`. `OfficialRole` hardcoded to `'official'` for ALL users → residents see official UI (bug).

Additional issues:
- Two Supabase clients: `src/lib/supabase.ts` + `src/shared/supabase.ts` (duplicate `createClient`)
- Two `handa_session` keys: localStorage (shared) vs sessionStorage (context) — conflict
- `App.tsx:185` loading skeleton shows Shell before official resolves
- `src/features/index.ts` empty file
- `updateCampaign` in store unused (only `saveCampaign` called)

---

## Solution

### 1. Auth Consolidation (One Path)

- `App.tsx` wraps `<SessionProvider>` → `<ProtectedRoute>` → renders `OfficialConsole` or `ResidentConsole` by `session.role`.
- Delete inline login cards in `App.tsx:169-183`.
- Delete `loginOfficial`/`logoutOfficial`/`saveSession`/`loadSession` from `shared/index.ts` store (SessionProvider owns session).
- `ProtectedRoute` redirect fixed to hash routing (current code uses pathname but app uses hash).
- Session storage: one key `handa_session`, sessionStorage, owned by SessionProvider only.

### 2. Mock SSO Keys Logging

- `runSSO` mock: generate fake `exchange_code` + `access_token` (crypto.randomUUID), `console.log` with `[SSO MOCK]` prefix, then return mock profile.
- Real path unchanged.
- LoginPage OTP mock key `123456` already works.

### 3. RBAC

- `OfficialRole = 'official' | 'resident'`
- `ROLE_PERMISSIONS.official` = current 8 perms (`create_campaign`, `edit_questions`, `publish_campaign`, `close_campaign`, `archive_campaign`, `manual_entry`, `update_case`, `export_csv`)
- `ROLE_PERMISSIONS.resident = ['view_dashboard', 'respond_to_disaster']` (new perm entries)
- `can()` unchanged → all action buttons auto-hide for resident (they already use `can()`)

### 4. Resident Console

- New `src/features/resident/ResidentConsole.tsx`
- Reuse `Shell`, sidebar locked to dashboard, Assessments tab hidden (Shell accepts `role` prop)
- Dashboard readonly: aggregate counts (X affected, X unresolved) + need breakdown only
- **No queue table** (privacy — no neighbor names, simpler)
- Disaster banner: when active campaign exists matching resident's `barangay_code` AND resident hasn't checked in yet:
  - "Are you affected by {campaign.name}?" Yes/No
  - **Yes** → open modal with campaign questions (reuse manual-entry UI pattern) → `submitCheckIn` with `submitted_by=uniqid` → toast → banner dismisses
  - **No** → dismiss banner (local state, no write)
- No active campaign in their barangay → "No active disaster reports near you."

### 5. Data/Official Plumbing

- `egovProfileToOfficial` removed; `Session` holds `{profile, role}` directly
- Official-side reads `session.profile` for name/uniqid/barangay_code
- `submitCheckIn.submitted_by` uses `session.profile.uniqid` for residents; official manual entry uses `${name} (manual)` as today
- Role resolved once at login via `resolveRole` (checks `officials` table; Josie seeded as official, Maria/Pedro auto-resident)

### 6. Ponytail Cleanup (Surgical)

Only what our change orphans:
- Delete `src/features/index.ts` (empty file)
- Delete `updateCampaign` from store (unused)
- Merge `src/shared/supabase.ts` client into `src/lib/supabase.ts` (one client)
- Remove `loginOfficial`/`logoutOfficial`/session fns from `shared/index.ts` (SessionProvider owns)

---

## Files Changed

### Edit
- `App.tsx` — wrap providers, branch resident/official
- `src/shared/index.ts` — RBAC types/perms, drop session fns, drop official-in-store
- `src/features/auth/egov-sso.ts` — mock key logging
- `src/features/auth/ProtectedRoute.tsx` — hash routing fix
- `src/components/Shell.tsx` — accept role, hide Assessments tab for resident
- `src/shared/supabase.ts` — use lib client instead of own createClient

### New
- `src/features/resident/ResidentConsole.tsx`

### Delete
- `src/features/index.ts`

### No changes
- `src/features/auth/LoginPage.tsx` — already correct
- `src/features/auth/session-context.tsx` — already has role
- `src/features/auth/roles.ts` — already resolves role
- `src/features/auth/otp.ts` — already works
- Migrations — none (officials seed already has Josie → resolveRole works)

---

## Verification

- `npm run lint` pass
- `npm run build` (tsc -b + vite build) pass
- Manual: login Josie → official console full perms
- Manual: login Maria → resident: dashboard readonly, disaster banner, Yes→submit→dashboard count increments, Assessments tab gone, no action buttons
- Mock SSO keys visible in devtools console

---

## Tradeoffs

- **Resident queue hidden** (privacy-safe, simpler) vs shown readonly (more data, privacy risk). Chose hidden.
- **One session store** (sessionStorage via SessionProvider) vs two (localStorage + sessionStorage). Chose one.
- **One Supabase client** (lib/supabase.ts) vs two. Chose one.

---

## Open Questions (Resolved)

- Role source: Supabase officials table (resolveRole already works)
- Resident check-in: full question set (reuse manual-entry UI)
- No response: dismiss only (no write)
- Mock key logging: console.log only (devtools-visible)
- Resident shell: reuse Shell, hide Assessments tab + actions

# HANDA: Disaster Aid and Assessment Platform

HANDA (eHANDA) is an eGovPH-aligned disaster assessment and aid coordination platform for residents, barangay officials, LGUs, and approved integrations. It turns alerts into structured RDANA assessments, collects household check-ins, publishes emergency notifications, and gives response teams an operational queue.

> **Demo status:** This repository is a hackathon/demo build. It is not ready for production use with real resident data, credentials, or emergency operations without the hardening work listed in [Security and Production Hardening](#security-and-production-hardening).

## Features

- Role-based demo entry points for officials, residents, LGUs, and developers.
- RDANA assessment creation, editing, copying, publishing, closing, and archiving.
- CAP/SMS alert simulation for PAGASA, NDRRMC, and PHIVOLCS-style alerts.
- Alert pipeline: parse, normalize, resolve PSGC locations, evaluate severity, draft RDANA questions, review, and publish.
- Resident household check-ins with Filipino and English presentation support.
- Official response queue with filters, sorting, case status updates, manual entries, and CSV export.
- eGovPH eSMS and Telegram assessment notifications.
- eGov AI assistant, translation, and AI-assisted assessment drafting with deterministic fallbacks.
- eReport complaint submission and location dataset browsing.
- LGU municipality-scoped summaries and developer API access demonstrations.

## Architecture and Request Flow

```text
React/Vite browser
       |
       +--> Supabase Data API (campaigns, questions, check-ins, alerts)
       |
       +--> Supabase Edge Function: egov
                    |
                    +--> eGov SSO
                    +--> eGov AI, then Gemini fallback
                    +--> eGovPH eSMS
                    +--> Telegram Bot API
                    +--> eReport integration API
```

The browser invokes the `egov` Edge Function for provider calls. Provider credentials are intended to remain in Edge Function secrets. The browser only needs the Supabase URL and publishable/anonymous key.

Only one campaign can be `active` for intake. Publishing a new campaign closes the previous active campaign.

## Prerequisites

- Node.js 20.19+ or 22.12+.
- npm 10+.
- A Supabase project for persistence and Edge Function integrations. The UI can start in mock mode without one, but database-backed features require Supabase.
- Supabase CLI only when running migrations or deploying/serving the `egov` Edge Function.

## Quick Start: Mock Demo

```bash
npm install
cp .env.example .env
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. Mock SSO is enabled unless `VITE_EGOV_SSO_USE_MOCK=false`; use the demo identities shown on the login screen.

Mock mode is useful for reviewing the UI and local fallback behavior. It does not provide real eGov identity verification or provider delivery.

## Supabase Setup

1. Create or select a Supabase project.
2. Copy the project URL and publishable/anonymous key into `.env`:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
   ```

3. Apply the checked-in migrations using the Supabase dashboard or CLI:

   ```bash
   supabase link --project-ref your-project-ref
   supabase db push
   ```

4. Deploy the Edge Function:

   ```bash
   supabase functions deploy egov
   ```

5. Add the server-side secrets described below. Do not put these values in `.env` with a `VITE_` prefix when they are intended for the Edge Function.

   ```bash
   supabase secrets set --project-ref your-project-ref \
     EGOV_SSO_BASE_URL=... \
     EGOV_SSO_PARTNER_CODE=... \
     EGOV_SSO_PARTNER_SECRET=... \
     EGOV_INTEGRATION_BASE_URL=... \
     EGOV_INTEGRATION_ACCESS_CODE=... \
     EGOV_AI_ACCESS_CODE=... \
     EREPORT_ACCESS_TOKEN=... \
     EREPORT_BASE_URL=https://stg-ereport-ws.oueg.info \
     EMESSAGE_ACCESS_TOKEN=... \
     TELEGRAM_BOT_TOKEN=...
   ```

Use `supabase secrets list` to verify names, not values. After changing secrets, invoke the function again; a redeploy is normally not required.

### Local Supabase

With Docker and the Supabase CLI installed:

```bash
supabase start
supabase db reset
supabase functions serve egov
```

The local function needs its server secrets supplied through the CLI's function environment/secrets mechanism. Keep local secret files outside version control. The repository's `supabase/config.toml` defines the local database, Studio, Auth, Realtime, Storage, and Edge Runtime defaults.

## Environment Variables

Copy `.env.example` to `.env`. Vite exposes only variables prefixed with `VITE_` to browser code. All other provider credentials belong in Supabase Edge Function secrets.

### Browser Variables

| Variable | Required | Purpose |
|---|---:|---|
| `VITE_EGOV_SSO_USE_MOCK` | No | SSO mode. Any value other than the literal `false` enables mock SSO. Use `false` for live SSO. |
| `VITE_EREPORT_USE_MOCK` | No | Enables the local eReport success fallback only when set to `true`. Keep `false` for live eReport. |
| `VITE_SUPABASE_URL` | For persistence | Supabase project URL used by the browser client. |
| `VITE_SUPABASE_ANON_KEY` | For persistence | Supabase publishable/legacy anon key. This key is not a secret; protect data with RLS and server authorization. |
| `VITE_EMESSAGE_SMS_RECIPIENTS` | No | Comma-separated Philippine numbers used as SMS dispatch targets by the demo UI. |

### Edge Function Secrets

| Variable | Required for | Purpose |
|---|---|---|
| `EGOV_SSO_BASE_URL` | Live SSO | eGov SSO host. |
| `EGOV_SSO_EXCHANGE_CODE_PATH` | Optional live SSO | Exchange-code path; defaults to `/api/exchange-code`. |
| `EGOV_SSO_PARTNER_CODE` | Live SSO | eGov partner code. |
| `EGOV_SSO_PARTNER_SECRET` | Live SSO | eGov partner secret. |
| `EGOV_INTEGRATION_BASE_URL` | OTP | eGov integration API host. |
| `EGOV_INTEGRATION_ACCESS_CODE` | OTP and AI fallback | eGov integration access code. |
| `EGOV_AI_BASE_URL` | AI | eGov AI host; defaults to `https://egov-ai-core-ws.oueg.info`. |
| `EGOV_AI_ACCESS_CODE` | Live AI | eGov AI access code. Falls back to `EGOV_INTEGRATION_ACCESS_CODE`. |
| `GEMINI_API_KEY` | Gemini fallback | Optional secondary AI provider key. |
| `EMESSAGE_BASE_URL` | SMS | eMessage host; defaults to `https://ws-message.e.gov.ph`. |
| `EMESSAGE_ACCESS_TOKEN` | SMS | eGovPH eSMS credential. |
| `TELEGRAM_BOT_TOKEN` | Telegram | Telegram bot credential. |
| `TELEGRAM_CHAT_IDS` | Telegram | Optional comma-separated default chat IDs for server-side dispatch. |
| `EREPORT_BASE_URL` | eReport | eReport host; defaults to `https://stg-ereport-ws.oueg.info`. |
| `EREPORT_ACCESS_TOKEN` | eReport | eReport access code used to obtain short-lived integration tokens. |

The Edge Function caches short-lived eGov AI, eReport, and integration tokens in its worker process. These caches are not durable and may be recreated at any time.

## eGovPH API Usage

### eGov SSO

With live SSO, the browser sends an `sso-profile` action to the `egov` Edge Function. The function performs the server-side exchange-code and token flow:

```text
exchange_code
  -> POST {EGOV_SSO_BASE_URL}/api/token
  -> POST {EGOV_SSO_BASE_URL}/api/partner/sso_authentication
  -> role and PSGC-scoped eGov profile
```

The profile's role and location metadata determine the console and data scope. In mock mode, `src/features/auth/egov-sso.ts` returns fixed demo profiles instead.

### eGov AI

The browser invokes `egov` with `translate`, `assistant`, or `credits` actions. The function obtains an eGov AI token and calls:

```text
POST {EGOV_AI_BASE_URL}/api/v1/egov/integration/token
POST {EGOV_AI_BASE_URL}/api/v1/egov/integration/translator/generate
POST {EGOV_AI_BASE_URL}/api/v1/egov/integration/ai_assistant/generate
GET  {EGOV_AI_BASE_URL}/api/v1/egov/integration/credits
```

If live AI fails, translation tries Gemini and then returns an unavailable response; the assistant tries Gemini and then deterministic local emergency guidance. UI responses identify their source as live, Gemini, local fallback, or unavailable.

### eGovPH eSMS

When an official publishes an assessment, the browser invokes `send-sms` through the Edge Function. The function calls:

```text
POST {EMESSAGE_BASE_URL}/messaging/v1/sms/push
```

The request uses `X-EMESSAGE-Auth` and normalizes Philippine mobile numbers to E.164 format. SMS contains the alert, verified location, barangay desk, and hotlines; dynamic survey questions are sent through Telegram and the resident web flow instead.

### Telegram

Publishing also invokes `send-telegram` through the Edge Function, which calls the Telegram Bot API `sendMessage` endpoint with an inline keyboard. The local long-polling bot in `scratch/telegram-bot.mjs` handles callbacks, text replies, confirmation, hotlines, and AI fallback responses.

Run the bot separately when needed:

```bash
TELEGRAM_BOT_TOKEN=your-bot-token node scratch/telegram-bot.mjs
```

The bot binds an answer draft to the exact alert message, preventing answers from one campaign being submitted to another.

### eReport

The browser never calls eReport directly. `src/lib/ereport-service.ts` invokes the `egov` Edge Function with `ereport-proxy`; the function obtains and caches an eReport integration token, then proxies the request to `{EREPORT_BASE_URL}/api/integration`.

Used endpoints:

```text
POST /api/integration/token
GET  /api/integration/datasets/report_types
GET  /api/integration/datasets/regions
GET  /api/integration/datasets/provinces?region_code={code}
GET  /api/integration/datasets/municipalities?province_code={code}
GET  /api/integration/datasets/barangays?municipality_code={code}
POST /api/integration/submit_complaint
POST /api/integration/verify/request
POST /api/integration/verify/confirm
GET  /api/integration/reports
```

The resident eReport form submits complaint fields and PSGC location codes. Dataset failures use the bundled limited PSA-shaped fallback data. Report viewing requires a separate OTP-derived view token in the upstream API. See the complete request and response reference in [`docs/eReport-API-Documentation.md`](docs/eReport-API-Documentation.md).

## Database and Data Model

Checked-in migrations create and seed:

- `campaigns`: assessment metadata and status (`draft`, `active`, `closed`, `archived`).
- `campaign_questions`: RDANA questions attached to a campaign.
- `check_ins`: household submissions and operational status (`unresolved`, `visited`, `resolved`).
- `check_in_answers`: answers attached to a check-in and question.
- `alerts`: normalized alert events.
- `barangays`, `officials`, `developers`, and `api_keys`: demo scope and integration data.

The historical demo seed contains synthetic data. A fresh database may be populated by migrations and, when empty, by the client-side historical demo seed path.

## Verification

```bash
npm run build       # TypeScript build and Vite production build
npm run test:unit   # Vitest tests
npm run lint        # ESLint
npm test            # CSS variable consistency check
npm run preview     # Serve the production build locally
```

## Dependencies

Runtime dependencies:

- `react`, `react-dom`: UI runtime.
- `@supabase/supabase-js`: Supabase database and Edge Function client.
- `@base-ui/react`, `shadcn`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tw-animate-css`: UI primitives and class composition.
- `@phosphor-icons/react`: icons.
- `tailwindcss`, `@tailwindcss/vite`: styling and Vite integration.
- `@fontsource-variable/jetbrains-mono`: bundled interface font.

Development dependencies:

- `vite`, `@vitejs/plugin-react`: development server and production bundling.
- `typescript`: type checking.
- `vitest`: unit tests.
- `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `@eslint/js`, `globals`: linting.
- `babel-plugin-react-compiler`, `@rolldown/plugin-babel`, `@babel/core`: React compiler/build support.
- `@types/node`, `@types/react`, `@types/react-dom`, `@types/babel__core`: TypeScript declarations.

Exact versions are pinned by `package-lock.json`; install with `npm install` rather than adding a second package manager lockfile.

## Security and Production Hardening

Current demo risks that must be addressed before production:

- The historical demo migration explicitly disables RLS on public demo tables so the browser can read and write them. Re-enable RLS and add role- and PSGC-scoped policies before storing real data.
- The `egov` Edge Function accepts action names from the browser and currently uses permissive `Access-Control-Allow-Origin: *`. Add authenticated user checks, action-level authorization, input limits, rate limits, and an allowlisted production origin.
- A Supabase anon/publishable key is safe to expose only when RLS and server-side authorization are correct. Never expose a `service_role` key in browser code.
- Never use `VITE_` for provider secrets. Vite embeds `VITE_*` values in the browser bundle. Keep SSO partner secrets, eReport access codes, eMessage tokens, Telegram bot tokens, Gemini keys, and similar credentials in Edge Function secrets or a server-side secret manager.
- Do not commit `.env`, provider tokens, OTPs, resident exports, or real incident data. `.env*` is ignored except `.env.example`; verify `git diff` before committing.
- Validate and constrain complaint text, evidence URLs, PSGC codes, phone numbers, chat IDs, and AI prompts at the Edge Function boundary. Avoid logging personal data, tokens, full complaint bodies, or precise coordinates.
- Treat AI output as assistance, not an authoritative emergency instruction. Preserve human review for assessment drafts and direct life-threatening cases to official emergency channels.
- Restrict report viewing to the intended municipality/barangay and verified requester. OTP and report-view tokens should be short-lived, never stored in local storage, and never included in logs or URLs.
- Replace demo identities, hardcoded Telegram defaults, fallback success responses, synthetic seeds, and development alert simulators before deployment.
- Use HTTPS, dependency updates, secret rotation, backups, audit logging, monitoring, and a documented incident-response process in the deployment environment.

## Repository Structure

```text
src/features/auth/                 SSO, mock identities, roles, and protected routes
src/features/alerts/               CAP/SMS parsing, thresholds, RDANA drafting, simulator
src/features/official/             Official assessment and operations console
src/features/resident/             Resident check-in and eReport experience
src/features/lgu/                  LGU municipality-scoped dashboard
src/features/developer/            Developer console and API catalog UI
src/lib/ereport-service.ts         eReport proxy client and PSA fallback behavior
src/lib/egov-ai-service.ts         eGov AI client and local fallback behavior
src/lib/emessage-sms-service.ts    SMS formatting and Edge Function client
src/lib/alert-dispatcher.ts        SMS and Telegram publish dispatch
supabase/functions/egov/            Server-side provider proxy and token handling
supabase/migrations/                Database schema and demo seed migrations
scratch/telegram-bot.mjs            Optional local Telegram long-polling bot
docs/eReport-API-Documentation.md  Complete eReport endpoint reference
```

## Demo Limitations

- This is a demonstration, not an emergency dispatch or case-management system.
- External API availability, permissions, quotas, and data coverage depend on the configured providers.
- eReport fallback data is limited and must not be treated as a nationwide authoritative dataset.
- The local Telegram bot must be restarted after code changes and is not a production worker.
- SMS, Telegram, AI, SSO, and eReport failures may use local/demo fallbacks; always inspect the response source and delivery result before treating an operation as completed.

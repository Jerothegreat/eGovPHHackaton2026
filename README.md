# HANDA: Disaster Aid & Assessment Platform

HANDA is an eGovPH-aligned disaster assessment and aid coordination platform for barangay officials, residents, LGUs, and approved developer integrations. It turns incoming disaster alerts into structured RDANA assessments, publishes those assessments to residents, collects household check-ins, and gives response teams a live operational queue.

## Current System Flow

```text
eGov SSO / demo identity
        |
        v
Role routing: official | resident | LGU | developer
        |
        +--> Official creates an assessment
        |       |
        |       +--> Adds or copies RDANA questions
        |       +--> Publishes draft
        |              |
        |              +--> eGovPH eSMS notification
        |              +--> Telegram dynamic survey card
        |              +--> eGovPH resident assessment becomes active
        |
        +--> Resident answers the active assessment
        |       |
        |       +--> eHanda check-in saved to Supabase
        |       +--> Filipino/English presentation support
        |       +--> eReport emergency-report option
        |
        +--> Official reviews the dashboard queue
                |
                +--> Filter, sort, and inspect responses
                +--> Mark cases visited or resolved
                +--> Add offline/manual entries
                +--> Export CSV
```

Only one assessment is active for intake at a time. Publishing a new assessment closes the previous active assessment.

## Demo Walkthrough

### 1. Sign In

Use the demo accounts shown on the login screen. The mock eGov SSO flow returns a profile containing the role, barangay code, municipality code, and other location metadata.

### 2. Official Assessment Setup

Officials can:

- Create a draft assessment with a name, disaster type, and disaster date.
- Add questions mapped to RDANA categories such as shelter, food/water, medical, livelihood, evacuation, and utilities.
- Edit or remove questions.
- Copy a question set from another assessment.
- Review AI-generated assessment drafts.
- Publish, close, or archive assessments.

### 3. Alert-to-Draft Pipeline

The dashboard includes a development alert simulator for PAGASA, NDRRMC, and PHIVOLCS-style CAP/SMS alerts.

The simulated Layer 1 pipeline is:

```text
CAP/SMS payload
  -> CAP parsing
  -> event normalization
  -> PSGC location extraction
  -> severity threshold evaluation
  -> RDANA question drafting
  -> official review
  -> publish
```

The drafting service uses eGov AI/Gemini when configured and deterministic RDANA templates as an offline fallback.

### 4. Publish and Notify

Publishing an assessment updates its status to `active` and dispatches the current question set through the configured channels:

- **eGovPH eSMS:** Sends a concise emergency alert, evacuation instruction, barangay desk contact, and emergency hotlines. Survey questions are intentionally omitted from SMS so the message remains usable on constrained devices.
- **Telegram:** Sends the assessment title, verified display area, evacuation/offline-aid instruction, dynamic question list, YES/NO buttons, and a submit button.
- **eGovPH resident flow:** Residents see the active assessment in the resident console.

Location display uses verified dataset names instead of raw PSGC codes. Unknown barangay names are not fabricated or displayed as numeric codes. If only a city or region is verified, the notification displays only that verified level.

### 5. Telegram Check-In Behavior

The local Telegram bot runs through long polling in `scratch/telegram-bot.mjs`.

Each Telegram answer draft is bound to the exact alert message being answered. This prevents a previous campaign from being mixed with a newer campaign when the same user receives multiple alerts. Confirmation uses:

- The questions from the clicked alert message.
- The campaign title from the clicked alert message.
- The area from the clicked alert message.

The completed draft is cleared after confirmation.

### 6. Resident Reporting

Residents can:

- See the active barangay assessment.
- Answer its dynamic question set.
- Submit a household check-in.
- Receive a submission confirmation.
- View Filipino translations for supported campaign and question text.
- Open the eReport submission flow for an individual emergency concern.
- Use the eGov AI assistant for disaster guidance and translation support.

### 7. Official Operations Dashboard

The official dashboard provides:

- Total check-ins and unresolved cases.
- Need-category aggregation.
- Sortable and filterable response queue.
- Individual case detail and answer inspection.
- Case status updates: unresolved, visited, resolved.
- Manual resident entry for offline field collection.
- CSV export with anonymized resident identity, needs, status, submitter, and timestamp.

### 8. LGU and Developer Views

The LGU dashboard provides city/municipality-scoped incident summaries, child-barangay activity, response metrics, priority supplies, and developer access requests.

The developer console demonstrates:

- Barangay-scoped API access.
- API key and endpoint documentation.
- eReport dataset browsing.
- eGov AI and integration status panels.
- Developer application review from the official/LGU consoles.

## Integrated eGovPH Services
### Client Variables

| Variable | Required | Purpose |
|---|---:|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL used by the browser client. |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase publishable/legacy anon key. This key is not a secret; protect data with RLS and server authorization. |

The client only needs the Supabase URL and anon key as credentials. These optional client-side demo controls may also be placed in `.env`:

| Variable | Purpose |
|---|---|
| `VITE_EGOV_SSO_USE_MOCK` | SSO mode. Any value other than the literal `false` enables mock SSO. |
| `VITE_EREPORT_USE_MOCK` | Enables the local eReport success fallback when set to `true`. |
| `VITE_EMESSAGE_SMS_RECIPIENTS` | Comma-separated Philippine numbers used as SMS dispatch targets by the demo UI. |

### Supabase Edge Function Secrets

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

eHANDA does not call provider APIs directly from the browser. Browser requests go to the `egov` Supabase Edge Function, which keeps partner credentials server-side, obtains short-lived provider tokens, calls the selected eGovPH service, and returns only the data needed by the UI.

```text
Resident / Official / LGU / Developer UI
              |
              v
       Supabase Edge Function: egov
              |
              +--> eGov SSO
              +--> eGov AI
              +--> eReport
              +--> eGovPH eSMS
              +--> Telegram Bot API
```

The application records whether a response came from a live provider or a fallback. This prevents demo data from being mistaken for a successful national API request.

### eGov SSO

The login flow uses the eGovPH SSO exchange sequence when live credentials are configured:

```text
eGovPH exchange code
  -> POST /api/token
  -> POST /api/partner/sso_authentication
  -> eGovPH profile
  -> eHANDA role and location routing
```

The returned profile supplies the user's `uniqid`, role, barangay, municipality, province, region, and PSGC codes. eHANDA uses those values to route users to the correct console and scope official, LGU, and developer data. Mock SSO identities are used by default for the hackathon walkthrough.

### eGov AI

The Edge Function first exchanges the configured access code for a short-lived eGov AI token, caches that token in memory, and calls the relevant endpoint:

| Endpoint | eHANDA usage | Trigger | Result in the system |
|---|---|---|---|
| `POST /api/v1/egov/integration/ai_assistant/generate` | Resident Help & Procedures chat | Resident sends a question | Response and `session_id` are rendered in chat. |
| `POST /api/v1/egov/integration/translator/generate` | Alert and campaign translation | User selects Filipino translation | Localized warning is shown beside the source text. |
| `GET /api/v1/egov/integration/credits` | Developer portal balance | Developer portal loads | Remaining live AI credits are shown. |

Assistant requests send a `prompt` and `category: "PH"`. Translation requests send `prompt`, `source_lang`, and `target_lang`. The client receives `source` and `is_live_api` metadata so the UI can distinguish live eGov AI, Gemini fallback, local fallback, and unavailable responses.

When eGov AI is unavailable, the assistant tries Gemini and then curated emergency guidance. Translation tries Gemini and otherwise reports that live translation is unavailable. Fallback responses are not presented as eGovPH responses.

### eReport API

eReport powers the resident emergency-report flow and the developer dataset browser. The Edge Function exchanges `EREPORT_ACCESS_TOKEN` for a short-lived integration token, caches it in memory, and proxies the following calls:

```text
POST /api/integration/token
GET  /api/integration/datasets/regions
GET  /api/integration/datasets/provinces?region_code={code}
GET  /api/integration/datasets/municipalities?province_code={code}
GET  /api/integration/datasets/barangays?municipality_code={code}
POST /api/integration/submit_complaint
POST /api/integration/verify/request
POST /api/integration/verify/confirm
GET  /api/integration/reports
```

The location hierarchy is:

```text
region -> province -> municipality/city -> barangay
```

The dependent dataset calls run when the resident or developer selects a location:

```text
regions
  -> provinces(region_code)
  -> municipalities(province_code)
  -> barangays(municipality_code)
```

The selected PSGC codes are submitted with the resident's report. This keeps incident routing tied to an official geographic hierarchy instead of free-text location names. The report response supplies a `case_number` and `status`, which eHANDA displays as the resident's tracking reference.

The eReport API is intended to provide the complete live dataset. The repository also contains a limited eReport-shaped PSA fallback dataset for offline/demo use. If a live dataset request fails, the service falls back to bundled data and the client continues to identify the result as demo/fallback data.

The eReport token sequence is:

```text
access_code
  -> POST /api/integration/token
  -> integration_token
  -> dataset and complaint requests
```

Report viewing uses a separate `integration_report_view_token` obtained after email OTP verification.

### eGovPH eSMS

When an official publishes an assessment, the publish dispatcher sends a concise notification through the eMessage Push SMS endpoint. It includes the emergency headline, evacuation instruction, barangay desk contact, and hotlines. It intentionally omits survey questions so the alert remains readable on basic phones. Philippine numbers are normalized to E.164 format before dispatch. Configure recipients with `VITE_EMESSAGE_SMS_RECIPIENTS` as a comma-separated list.

### Telegram

Publishing also sends a dynamic assessment card to configured Telegram chat IDs. The card contains the verified display area, question list, YES/NO controls, and submit action. `scratch/telegram-bot.mjs` handles callbacks and binds each answer draft to the exact alert message, then sends confirmation summaries and forwards emergency guidance. If live eGov AI is unavailable, the bot uses the same fallback guidance path as the web assistant.

## Setup Instructions

### Prerequisites

- Node.js and npm
- A Supabase project, or the [Supabase CLI](https://supabase.com/docs/guides/cli) for local development
- Git

### Install and Configure

1. Clone the repository and enter the project directory.

   ```bash
   git clone https://github.com/JeroTheGreat/eGovPHHackaton2026.git
   cd eGovPHHackaton2026
   ```

2. Install the dependencies.

   ```bash
   npm install
   ```

3. Create the local environment file.

   ```bash
   cp .env.example .env
   ```

4. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`. Keep `VITE_EGOV_SSO_USE_MOCK=true` for the default hackathon demo. Add the optional integration values only when testing live services.

   To obtain eGovPH integration credentials, log in to the [eGovPH platform](https://platforms.e.gov.ph/) and use the credentials provided for the required services. Store live credentials in Supabase Edge Function secrets, not in committed files or browser-exposed `VITE_*` variables.

5. If using a local Supabase instance, start it and apply the migrations:

   ```bash
   supabase start
   supabase db reset
   ```

   Use the local API URL and anon key printed by `supabase start` in `.env`.

6. Start the web application.

   ```bash
   npm run dev
   ```

   Open the local URL printed by Vite, then sign in with one of the demo accounts shown on the login screen.

7. To test Telegram notifications, configure `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_IDS`, then run the bot in a separate terminal:

   ```bash
   node scratch/telegram-bot.mjs
   ```

See [Environment Configuration](#environment-configuration) for the complete variable reference and [Verification Commands](#verification-commands) for checks before submitting changes.

## Environment Configuration

Copy `.env.example` to `.env` and configure only the integrations required for the demo.

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# eGov SSO demo/live settings
VITE_EGOV_SSO_USE_MOCK=true

# eReport
VITE_EREPORT_BASE_URL=https://stg-ereport-ws.oueg.info
VITE_EREPORT_ACCESS_TOKEN=
VITE_EGOV_INTEGRATION_ACCESS_CODE=

# eGovPH eSMS
VITE_EMESSAGE_INTEGRATION_BASE_URL=https://ws-message.e.gov.ph
VITE_EMESSAGE_ACCESS_TOKEN=
VITE_EMESSAGE_SMS_RECIPIENTS=

# Telegram
VITE_TELEGRAM_BOT_TOKEN=
VITE_TELEGRAM_CHAT_IDS=
```

In the current code, `VITE_EREPORT_ACCESS_TOKEN` is the legacy variable name used as the eReport access code. `VITE_EGOV_INTEGRATION_ACCESS_CODE` is used as its fallback. Do not commit real credentials.

## Local Development

Install dependencies and run the web application:

```bash
npm install
npm run dev
```

Run the Telegram bot separately:

```powershell
$env:TELEGRAM_BOT_TOKEN="your-bot-token"
node scratch/telegram-bot.mjs
```

The Vite development proxy maps `/api/ereport` to the configured eReport integration server so dataset requests can be tested without duplicating the `/api/integration` path.

## Verification Commands

```bash
npm run build
npm run test:unit
npm run lint
```

The repository also contains focused tests for alert payload formatting, PSA location resolution, and Telegram message-bound state handling.

## Repository Structure

```text
src/features/official/OfficialConsole.tsx    Official assessment and operations console
src/features/resident/ResidentConsole.tsx     Resident check-in experience
src/features/lgu/LguDashboard.tsx             LGU command-center view
src/features/alerts/                          Alert parsing and AI draft pipeline
src/lib/alert-dispatcher.ts                   eSMS and Telegram publish dispatch
src/lib/emessage-sms-service.ts               eGovPH eSMS client and formatting
src/lib/ereport-service.ts                    eReport API and dataset service
src/lib/psa-fallback-data.ts                  Bundled location fallback dataset
scratch/telegram-bot.mjs                      Local Telegram long-polling bot
supabase/migrations/                          Database schema and demo seeds
docs/eReport-API-Documentation.md              eReport integration reference
```

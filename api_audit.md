# eGov API Audit

## Status

Open

## Scope

This audit compares the current implementation with the supplied eGov SSO and eReport API documentation.

## Summary

The eReport dataset endpoints, token endpoint, complaint request, and email OTP request/confirmation are wired to the documented paths. The implementation is sufficient for the current mocked demo, but live eVerify has a login-input mismatch and eReport report viewing is incomplete.

## Findings

### 1. eVerify accepts mobile input even though the API requires email

**Severity:** High for live mode

**Documentation requirement:**

- `POST /api/integration/verify/request` requires an `email` field.
- `POST /api/integration/verify/confirm` requires an `email` and `otp`.

**Implementation:**

- `src/features/auth/LoginPage.tsx:101-117` passes either a mobile number or email to `requestOTP`.
- `src/features/auth/LoginPage.tsx:132-140` passes either a mobile number or email to `confirmOTP`.
- `src/features/auth/otp.ts:16-18` sends the value as `{ email }`.
- `supabase/functions/egov/index.ts:300-325` forwards that value to eReport.

**Impact:**

When `VITE_EGOV_SSO_USE_MOCK=false` and the user selects mobile login, the app sends a mobile number in the `email` field. The documented eReport API can reject the request as invalid or as an unknown account. Email login is compatible.

**Recommendation:**

Use email-only login for live eVerify, or add a separately documented mobile verification API before supporting mobile input.

### 2. Mock mode bypasses all live eVerify and SSO calls

**Severity:** Informational for the current demo; high if live verification is expected

**Implementation:**

- `src/features/auth/otp.ts:3` enables mock mode unless the environment value is exactly `false`.
- In mock mode, `requestOTP` returns `already_verified: false` without calling eReport.
- In mock mode, `confirmOTP` accepts only `123456` without calling eReport.
- `src/features/auth/egov-sso.ts:130-137` returns a local mock profile instead of calling SSO.

**Impact:**

With `VITE_EGOV_SSO_USE_MOCK=true`, the eVerify and SSO integrations are not exercised. The demo works with the mock OTP `123456`, but this does not verify live credentials or API compatibility.

### 3. Confirm OTP response does not preserve `report_view_token`

**Severity:** Medium

**Documentation requirement:**

`POST /api/integration/verify/confirm` returns a `report_view_token` for subsequent report requests.

**Implementation:**

- `supabase/functions/egov/index.ts:317-331` reads only `data.code` and returns `{ verified: true/false }`.
- `src/features/auth/otp.ts:29-33` exposes only a boolean result.

**Impact:**

The app cannot authenticate `GET /api/integration/reports` or `GET /api/integration/reports/:case_number` using the returned token. The token is discarded.

**Recommendation:**

Return and persist the `report_view_token` and its expiry if report browsing is required.

### 4. Reports List and View Report are not implemented

**Severity:** Medium if report tracking is required

The following documented endpoints have no current application caller:

- `GET /api/integration/reports`
- `GET /api/integration/reports/:case_number`

The application submits complaints and displays a case reference, but it does not retrieve report status or report history.

### 5. Submit Complaint response shape differs from the updated documentation

**Severity:** Medium

**Documentation response:**

```json
{
  "code": 200,
  "message": "We received your report. We'll get back to you.",
  "case_number": "PFM-071826-0014"
}
```

**Implementation:**

- `src/lib/ereport-service.ts:43-52` models `case_number` under `data`.
- `src/components/DisasterReportForm.tsx:155` reads `res.data?.case_number`.

**Impact:**

The complaint request can succeed, but the UI may display the hardcoded fallback `HND-REF-8849` instead of the real eReport case number.

**Recommendation:**

Support the documented top-level `case_number` response shape. Only retain the nested shape if the live API is confirmed to return both formats.

### 6. Submit Complaint failure is converted into a fake success

**Severity:** Medium outside demo mode

**Implementation:**

- `src/lib/ereport-service.ts:206-223` returns a generated case number and `is_live_api: false` when the eReport request fails.
- `src/components/DisasterReportForm.tsx:155-158` then displays a successful submission message.

**Impact:**

Users can be told that a report was logged even when eReport was unavailable or rejected the request.

**Recommendation:**

Show an error for live API failures. Keep the local success fallback only behind an explicit demo-mode condition.

### 7. Report Type List is intentionally filtered

**Severity:** Low

The documented endpoint returns all available report types. `src/lib/ereport-service.ts:82-98` keeps only:

- `fire`
- `accident`
- `red_tape`

This is consistent with the disaster-report use case, but it does not expose the complete eReport dataset described by the endpoint.

## eGov AI Findings

### 8. eGov AI endpoint requests match the documentation

**Severity:** Informational

The following endpoints are implemented with the documented methods, paths, bearer authentication, and request bodies:

- `POST /api/v1/egov/integration/token` with `{ access_code }`
- `POST /api/v1/egov/integration/ai_assistant/generate` with `{ prompt, category }`
- `POST /api/v1/egov/integration/translator/generate` with `{ prompt, source_lang, target_lang }`
- `GET /api/v1/egov/integration/credits`

The implementation is in `src/lib/egov-ai-service.ts` and the server-side proxy is in `supabase/functions/egov/index.ts:204-506`.

### 9. Credits fallback reports itself as live

**Severity:** Low

When the credits request fails, `src/lib/egov-ai-service.ts:135-140` returns fallback values but sets:

```ts
is_live_api: true
```

This is inconsistent with the actual result. The fallback should report `is_live_api: false`.

### 10. eGov AI credentials must be configured server-side

**Severity:** Medium configuration risk

The Edge Function reads the AI credentials from:

```env
EGOV_AI_BASE_URL=
EGOV_AI_ACCESS_CODE=
```

The frontend invokes the `egov` Edge Function and does not supply the bearer token directly. Missing Edge Function secrets cause the AI endpoints to fall back to Gemini or local responses rather than using eGov AI.

## eGovPH eSMS Findings

### 11. Push SMS request matches the documentation

**Severity:** Informational

`supabase/functions/egov/index.ts:513-544` calls:

```text
POST /messaging/v1/sms/push
```

with the documented headers and body:

```json
{
  "number": "+639090000000",
  "message": "..."
}
```

The `X-EMESSAGE-Auth` token is sent server-side, and `src/lib/emessage-sms-service.ts:22-28` normalizes supported Philippine number formats to E.164.

### 12. SMS configuration names differ between frontend examples and Edge Function secrets

**Severity:** Medium configuration risk

The Edge Function reads:

```env
EMESSAGE_ACCESS_TOKEN
EMESSAGE_BASE_URL
```

The example frontend environment file documents `VITE_EMESSAGE_ACCESS_TOKEN` and does not include `VITE_EMESSAGE_INTEGRATION_BASE_URL` in the current version. A frontend-only configuration will not provide the token to the Edge Function. The values must be configured as Supabase Edge Function secrets.

### 13. SMS response body is not inspected

**Severity:** Low

The eMessage documentation returns a response body containing `data.message`. The implementation treats HTTP `201` as success and does not parse or preserve the response body. This is sufficient for a send/no-send result, but it prevents the application from displaying or auditing the provider confirmation message.

### 14. SMS sends are sequential

**Severity:** Low performance risk

`src/lib/emessage-sms-service.ts:69-86` sends each recipient one at a time. This is reliable and simple, but broadcast latency increases linearly with recipient count. This is acceptable for the current small configured recipient list.

## Endpoint Verification

| Endpoint | Current status |
|---|---|
| `POST /api/integration/token` | Implemented and cached server-side. |
| `GET /api/integration/datasets/report_types` | Implemented; results are disaster-filtered. |
| `GET /api/integration/datasets/regions` | Implemented. |
| `GET /api/integration/datasets/provinces?region_code={code}` | Implemented. |
| `GET /api/integration/datasets/municipalities?province_code={code}` | Implemented. |
| `GET /api/integration/datasets/barangays?municipality_code={code}` | Implemented. |
| `POST /api/integration/submit_complaint` | Implemented; response handling needs correction. |
| `POST /api/integration/verify/request` | Implemented for email; mobile login is incompatible. |
| `POST /api/integration/verify/confirm` | Implemented for email; report token is discarded. |
| `GET /api/integration/reports` | Not implemented. |
| `GET /api/integration/reports/:case_number` | Not implemented. |

## Configuration Requirements

The Edge Function reads eReport credentials from server-side environment variables:

```env
EREPORT_BASE_URL=
EREPORT_ACCESS_TOKEN=
```

The frontend also requires configured Supabase values so it can invoke the `egov` Edge Function:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Recommended Fix Order

1. Make live eVerify email-only or implement a documented mobile verification flow.
2. Correct Submit Complaint response parsing to read the documented top-level `case_number`.
3. Stop converting live Submit Complaint failures into success responses.
4. Persist `report_view_token` only if report listing or case tracking is required.
5. Implement the Reports List and View Report endpoints if report tracking is part of the product scope.
6. Correct the eGov AI credits fallback `is_live_api` flag.
7. Document and configure eGov AI and eSMS credentials as Edge Function secrets.
8. Decide whether SMS provider response details need to be retained.

## Verification Checklist

- Set `VITE_EGOV_SSO_USE_MOCK=false`.
- Configure the Supabase Edge Function eReport secrets.
- Test eVerify with an email address, not a mobile number.
- Confirm the real complaint response shape and displayed case number.
- Test invalid token, invalid email, invalid OTP, and unavailable eReport responses.
- Confirm whether report viewing is required before implementing `report_view_token` persistence.

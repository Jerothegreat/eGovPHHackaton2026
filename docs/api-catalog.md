# eGov Reports API Catalog

## Overview

Let citizens file and track complaints and reports: submit a complaint, verify by OTP, then list and view report status by case number.

**Base URL:** `{{base}}`
**Auth:** Bearer Token (`{{integration_token}}`)

---

## Endpoints

### 1. Report Type List

**GET** `{{base}}/api/integration/datasets/report_types`

Retrieves all available report types.

**cURL**

```bash
curl --request GET \
  --url '{{base}}/api/integration/datasets/report_types' \
  --header 'Authorization: Bearer {{integration_token}}'
```

**200 OK**

```json
{
  "jsonapi": { "version": "1.0" },
  "meta": {
    "pagination": {
      "total": 9,
      "per_page": 25,
      "current_page": 1,
      "total_pages": 1
    }
  },
  "data": [
    {
      "type": "report_types",
      "id": "0ef6d51a-75be-4ff5-9259-e7f080504f48",
      "attributes": {
        "code": "crime",
        "name": "Crime",
        "img_url": null,
        "icon_url": null,
        "banner_url": null,
        "card_url": null,
        "description": null,
        "agency_name": null,
        "hotline": null,
        "sequence": 1,
        "terms_url": null,
        "privacy_url": null,
        "settings_url": null,
        "terms_content": null,
        "privacy_content": null,
        "meta": {},
        "is_visible": true,
        "is_active": true,
        "created_at": "Nov 04, 2025 06:28:54 PM",
        "updated_at": null
      }
    },
    {
      "type": "report_types",
      "id": "faa2eb76-db67-4c17-9bc6-6c65e87a0ea1",
      "attributes": {
        "code": "red_tape",
        "name": "Red Tape",
        "sequence": 2,
        "is_visible": true,
        "is_active": true
      }
    },
    {
      "type": "report_types",
      "id": "488172b8-9ede-4aa7-bcbb-f8f9b3777b02",
      "attributes": {
        "code": "scam",
        "name": "Scam",
        "sequence": 3,
        "is_visible": true,
        "is_active": true
      }
    },
    {
      "type": "report_types",
      "id": "2c59c356-c866-4578-b004-ef3a89a096e5",
      "attributes": {
        "code": "child_abuse",
        "name": "Child Abuse",
        "sequence": 4,
        "is_visible": true,
        "is_active": true
      }
    },
    {
      "type": "report_types",
      "id": "609f649c-baa4-4d7c-af5c-a7ef9fdc1ba4",
      "attributes": {
        "code": "women_abuse",
        "name": "Women Abuse",
        "sequence": 5,
        "is_visible": true,
        "is_active": true
      }
    },
    {
      "type": "report_types",
      "id": "a3b6104d-1c41-4af8-b898-a05d0fe88226",
      "attributes": {
        "code": "overpricing",
        "name": "Overpricing",
        "sequence": 6,
        "is_visible": true,
        "is_active": true
      }
    },
    {
      "type": "report_types",
      "id": "8b749070-1a87-4d87-b998-08b6faace7f0",
      "attributes": {
        "code": "fire",
        "name": "Fire",
        "sequence": 7,
        "is_visible": true,
        "is_active": true
      }
    },
    {
      "type": "report_types",
      "id": "f4f149c3-b089-48f6-a4a1-78c86ed52dfc",
      "attributes": {
        "code": "accident",
        "name": "Accident",
        "sequence": 8,
        "is_visible": true,
        "is_active": true
      }
    },
    {
      "type": "report_types",
      "id": "c46aaf5c-4a29-41f7-95e1-3bf852dbfbc5",
      "attributes": {
        "code": "gas_station_concerns",
        "name": "Gas Station Concerns",
        "sequence": 9,
        "is_visible": true,
        "is_active": true
      }
    }
  ]
}
```

---

### 2. Region List

**GET** `{{base}}/api/integration/datasets/regions`

Retrieves all available regions.

**cURL**

```bash
curl --request GET \
  --url '{{base}}/api/integration/datasets/regions' \
  --header 'Authorization: Bearer {{integration_token}}'
```

**200 OK**

```json
{
  "jsonapi": { "version": "1.0" },
  "data": [
    { "type": "regions", "id": "010000000", "attributes": { "name": "REGION I (ILOCOS REGION)" } },
    { "type": "regions", "id": "020000000", "attributes": { "name": "REGION II (CAGAYAN VALLEY)" } },
    { "type": "regions", "id": "030000000", "attributes": { "name": "REGION III (CENTRAL LUZON)" } },
    { "type": "regions", "id": "040000000", "attributes": { "name": "REGION IV-A (CALABARZON)" } },
    { "type": "regions", "id": "050000000", "attributes": { "name": "REGION V (BICOL REGION)" } },
    { "type": "regions", "id": "060000000", "attributes": { "name": "REGION VI (WESTERN VISAYAS)" } },
    { "type": "regions", "id": "070000000", "attributes": { "name": "REGION VII (CENTRAL VISAYAS)" } },
    { "type": "regions", "id": "080000000", "attributes": { "name": "REGION VIII (EASTERN VISAYAS)" } },
    { "type": "regions", "id": "090000000", "attributes": { "name": "REGION IX (ZAMBOANGA PENINSULA)" } },
    { "type": "regions", "id": "100000000", "attributes": { "name": "REGION X (NORTHERN MINDANAO)" } },
    { "type": "regions", "id": "110000000", "attributes": { "name": "REGION XI (DAVAO REGION)" } },
    { "type": "regions", "id": "120000000", "attributes": { "name": "REGION XII (SOCCSKSARGEN)" } },
    { "type": "regions", "id": "130000000", "attributes": { "name": "NATIONAL CAPITAL REGION (NCR)" } },
    { "type": "regions", "id": "140000000", "attributes": { "name": "CORDILLERA ADMINISTRATIVE REGION (CAR)" } },
    { "type": "regions", "id": "150000000", "attributes": { "name": "AUTONOMOUS REGION IN MUSLIM MINDANAO (ARMM)" } },
    { "type": "regions", "id": "160000000", "attributes": { "name": "REGION XIII (Caraga)" } },
    { "type": "regions", "id": "170000000", "attributes": { "name": "MIMAROPA REGION" } },
    { "type": "regions", "id": "180000000", "attributes": { "name": "NEGROS ISLAND REGION (NIR)" } }
  ]
}
```

---

### 3. Province List by Region

**GET** `{{base}}/api/integration/datasets/provinces?region_code={region_code}`

Retrieves provinces filtered by region.

| Param | Type | Required | Description |
|---|---|---|---|
| `region_code` | string | Yes | Region code (e.g. `040000000`) |

**cURL**

```bash
curl --request GET \
  --url '{{base}}/api/integration/datasets/provinces?region_code=040000000' \
  --header 'Authorization: Bearer {{integration_token}}'
```

**200 OK**

```json
{
  "jsonapi": { "version": "1.0" },
  "data": [
    { "type": "provinces", "id": "041000000", "attributes": { "region_code": "040000000", "name": "BATANGAS", "district": null } },
    { "type": "provinces", "id": "042100000", "attributes": { "region_code": "040000000", "name": "CAVITE", "district": null } },
    { "type": "provinces", "id": "043400000", "attributes": { "region_code": "040000000", "name": "LAGUNA", "district": null } },
    { "type": "provinces", "id": "045600000", "attributes": { "region_code": "040000000", "name": "QUEZON", "district": null } },
    { "type": "provinces", "id": "045800000", "attributes": { "region_code": "040000000", "name": "RIZAL", "district": null } }
  ]
}
```

---

### 4. Municipality List by Province

**GET** `{{base}}/api/integration/datasets/municipalities?province_code={province_code}`

Retrieves municipalities filtered by province.

| Param | Type | Required | Description |
|---|---|---|---|
| `province_code` | string | Yes | Province code (e.g. `042100000`) |

**cURL**

```bash
curl --request GET \
  --url '{{base}}/api/integration/datasets/municipalities?province_code=042100000' \
  --header 'Authorization: Bearer {{integration_token}}'
```

**200 OK**

```json
{
  "jsonapi": { "version": "1.0" },
  "data": [
    { "type": "municipalities", "id": "042101000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "ALFONSO", "zip_code": null } },
    { "type": "municipalities", "id": "042102000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "AMADEO", "zip_code": null } },
    { "type": "municipalities", "id": "042103000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "BACOOR CITY", "zip_code": null } },
    { "type": "municipalities", "id": "042104000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "CARMONA", "zip_code": null } },
    { "type": "municipalities", "id": "042105000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "CAVITE CITY", "zip_code": null } },
    { "type": "municipalities", "id": "042106000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "CITY OF DASMARIÑAS", "zip_code": null } },
    { "type": "municipalities", "id": "042108000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "CITY OF GENERAL TRIAS", "zip_code": null } },
    { "type": "municipalities", "id": "042123000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "GEN. MARIANO ALVAREZ", "zip_code": null } },
    { "type": "municipalities", "id": "042107000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "GENERAL EMILIO AGUINALDO", "zip_code": null } },
    { "type": "municipalities", "id": "042109000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "IMUS CITY", "zip_code": null } },
    { "type": "municipalities", "id": "042110000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "INDANG", "zip_code": null } },
    { "type": "municipalities", "id": "042111000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "KAWIT", "zip_code": null } },
    { "type": "municipalities", "id": "042112000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "MAGALLANES", "zip_code": null } },
    { "type": "municipalities", "id": "042113000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "MARAGONDON", "zip_code": null } },
    { "type": "municipalities", "id": "042114000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "MENDEZ (MENDEZ-NUÑEZ)", "zip_code": null } },
    { "type": "municipalities", "id": "042115000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "NAIC", "zip_code": null } },
    { "type": "municipalities", "id": "042116000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "NOVELETA", "zip_code": null } },
    { "type": "municipalities", "id": "042117000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "ROSARIO", "zip_code": null } },
    { "type": "municipalities", "id": "042118000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "SILANG", "zip_code": null } },
    { "type": "municipalities", "id": "042119000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "TAGAYTAY CITY", "zip_code": null } },
    { "type": "municipalities", "id": "042120000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "TANZA", "zip_code": null } },
    { "type": "municipalities", "id": "042121000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "TERNATE", "zip_code": null } },
    { "type": "municipalities", "id": "042122000", "attributes": { "region_code": "040000000", "province_code": "042100000", "name": "TRECE MARTIRES CITY (Capital)", "zip_code": null } }
  ]
}
```

---

### 5. Barangay List by Municipality

**GET** `{{base}}/api/integration/datasets/barangays?municipality_code={municipality_code}`

Retrieves barangays filtered by municipality.

| Param | Type | Required | Description |
|---|---|---|---|
| `municipality_code` | string | Yes | Municipality code (e.g. `042111000`) |

**cURL**

```bash
curl --request GET \
  --url '{{base}}/api/integration/datasets/barangays?municipality_code=042111000' \
  --header 'Authorization: Bearer {{integration_token}}'
```

**200 OK**

```json
{
  "jsonapi": { "version": "1.0" },
  "data": [
    { "type": "barangays", "id": "042111014", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Balsahan-Bisita", "zip_code": null } },
    { "type": "barangays", "id": "042111013", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Batong Dalig", "zip_code": null } },
    { "type": "barangays", "id": "042111015", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Binakayan-Aplaya", "zip_code": null } },
    { "type": "barangays", "id": "042111001", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Binakayan-Kanluran", "zip_code": null } },
    { "type": "barangays", "id": "042111016", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Congbalay-Legaspi", "zip_code": null } },
    { "type": "barangays", "id": "042111002", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Gahak", "zip_code": null } },
    { "type": "barangays", "id": "042111003", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Kaingen", "zip_code": null } },
    { "type": "barangays", "id": "042111007", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Magdalo (Putol)", "zip_code": null } },
    { "type": "barangays", "id": "042111017", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Manggahan-Lawin", "zip_code": null } },
    { "type": "barangays", "id": "042111004", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Marulas", "zip_code": null } },
    { "type": "barangays", "id": "042111005", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Panamitan", "zip_code": null } },
    { "type": "barangays", "id": "042111006", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Poblacion", "zip_code": null } },
    { "type": "barangays", "id": "042111018", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Pulvorista", "zip_code": null } },
    { "type": "barangays", "id": "042111019", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Samala-Marquez", "zip_code": null } },
    { "type": "barangays", "id": "042111008", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "San Sebastian", "zip_code": null } },
    { "type": "barangays", "id": "042111009", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Santa Isabel", "zip_code": null } },
    { "type": "barangays", "id": "042111010", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Tabon I", "zip_code": null } },
    { "type": "barangays", "id": "042111020", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Tabon II", "zip_code": null } },
    { "type": "barangays", "id": "042111021", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Tabon III", "zip_code": null } },
    { "type": "barangays", "id": "042111011", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Toclong", "zip_code": null } },
    { "type": "barangays", "id": "042111022", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Tramo-Bantayan", "zip_code": null } },
    { "type": "barangays", "id": "042111012", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Wakas I", "zip_code": null } },
    { "type": "barangays", "id": "042111023", "attributes": { "region_code": "040000000", "province_code": "042100000", "municipality_code": "042111000", "name": "Wakas II", "zip_code": null } }
  ]
}
```

---

### 6. Generate Token

**POST** `{{base}}/api/integration/token`

Generates an integration access token for authenticating subsequent requests.

| Field | Type | Required | Description |
|---|---|---|---|
| `access_code` | string | Yes | Pre-issued access code |

**cURL**

```bash
curl --request POST \
  --url '{{base}}/api/integration/token' \
  --header 'Content-Type: application/json' \
  --data '{
    "access_code": "{{access_code}}"
  }'
```

**200 OK**

```json
{
  "access_token": "00000000-0000-0000-0000-000000000000",
  "expires_at": "2026-07-19T23:08:06.672+08:00"
}
```

---

### 7. Submit Complaint

**POST** `{{base}}/api/integration/submit_complaint`

Submits a new complaint report.

**Auth:** Bearer Token (`{{integration_token}}`)

| Field | Type | Required | Description |
|---|---|---|---|
| `mobile` | string | Yes | Complainant mobile (e.g. `639XXXXXXXXX`) |
| `first_name` | string | Yes | First name |
| `last_name` | string | Yes | Last name |
| `gender` | string | Yes | Gender |
| `complainant_email` | string | Yes | Email address |
| `report_type` | string | Yes | Report category (e.g. `crime`) |
| `subject` | string | Yes | Brief subject |
| `message` | string | Yes | Detailed description |
| `evidences` | array of strings | No | Image URLs |
| `region_code` | string | Yes | PSA region code |
| `province_code` | string | Yes | PSA province code |
| `municipality_code` | string | Yes | PSA municipality code |
| `barangay_code` | string | Yes | PSA barangay code |
| `latitude` | string | No | Latitude coordinate |
| `longitude` | string | No | Longitude coordinate |

**cURL**

```bash
curl --request POST \
  --url '{{base}}/api/integration/submit_complaint' \
  --header 'Authorization: Bearer {{integration_token}}' \
  --header 'Content-Type: application/json' \
  --data '{
    "mobile": "639999999999",
    "first_name": "Juan",
    "last_name": "Dela Cruz",
    "gender": "Male",
    "complainant_email": "juan.delacruz@email.com",
    "report_type": "crime",
    "subject": "Test subject",
    "message": "Test message",
    "evidences": [
      "https://yavuzceliker.github.io/sample-images/image-1021.jpg"
    ],
    "region_code": "040000000",
    "province_code": "042100000",
    "municipality_code": "042111000",
    "barangay_code": "042111011",
    "latitude": "14.60",
    "longitude": "120.98"
  }'
```

**200 OK**

```json
{
  "code": 200,
  "message": "We received your report. We'll get back to you.",
  "case_number": "PFM-071826-0014"
}
```

---

### 8. Verify - Request OTP

**POST** `{{base}}/api/integration/verify/request`

Sends an OTP to the specified email address.

**Auth:** Bearer Token (`{{integration_token}}`)

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Email to send OTP to |

**cURL**

```bash
curl --request POST \
  --url '{{base}}/api/integration/verify/request' \
  --header 'Authorization: Bearer {{integration_token}}' \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "juan.delacruz@email.com"
  }'
```

**200 OK**

```json
{
  "code": 200,
  "already_verified": false,
  "message": "A 6-digit verification code has been sent to juan.delacruz@email.com. It expires in 5 minutes."
}
```

---

### 9. Verify - Confirm OTP

**POST** `{{base}}/api/integration/verify/confirm`

Confirms the OTP and returns a `report_view_token` for accessing reports.

**Auth:** Bearer Token (`{{integration_token}}`)

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | string | Yes | Email address |
| `otp` | string | Yes | 6-digit OTP |

**cURL**

```bash
curl --request POST \
  --url '{{base}}/api/integration/verify/confirm' \
  --header 'Authorization: Bearer {{integration_token}}' \
  --header 'Content-Type: application/json' \
  --data '{
    "email": "juan.delacruz@email.com",
    "otp": "000000"
  }'
```

**200 OK**

```json
{
  "code": 200,
  "report_view_token": "00000000-0000-0000-0000-000000000000",
  "expires_at": "2026-07-19T01:36:59.944+08:00"
}
```

---

### 10. Reports List

**GET** `{{base}}/api/integration/reports`

Retrieves a paginated list of reports.

**Auth:** `X-EReport-View-Token` header (`{{integration_report_view_token}}`)

| Param | Default | Description |
|---|---|---|
| `q` | — | Optional search/filter string |
| `page` | 1 | Page number |
| `limit` | 25 | Results per page |

**cURL**

```bash
curl --request GET \
  --url '{{base}}/api/integration/reports' \
  --header 'X-EReport-View-Token: {{integration_report_view_token}}'
```

**200 OK**

```json
{
  "jsonapi": { "version": "1.0" },
  "meta": {
    "pagination": {
      "total": 1,
      "per_page": 25,
      "current_page": 1,
      "total_pages": 1
    }
  },
  "data": [
    {
      "type": "reports",
      "id": "00000000-0000-0000-0000-000000000000",
      "attributes": {
        "case_number": "PFM-071826-0014",
        "complainant": {
          "first_name": "Erick",
          "last_name": "Mann",
          "fullname": "Erick Mann",
          "phone_number": "639000000000",
          "gender": "Male",
          "email": "juan.delacruz@example.com"
        },
        "report_type": {
          "id": "0ef6d51a-75be-4ff5-9259-e7f080504f48",
          "code": "crime",
          "name": "Crime",
          "img_url": null
        },
        "subject": "consequatur",
        "message": "Quaerat consequatur vel eaque est ea nobis.",
        "evidences": [
          "http://placeimg.com/640/480",
          "http://placeimg.com/640/480"
        ],
        "address": {
          "region": { "code": "040000000", "name": "REGION IV-A (CALABARZON)" },
          "province": { "code": "042100000", "name": "CAVITE" },
          "municipality": { "code": "042111000", "name": "KAWIT" },
          "barangay": { "code": "042111011", "name": "Toclong" },
          "latitude": "14.60",
          "longitude": "120.98",
          "country_code": "PH",
          "country_name": "Philippines"
        },
        "status": "PENDING",
        "formatted_status": "Pending",
        "history": [],
        "created_at": "Jul 18, 2026 11:41:22 PM"
      }
    }
  ]
}
```

---

### 11. View Report by Case Number

**GET** `{{base}}/api/integration/reports/:case_number`

Retrieves full details of a specific report by case number.

**Auth:** `X-EReport-View-Token` header (`{{integration_report_view_token}}`)

| Param | Type | Required | Description |
|---|---|---|---|
| `case_number` | string | Yes | Unique case number (path param) |

**cURL**

```bash
curl --request GET \
  --url '{{base}}/api/integration/reports/PFM-071826-0014' \
  --header 'X-EReport-View-Token: {{integration_report_view_token}}'
```

**200 OK**

```json
{
  "data": {
    "id": "00000000-0000-0000-0000-000000000000",
    "case_number": "PFM-071826-0014",
    "complainant": {
      "first_name": "Erick",
      "last_name": "Mann",
      "fullname": "Erick Mann",
      "phone_number": "639000000000",
      "gender": "Male",
      "email": "juan.delacruz@example.com"
    },
    "report_type": {
      "id": "0ef6d51a-75be-4ff5-9259-e7f080504f48",
      "code": "crime",
      "name": "Crime",
      "img_url": null
    },
    "subject": "consequatur",
    "message": "Quaerat consequatur vel eaque est ea nobis.",
    "evidences": [
      "http://placeimg.com/640/480",
      "http://placeimg.com/640/480"
    ],
    "address": {
      "region": { "code": "040000000", "name": "REGION IV-A (CALABARZON)" },
      "province": { "code": "042100000", "name": "CAVITE" },
      "municipality": { "code": "042111000", "name": "KAWIT" },
      "barangay": { "code": "042111011", "name": "Toclong" },
      "latitude": "14.60",
      "longitude": "120.98",
      "country_code": "PH",
      "country_name": "Philippines"
    },
    "status": "PENDING",
    "formatted_status": "Pending",
    "history": [
      {
        "status": "PENDING",
        "formatted_status": "Pending",
        "remarks": null,
        "created_at": "Jul 18, 2026 11:41:22 PM"
      }
    ],
    "created_at": "Jul 18, 2026 11:41:22 PM"
  }
}
```

---

## eGov SSO

Single Sign-On integration for eGov partners. Uses OAuth 2.0 authorization code flow.

**Base URL:** `{{base_url}}`

### 12. Generate Exchange Code

Mints an exchange code for a partner using a test eGov identity. Use the returned `exchange_code` in the Generate Token endpoint.

| Param | Description |
|---|---|
| `partner_code` | Partner code (e.g. `{{partner_code}}`) |

---

### 13. Generate Access Token

**POST** `{{base_url}}/api/token`

Exchanges an authorization code for an access token.

| Field | Type | Required | Description |
|---|---|---|---|
| `exchange_code` | string | Yes | Authorization code from user authentication |
| `scope` | string | Yes | Use `SSO_AUTHENTICATION` |
| `partner_code` | string | Yes | Partner/agency code |
| `partner_secret` | string | Yes | Partner secret key |

**cURL**

```bash
curl --request POST \
  --url '{{base_url}}/api/token' \
  --header 'Content-Type: application/json' \
  --data '{
    "exchange_code": "generated_exchange_code",
    "scope": "SSO_AUTHENTICATION",
    "partner_code": "{{partner_code}}",
    "partner_secret": "{{partner_secret}}"
  }'
```

**200 OK**

```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

| Status | Description |
|---|---|
| 200 OK | Access token generated |
| 403 Forbidden | Invalid partner credentials |
| 422 Unprocessable Entity | Exchange code invalid/expired |

---

### 14. SSO Authentication

**POST** `{{base_url}}/api/partner/sso_authentication`

Resolves the authenticated user's profile. Call after obtaining an access token from Generate Token.

**Auth:** Bearer Token (`{{access_token}}`)

No request body required.

**cURL**

```bash
curl --request POST \
  --url '{{base_url}}/api/partner/sso_authentication' \
  --header 'Authorization: Bearer {{access_token}}'
```

**200 OK**

```json
{
  "status": 200,
  "message": "OK",
  "data": {
    "uniqid": "MVPCBEUVCGPZR",
    "email": "josie@yopmail.com",
    "birth_date": "1990-01-01",
    "first_name": "JOSIE",
    "middle_name": "SANTOS",
    "last_name": "DELA CRUZ",
    "suffix": null,
    "gender": "female",
    "nationality": "Filipino",
    "photo": "https://staging-files.oueg.info/...",
    "mobile": "+639090000000",
    "address": "1123 RIZAL ST., POBLACION, CITY OF ALAMINOS, PANGASINAN, PHILIPPINES",
    "street": "1123 RIZAL ST.",
    "barangay": "POBLACION",
    "municipality": "CITY OF ALAMINOS",
    "region": "REGION I (ILOCOS REGION)",
    "province": "PANGASINAN",
    "country": "Philippines",
    "country_alpha_2_code": "PH",
    "country_alpha_3_code": "PHL",
    "postal": null,
    "address_line_2": null,
    "barangay_code": "0105503021",
    "province_code": "0105500000",
    "municipality_code": "0105503000",
    "region_code": "0100000000",
    "country_id": 175,
    "foreign_address": null,
    "signature": "data:image/png;base64,...",
    "signature_url": "https://egov-stg.s3...?X-Amz-Signature=...",
    "additional_information": {
      "health_data": {
        "weight": "55",
        "height": "168",
        "eyes_color": "Black",
        "complexion": "WHITE"
      },
      "birth_place": {
        "birth_country": "Philippines",
        "birth_province": "PANGASINAN",
        "birth_municipality": "CITY OF ALAMINOS"
      },
      "other_personal_information": {
        "marital_status": "Single",
        "religion": "N/A"
      },
      "mother_details": {
        "mother_maiden_lastname": "SANTOS",
        "mother_maiden_firstname": "MARIE",
        "mother_maiden_middlename": "GARCIA",
        "mother_birthdate": "2021-03-18"
      },
      "father_details": {
        "father_lastname": "N/A",
        "father_firstname": "N/A",
        "father_birthdate": "1978-10-09"
      },
      "emergency_information": {
        "emergency_name": "MARK DELA CRUZ",
        "emergency_contact": "+63 9090000010",
        "emergency_relationship": "Parent"
      },
      "industry": {
        "industry": "Professional, Scientific and Technical Activities"
      },
      "occupation": {
        "occupation": "Software And Applications Developers And Analyst Not Elsewhere Classified"
      },
      "expected_salary": {
        "expected_salary": "130,001-180,000"
      },
      "educational_attainment": [
        {
          "level": "Master",
          "school": "AMA Computer College-Pangasinan",
          "from": "2008",
          "educational_background": "INFORMATION TECHNOLOGY",
          "to": "2012"
        }
      ]
    },
    "passport": {
      "first_name": "Josie",
      "middle_name": "SANTOS",
      "last_name": "Dela Cruz",
      "suffix": null,
      "gender": "female",
      "birth_date": "1990-01-01",
      "passport_number": "PN1234567",
      "place_issued": "Philippines",
      "issued_date": "2023-08-29",
      "expiry_date": "2030-08-29"
    },
    "national_id": {
      "code": "XXX001",
      "pcn": "9639954762664080",
      "face_url": "https://egov-cdn-stg.oueg.info/uploads/...",
      "signature": "data:image/png;base64,..."
    },
    "tin_id": null
  }
}
```
```

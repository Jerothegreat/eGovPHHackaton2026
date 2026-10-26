/**
 * Alert types for Layer 1: Inbound Alert Ingestion
 *
 * CAP = Common Alerting Protocol v1.2
 * PSGC = Philippine Standard Geographic Code (9-digit)
 */

/** Raw CAP alert payload as received from PAGASA/NDRRMC webhooks */
export interface CAPAlert {
  identifier: string
  sender: string                 // 'PAGASA', 'NDRRMC', 'PHIVOLCS'
  sent: string                   // ISO timestamp
  status: 'Actual' | 'Exercise' | 'System' | 'Test' | 'Draft'
  msgType: 'Alert' | 'Update' | 'Cancel'
  scope: 'Public' | 'Restricted' | 'Private'
  info: CAPAlertInfo
}

export interface CAPAlertInfo {
  event: string                  // e.g. 'Typhoon', 'Heavy Rainfall', 'Flood Advisory'
  urgency: 'Immediate' | 'Expected' | 'Future' | 'Past' | 'Unknown'
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown'
  certainty: 'Observed' | 'Likely' | 'Possible' | 'Unlikely' | 'Unknown'
  headline: string
  description: string
  effective: string              // ISO timestamp
  expires?: string               // ISO timestamp
  area: CAPArea[]
  parameter?: CAPParameter[]
}

export interface CAPArea {
  areaDesc: string               // e.g. 'Pangasinan', 'Barangay POBLACION'
  geocode?: { valueName: string; value: string }[]  // PSGC geocodes
  polygon?: string
  circle?: string
}

export interface CAPParameter {
  valueName: string
  value: string
}

/** Persisted alert record in Supabase */
export interface Alert {
  id: string
  source: string
  cap_identifier: string | null
  event_type: string
  severity: string
  urgency: string
  headline: string
  description: string | null
  effective_at: string
  expires_at: string | null
  psgc_codes: string[]
  raw_payload: CAPAlert
  threshold_met: boolean
  campaign_id: string | null
  created_at: string
}

/** Result from the threshold engine evaluation */
export interface ThresholdResult {
  met: boolean
  reason: string
  severity_score: number         // 0-100
  auto_draft: boolean            // whether to trigger AI auto-drafting
}

/** AI-generated draft assessment from the LangChain pipeline */
export interface DraftAssessment {
  campaign_name: string
  disaster_type: string
  disaster_date: string
  questions: DraftQuestion[]
}

export interface DraftQuestion {
  question_text: string
  need_category: string
  display_order: number
}

/** Preset alert scenarios for the demo simulator */
export interface AlertScenario {
  id: string
  name: string
  description: string
  cap_alert: CAPAlert
}

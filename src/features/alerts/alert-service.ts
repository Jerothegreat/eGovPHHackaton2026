/**
 * Alert Service — Layer 1 Orchestrator
 *
 * Orchestrates the full Layer 1 pipeline:
 *   CAP Webhook → Parse → PSGC Map → Threshold Check → AI Draft → Save
 *
 * This is the main entry point for alert ingestion, called either from:
 * - A Supabase Edge Function (production)
 * - The AlertSimulator component (demo/development)
 */

import type { Alert, DraftAssessment, ThresholdResult } from './types'
import { parseCAPPayload, normalizeEventType, extractPSGCCodes } from './cap-parser'
import { evaluateThreshold } from './threshold-engine'
import { generateDraftAssessment } from './langchain-drafting'

export interface AlertIngestionResult {
  alert: Alert
  threshold: ThresholdResult
  draft: DraftAssessment | null
}

/**
 * Process an inbound alert — the full Layer 1 pipeline.
 *
 * 1. Parse CAP envelope
 * 2. Extract PSGC codes + normalize event type
 * 3. Evaluate severity threshold
 * 4. If threshold met → run AI auto-drafting with RDANA grounding
 * 5. Return the alert record + threshold result + optional draft
 *
 * INVARIANT: Zero push notifications are sent during this step.
 */
export async function processInboundAlert(
  rawPayload: Record<string, unknown>,
): Promise<AlertIngestionResult> {
  // Step 1: Parse CAP payload
  const capAlert = parseCAPPayload(rawPayload)

  // Step 2: Extract location and event metadata
  const eventType = normalizeEventType(capAlert.info.event)
  const psgcCodes = extractPSGCCodes(capAlert.info.area)

  // Step 3: Evaluate threshold
  const threshold = evaluateThreshold(capAlert, eventType)

  // Build alert record
  const alert: Alert = {
    id: crypto.randomUUID(),
    source: capAlert.sender,
    cap_identifier: capAlert.identifier,
    event_type: eventType,
    severity: capAlert.info.severity,
    urgency: capAlert.info.urgency,
    headline: capAlert.info.headline,
    description: capAlert.info.description ?? null,
    effective_at: capAlert.info.effective,
    expires_at: capAlert.info.expires ?? null,
    psgc_codes: psgcCodes,
    raw_payload: capAlert,
    threshold_met: threshold.met,
    campaign_id: null, // Set after draft campaign creation
    created_at: new Date().toISOString(),
  }

  // Step 4: Generate AI draft if threshold is met
  let draft: DraftAssessment | null = null
  if (threshold.auto_draft) {
    const disasterDate = capAlert.info.effective.split('T')[0]
    draft = await generateDraftAssessment(
      eventType,
      capAlert.info.severity,
      capAlert.info.headline,
      disasterDate,
    )
  }

  console.log('[Layer 1] Alert processed:', {
    source: alert.source,
    event: alert.event_type,
    severity: alert.severity,
    threshold_met: threshold.met,
    auto_draft: threshold.auto_draft,
    score: threshold.severity_score,
    psgc_codes: psgcCodes,
    questions_generated: draft?.questions.length ?? 0,
  })

  return { alert, threshold, draft }
}

/**
 * Get preset CAP alert scenarios for the demo simulator.
 */
export function getPresetScenarios(): { id: string; name: string; description: string; payload: Record<string, unknown> }[] {
  return [
    {
      id: 'red-rainfall',
      name: 'Red Rainfall Warning',
      description: 'PAGASA Red Rainfall Warning — Pangasinan, Signal #3',
      payload: {
        identifier: 'PAGASA-2026-RRW-001',
        sender: 'PAGASA',
        sent: new Date().toISOString(),
        status: 'Actual',
        msgType: 'Alert',
        scope: 'Public',
        info: {
          event: 'Heavy Rainfall — Red Rainfall Warning',
          urgency: 'Immediate',
          severity: 'Severe',
          certainty: 'Observed',
          headline: 'Red Rainfall Warning: Heavy rainfall over Pangasinan (Signal #3)',
          description: 'Rainfall of more than 65 mm within the last three hours. Residents in low-lying and flood-prone areas are advised to take precautionary measures. Evacuation may be necessary.',
          effective: new Date().toISOString(),
          expires: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
          area: [
            { areaDesc: 'Pangasinan', geocode: [{ valueName: 'PSGC', value: '0105500000' }] },
            { areaDesc: 'POBLACION, City of Alaminos', geocode: [{ valueName: 'PSGC', value: '0105503021' }] },
          ],
        },
      },
    },
    {
      id: 'typhoon-severe',
      name: 'Super Typhoon Warning',
      description: 'Super Typhoon approaching — Ilocos Region, Signal #4',
      payload: {
        identifier: 'PAGASA-2026-STY-001',
        sender: 'PAGASA',
        sent: new Date().toISOString(),
        status: 'Actual',
        msgType: 'Alert',
        scope: 'Public',
        info: {
          event: 'Super Typhoon KAREN',
          urgency: 'Immediate',
          severity: 'Extreme',
          certainty: 'Likely',
          headline: 'Super Typhoon KAREN Signal #4 — Ilocos Region and Pangasinan',
          description: 'Super Typhoon KAREN with maximum sustained winds of 220 km/h is expected to make landfall within 12 hours. Storm surge of 2-3 meters expected along coastal areas. Mandatory evacuation advised for all coastal and low-lying barangays.',
          effective: new Date().toISOString(),
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          area: [
            { areaDesc: 'Region I - Ilocos Region' },
            { areaDesc: 'Pangasinan', geocode: [{ valueName: 'PSGC', value: '0105500000' }] },
            { areaDesc: 'POBLACION, City of Alaminos', geocode: [{ valueName: 'PSGC', value: '0105503021' }] },
          ],
        },
      },
    },
    {
      id: 'flood-advisory',
      name: 'Flood Advisory',
      description: 'Flood advisory for low-lying areas of Pangasinan',
      payload: {
        identifier: 'PAGASA-2026-FLD-001',
        sender: 'PAGASA',
        sent: new Date().toISOString(),
        status: 'Actual',
        msgType: 'Alert',
        scope: 'Public',
        info: {
          event: 'Flood Advisory',
          urgency: 'Expected',
          severity: 'Moderate',
          certainty: 'Likely',
          headline: 'Flood Advisory: Rising water levels in Agno River system',
          description: 'Water levels in the Agno River and its tributaries continue to rise due to continuous rainfall. Low-lying barangays along the river system are advised to prepare for possible flooding.',
          effective: new Date().toISOString(),
          expires: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          area: [
            { areaDesc: 'City of Alaminos', geocode: [{ valueName: 'PSGC', value: '0105503000' }] },
            { areaDesc: 'POBLACION', geocode: [{ valueName: 'PSGC', value: '0105503021' }] },
          ],
        },
      },
    },
    {
      id: 'earthquake',
      name: 'Earthquake Bulletin',
      description: 'Magnitude 6.2 earthquake — Pangasinan region',
      payload: {
        identifier: 'PHIVOLCS-2026-EQ-001',
        sender: 'PHIVOLCS',
        sent: new Date().toISOString(),
        status: 'Actual',
        msgType: 'Alert',
        scope: 'Public',
        info: {
          event: 'Earthquake',
          urgency: 'Immediate',
          severity: 'Severe',
          certainty: 'Observed',
          headline: 'Earthquake Intensity 7 felt in Pangasinan — Magnitude 6.2',
          description: 'A magnitude 6.2 earthquake was recorded with epicenter 15 km NW of Alaminos City, Pangasinan at a depth of 10 km. Intensity 7 (Destructive) was felt in the area. Aftershocks expected. RDANA assessment recommended.',
          effective: new Date().toISOString(),
          area: [
            { areaDesc: 'POBLACION, City of Alaminos, Pangasinan', geocode: [{ valueName: 'PSGC', value: '0105503021' }] },
          ],
        },
      },
    },
  ]
}

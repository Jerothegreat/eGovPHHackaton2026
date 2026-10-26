/**
 * Threshold Engine — Layer 1
 *
 * Evaluates whether a parsed CAP alert meets the severity threshold
 * for automatic AI draft assessment generation.
 *
 * Based on PAGASA warning signal levels and NDRRMC severity classifications.
 */

import type { CAPAlert, ThresholdResult } from './types'

/** Severity weights for CAP severity levels */
const SEVERITY_SCORES: Record<string, number> = {
  'Extreme': 100,
  'Severe': 80,
  'Moderate': 50,
  'Minor': 25,
  'Unknown': 10,
}

/** Urgency multipliers */
const URGENCY_MULTIPLIERS: Record<string, number> = {
  'Immediate': 1.0,
  'Expected': 0.8,
  'Future': 0.5,
  'Past': 0.2,
  'Unknown': 0.3,
}

/** Event-type base danger levels (higher = more dangerous baseline) */
const EVENT_DANGER_BASE: Record<string, number> = {
  'typhoon': 15,
  'earthquake': 20,
  'tsunami': 25,
  'volcanic': 15,
  'flood': 10,
  'landslide': 12,
  'fire': 8,
}

/**
 * PAGASA-specific signal keywords that boost severity.
 * Found in CAP headline or description text.
 */
const PAGASA_SIGNAL_BOOSTS: { pattern: RegExp; boost: number }[] = [
  { pattern: /signal\s*(?:no\.?\s*)?#?5/i, boost: 40 },
  { pattern: /signal\s*(?:no\.?\s*)?#?4/i, boost: 30 },
  { pattern: /signal\s*(?:no\.?\s*)?#?3/i, boost: 20 },
  { pattern: /signal\s*(?:no\.?\s*)?#?2/i, boost: 10 },
  { pattern: /signal\s*(?:no\.?\s*)?#?1/i, boost: 5 },
  { pattern: /red\s+rainfall/i, boost: 25 },
  { pattern: /orange\s+rainfall/i, boost: 15 },
  { pattern: /yellow\s+rainfall/i, boost: 5 },
  { pattern: /super\s+typhoon/i, boost: 30 },
  { pattern: /intensity\s+(7|8|9)/i, boost: 25 },     // earthquake intensity
  { pattern: /alert\s+level\s+(3|4|5)/i, boost: 20 },  // volcanic alert
  { pattern: /storm\s+surge/i, boost: 20 },
]

/** Minimum combined score to trigger auto-draft (0-100 scale) */
const AUTO_DRAFT_THRESHOLD = 40

/**
 * Evaluate a parsed CAP alert against severity thresholds.
 *
 * Returns a ThresholdResult indicating:
 * - `met`: whether the alert exceeds the minimum severity bar
 * - `auto_draft`: whether to trigger AI auto-drafting of assessment questions
 * - `severity_score`: 0-100 composite score
 * - `reason`: human-readable explanation
 */
export function evaluateThreshold(alert: CAPAlert, eventType: string): ThresholdResult {
  const { info } = alert
  const baseSeverity = SEVERITY_SCORES[info.severity] ?? 10
  const urgencyMult = URGENCY_MULTIPLIERS[info.urgency] ?? 0.3
  const eventBase = EVENT_DANGER_BASE[eventType] ?? 5

  // Compute base score
  let score = (baseSeverity * urgencyMult) + eventBase

  // Apply PAGASA-specific signal boosts from headline + description
  const searchText = `${info.headline} ${info.description ?? ''}`
  const matchedBoosts: string[] = []

  for (const { pattern, boost } of PAGASA_SIGNAL_BOOSTS) {
    if (pattern.test(searchText)) {
      score += boost
      matchedBoosts.push(`+${boost} (${pattern.source})`)
    }
  }

  // Clamp to 0-100
  score = Math.min(100, Math.max(0, Math.round(score)))

  const met = score >= AUTO_DRAFT_THRESHOLD
  const autoDraft = met && alert.status !== 'Test' && alert.msgType !== 'Cancel'

  // Build human-readable reason
  const reasons: string[] = []
  reasons.push(`Severity: ${info.severity} (${baseSeverity} pts)`)
  reasons.push(`Urgency: ${info.urgency} (×${urgencyMult})`)
  reasons.push(`Event base: ${eventType} (+${eventBase})`)
  if (matchedBoosts.length > 0) {
    reasons.push(`Signal boosts: ${matchedBoosts.join(', ')}`)
  }
  reasons.push(`Final score: ${score}/100 (threshold: ${AUTO_DRAFT_THRESHOLD})`)

  return {
    met,
    reason: reasons.join(' | '),
    severity_score: score,
    auto_draft: autoDraft,
  }
}

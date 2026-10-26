/**
 * CAP Alert Parser — Layer 1
 *
 * Parses Common Alerting Protocol v1.2 payloads from PAGASA/NDRRMC
 * and maps area descriptions to 9-digit Philippine PSGC codes.
 */

import type { CAPAlert, CAPArea } from './types'

/** Known PSGC geocode prefixes for Philippine regions */
const PSGC_REGION_PREFIXES: Record<string, string> = {
  'ncr': '13',
  'car': '14',
  'region i': '01',
  'ilocos': '01',
  'region ii': '02',
  'cagayan valley': '02',
  'region iii': '03',
  'central luzon': '03',
  'region iv-a': '04',
  'calabarzon': '04',
  'region iv-b': '17',
  'mimaropa': '17',
  'region v': '05',
  'bicol': '05',
  'region vi': '06',
  'western visayas': '06',
  'region vii': '07',
  'central visayas': '07',
  'region viii': '08',
  'eastern visayas': '08',
  'region ix': '09',
  'zamboanga peninsula': '09',
  'region x': '10',
  'northern mindanao': '10',
  'region xi': '11',
  'davao': '11',
  'region xii': '12',
  'soccsksargen': '12',
  'region xiii': '16',
  'caraga': '16',
  'barmm': '15',
  'armm': '15',
}

/**
 * Known barangay PSGC codes for demo/hackathon.
 * In production this would query the eGovPH location API.
 */
const KNOWN_BARANGAY_PSGCS: Record<string, string> = {
  'poblacion, city of alaminos, pangasinan': '0105503021',
  'poblacion': '0105503021',
  'city of alaminos': '0105503000',
  'alaminos': '0105503000',
  'pangasinan': '0105500000',
}

/**
 * Extract the event type normalized to our internal codes.
 */
export function normalizeEventType(event: string): string {
  const lower = event.toLowerCase()
  if (lower.includes('typhoon') || lower.includes('bagyo') || lower.includes('tropical')) return 'typhoon'
  if (lower.includes('flood') || lower.includes('baha')) return 'flood'
  if (lower.includes('earthquake') || lower.includes('lindol')) return 'earthquake'
  if (lower.includes('volcan') || lower.includes('bulkan') || lower.includes('ashfall')) return 'volcanic'
  if (lower.includes('landslide') || lower.includes('guho')) return 'landslide'
  if (lower.includes('tsunami')) return 'tsunami'
  if (lower.includes('fire') || lower.includes('sunog')) return 'fire'
  if (lower.includes('rain') || lower.includes('ulan')) return 'flood' // heavy rainfall → flood
  if (lower.includes('storm surge')) return 'typhoon'
  return 'typhoon' // default for unknown
}

/**
 * Extract PSGC codes from CAP area descriptions.
 * Checks geocode fields first, then falls back to area text matching.
 */
export function extractPSGCCodes(areas: CAPArea[]): string[] {
  const codes = new Set<string>()

  for (const area of areas) {
    // 1. Try explicit geocodes (CAP standard)
    if (area.geocode) {
      for (const gc of area.geocode) {
        if (gc.valueName.toLowerCase() === 'psgc' || gc.valueName.toLowerCase() === 'geocode') {
          codes.add(gc.value)
        }
      }
    }

    // 2. Fall back to area description text matching
    const desc = area.areaDesc.toLowerCase().trim()
    const known = KNOWN_BARANGAY_PSGCS[desc]
    if (known) {
      codes.add(known)
      continue
    }

    // 3. Try partial matching against known barangay names
    for (const [name, psgc] of Object.entries(KNOWN_BARANGAY_PSGCS)) {
      if (desc.includes(name) || name.includes(desc)) {
        codes.add(psgc)
      }
    }

    // 4. Try region prefix matching for broader alerts
    for (const [regionName, prefix] of Object.entries(PSGC_REGION_PREFIXES)) {
      if (desc.includes(regionName)) {
        // Add region-level code (province-level matching would need the eGov API)
        codes.add(`${prefix}00000000`.slice(0, 10))
      }
    }
  }

  // If no codes found, default to demo barangay
  if (codes.size === 0) {
    codes.add('0105503021') // POBLACION, City of Alaminos
  }

  return Array.from(codes)
}

/**
 * Parse a raw CAP JSON payload into our internal CAPAlert structure.
 * Handles both standard CAP format and simplified PAGASA variants.
 */
export function parseCAPPayload(raw: Record<string, unknown>): CAPAlert {
  // Standard CAP structure
  if (raw.identifier && raw.info) {
    return raw as unknown as CAPAlert
  }

  // Simplified / flat format (common in Philippine weather bulletins)
  const info = (raw.info ?? raw) as Record<string, unknown>
  const areas = (info.area ?? info.areas ?? []) as CAPArea[]

  return {
    identifier: (raw.identifier as string) ?? crypto.randomUUID(),
    sender: (raw.sender as string) ?? 'PAGASA',
    sent: (raw.sent as string) ?? new Date().toISOString(),
    status: (raw.status as CAPAlert['status']) ?? 'Actual',
    msgType: (raw.msgType as CAPAlert['msgType']) ?? 'Alert',
    scope: (raw.scope as CAPAlert['scope']) ?? 'Public',
    info: {
      event: (info.event as string) ?? 'Unknown Event',
      urgency: (info.urgency as CAPAlertInfo['urgency']) ?? 'Immediate',
      severity: (info.severity as CAPAlertInfo['severity']) ?? 'Moderate',
      certainty: (info.certainty as CAPAlertInfo['certainty']) ?? 'Likely',
      headline: (info.headline as string) ?? 'Weather Advisory',
      description: (info.description as string) ?? '',
      effective: (info.effective as string) ?? new Date().toISOString(),
      expires: info.expires as string | undefined,
      area: Array.isArray(areas) ? areas : [{ areaDesc: 'Pangasinan' }],
      parameter: (info.parameter as CAPParameter[]) ?? [],
    },
  }
}

// Re-export needed types for the parser
type CAPAlertInfo = CAPAlert['info']
type CAPParameter = NonNullable<CAPAlertInfo['parameter']>[number]

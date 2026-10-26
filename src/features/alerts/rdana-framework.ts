/**
 * RDANA Framework — Grounding Context for AI Auto-Drafting
 *
 * Based on:
 * - NDRRMC RDANA (Rapid Damage Assessment and Needs Analysis)
 * - DSWD DROMIC (Disaster Response Operations Monitoring and Information Center)
 * - BDRRM CP Forms 4A/6/8
 *
 * This module provides structured reference data so the LangChain AI pipeline
 * generates questions grounded in official Philippine disaster reporting frameworks.
 */

export interface RDANACategory {
  code: string
  label: string
  rdana_section: string
  dromic_field: string
  sample_questions: string[]
  /** Which disaster types commonly need this category */
  applicable_events: string[]
}

export const RDANA_CATEGORIES: RDANACategory[] = [
  {
    code: 'shelter',
    label: 'Shelter / Housing',
    rdana_section: 'Section II-A: Housing & Shelter Damage',
    dromic_field: 'damaged_houses',
    sample_questions: [
      'Is your home structurally damaged?',
      'Has your home been partially or totally destroyed?',
      'Are you currently staying in an evacuation center?',
      'Do you need temporary shelter materials (tarpaulin, tents)?',
    ],
    applicable_events: ['typhoon', 'flood', 'earthquake', 'volcanic', 'fire', 'landslide'],
  },
  {
    code: 'food_water',
    label: 'Food & Water Supply',
    rdana_section: 'Section II-B: Food Security & Water Access',
    dromic_field: 'food_packs_served',
    sample_questions: [
      'Is your family short on food supply (less than 3 days)?',
      'Do you have access to clean drinking water?',
      'Do you need emergency food packs?',
      'Has your water supply been contaminated?',
    ],
    applicable_events: ['typhoon', 'flood', 'earthquake', 'volcanic', 'drought'],
  },
  {
    code: 'medical',
    label: 'Health / Medical',
    rdana_section: 'Section II-C: Health & Medical Needs',
    dromic_field: 'injured_persons',
    sample_questions: [
      'Does anyone in your household need medical attention?',
      'Are there injured persons in your household?',
      'Do you need medicine or medical supplies?',
      'Are there pregnant women, elderly, or PWDs needing assistance?',
    ],
    applicable_events: ['typhoon', 'flood', 'earthquake', 'volcanic', 'fire', 'landslide'],
  },
  {
    code: 'livelihood',
    label: 'Livelihood / Agriculture',
    rdana_section: 'Section II-D: Livelihood & Agriculture Impact',
    dromic_field: 'affected_livelihood',
    sample_questions: [
      'Has your livelihood or source of income been affected?',
      'Were your crops, livestock, or fishing equipment damaged?',
      'Do you need livelihood assistance or cash-for-work?',
    ],
    applicable_events: ['typhoon', 'flood', 'drought', 'volcanic'],
  },
  {
    code: 'evacuation',
    label: 'Evacuation Needs',
    rdana_section: 'Section II-E: Evacuation & Displacement',
    dromic_field: 'served_inside_ec',
    sample_questions: [
      'Do you need evacuation assistance?',
      'Is your area currently flooded or inaccessible?',
      'Are there persons stranded in your area?',
      'Do you need rescue or transportation assistance?',
    ],
    applicable_events: ['typhoon', 'flood', 'volcanic', 'landslide', 'tsunami'],
  },
  {
    code: 'utilities',
    label: 'Utilities & Infrastructure',
    rdana_section: 'Section II-F: Infrastructure & Utility Damage',
    dromic_field: 'infrastructure_damage',
    sample_questions: [
      'Do you have access to electricity?',
      'Is your area experiencing communication blackout?',
      'Are roads in your area passable?',
      'Is your water system (piped/well) still functional?',
    ],
    applicable_events: ['typhoon', 'flood', 'earthquake', 'volcanic', 'landslide'],
  },
]

/** DSWD DROMIC reporting fields for export alignment */
export const DROMIC_FIELDS = {
  total_affected_families: 'Total Number of Affected Families',
  total_affected_persons: 'Total Number of Affected Persons',
  damaged_houses_partially: 'Number of Partially Damaged Houses',
  damaged_houses_totally: 'Number of Totally Damaged Houses',
  served_inside_ec: 'Families Served Inside Evacuation Centers',
  served_outside_ec: 'Families Served Outside Evacuation Centers',
  dead: 'Number of Dead',
  injured: 'Number of Injured',
  missing: 'Number of Missing',
} as const

/** BDRRM CP Form mappings for CSV/PDF export alignment */
export const CP_FORM_MAPPING = {
  '4A': {
    title: 'Affected Families Inside Evacuation Centers',
    fields: ['family_name', 'head_of_family', 'address', 'num_members', 'contact', 'needs'],
  },
  '6': {
    title: 'Affected Families Outside Evacuation Centers',
    fields: ['family_name', 'head_of_family', 'address', 'num_members', 'contact', 'needs'],
  },
  '8': {
    title: 'Summary of Damaged Houses',
    fields: ['owner', 'address', 'damage_type', 'estimated_cost'],
  },
} as const

/**
 * Get RDANA categories applicable to a specific disaster event type.
 * Used by the LangChain pipeline to select relevant question categories.
 */
export function getCategoriesForEvent(eventType: string): RDANACategory[] {
  const normalized = eventType.toLowerCase()
  return RDANA_CATEGORIES.filter(cat =>
    cat.applicable_events.some(e => normalized.includes(e))
  )
}

/**
 * Build the grounding prompt text for the LangChain AI pipeline.
 * Includes all relevant RDANA categories and sample questions for context.
 */
export function buildGroundingPrompt(eventType: string, severity: string, headline: string): string {
  const categories = getCategoriesForEvent(eventType)
  if (categories.length === 0) {
    // Fallback: use all categories for unknown event types
    return buildGroundingPromptFromCategories(RDANA_CATEGORIES, eventType, severity, headline)
  }
  return buildGroundingPromptFromCategories(categories, eventType, severity, headline)
}

function buildGroundingPromptFromCategories(
  categories: RDANACategory[],
  eventType: string,
  severity: string,
  headline: string,
): string {
  const categoryBlocks = categories.map(cat => {
    const questions = cat.sample_questions.map(q => `    - "${q}"`).join('\n')
    return `  ${cat.label} (${cat.rdana_section}, DROMIC: ${cat.dromic_field}):
${questions}`
  }).join('\n\n')

  return `You are an AI assistant for the Philippine HANDA disaster response system.

CONTEXT:
- Disaster Event: ${headline}
- Event Type: ${eventType}
- Severity Level: ${severity}
- Framework: NDRRMC RDANA (Rapid Damage Assessment and Needs Analysis)
- Reporting Standards: DSWD DROMIC, BDRRM CP Forms 4A/6/8

RDANA ASSESSMENT CATEGORIES AND SAMPLE QUESTIONS:

${categoryBlocks}

TASK:
Generate a concise set of 4-6 assessment questions for this specific disaster event.
Each question must:
1. Be written in simple, clear English (understandable by Filipino citizens on basic smartphones)
2. Be answerable with Yes/No
3. Map to exactly one RDANA need_category code: ${categories.map(c => c.code).join(', ')}
4. Be directly relevant to the disaster type (${eventType}) and severity (${severity})
5. Prioritize life-safety questions first, then shelter, then basic needs

Return ONLY a JSON array of objects with fields: question_text, need_category, display_order
Example: [{"question_text": "Is your home damaged?", "need_category": "shelter", "display_order": 0}]`
}

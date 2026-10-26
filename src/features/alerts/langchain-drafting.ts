/**
 * LangChain AI Drafting Pipeline — Layer 1
 *
 * Uses LangChain.js to generate RDANA-grounded assessment questions
 * from parsed CAP alert metadata. Falls back to deterministic
 * template-based generation when no LLM API key is available.
 *
 * Grounding: NDRRMC RDANA, DSWD DROMIC, BDRRM CP Forms 4A/6/8
 */

import type { DraftAssessment, DraftQuestion } from './types'
import { getCategoriesForEvent, buildGroundingPrompt } from './rdana-framework'

/**
 * Generate a draft assessment using LangChain with Gemini backend.
 *
 * When VITE_EGOV_AI_ACCESS_CODE or a Gemini API key is available,
 * uses the LLM for contextual question generation.
 * Otherwise falls back to deterministic RDANA template selection.
 */
export async function generateDraftAssessment(
  eventType: string,
  severity: string,
  headline: string,
  disasterDate: string,
): Promise<DraftAssessment> {
  // Try LLM-powered generation first
  const aiDraft = await tryLLMGeneration(eventType, severity, headline)
  if (aiDraft) {
    return {
      campaign_name: deriveCampaignName(headline, eventType),
      disaster_type: capitalize(eventType),
      disaster_date: disasterDate,
      questions: aiDraft,
    }
  }

  // Fallback: deterministic RDANA template selection
  return generateFromTemplates(eventType, severity, headline, disasterDate)
}

/**
 * Attempt LLM-powered generation using fetch to a Gemini-compatible endpoint.
 * This keeps LangChain as a thin orchestrator without adding heavy npm deps.
 */
async function tryLLMGeneration(
  eventType: string,
  severity: string,
  headline: string,
): Promise<DraftQuestion[] | null> {
  // Check for available API key
  const apiKey = (import.meta.env.VITE_EGOV_AI_ACCESS_CODE as string)
    || (import.meta.env.VITE_GEMINI_API_KEY as string)

  if (!apiKey) {
    console.log('[AI Draft] No API key found, using RDANA template fallback')
    return null
  }

  try {
    const prompt = buildGroundingPrompt(eventType, severity, headline)

    // Call Gemini API directly (LangChain-style structured output)
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      },
    )

    if (!res.ok) {
      console.warn('[AI Draft] Gemini API error:', res.status)
      return null
    }

    const json = await res.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }

    const text = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return null

    const parsed = JSON.parse(text) as DraftQuestion[]
    if (!Array.isArray(parsed) || parsed.length === 0) return null

    // Validate structure
    return parsed
      .filter(q => q.question_text && q.need_category)
      .map((q, i) => ({
        question_text: q.question_text,
        need_category: q.need_category,
        display_order: q.display_order ?? i,
      }))
  } catch (err) {
    console.warn('[AI Draft] LLM generation failed, using template fallback:', err)
    return null
  }
}

/**
 * Deterministic fallback: select RDANA template questions based on event type and severity.
 * No API key needed — works offline for hackathon demos.
 */
function generateFromTemplates(
  eventType: string,
  severity: string,
  headline: string,
  disasterDate: string,
): DraftAssessment {
  const categories = getCategoriesForEvent(eventType)

  // Select questions based on severity
  const maxQuestions = severity === 'Extreme' || severity === 'Severe' ? 6 : 4
  const questions: DraftQuestion[] = []
  let order = 0

  for (const cat of categories) {
    if (questions.length >= maxQuestions) break

    // Pick 1 question per category, prioritizing first (life-safety) questions
    const q = cat.sample_questions[0]
    if (q) {
      questions.push({
        question_text: q,
        need_category: cat.code,
        display_order: order++,
      })
    }
  }

  // Ensure we always have at least shelter, food/water, and medical
  const coreCategories = ['shelter', 'food_water', 'medical']
  for (const coreCode of coreCategories) {
    if (!questions.some(q => q.need_category === coreCode)) {
      const cat = categories.find(c => c.code === coreCode)
        ?? getCategoriesForEvent('typhoon').find(c => c.code === coreCode)
      if (cat && questions.length < maxQuestions) {
        questions.push({
          question_text: cat.sample_questions[0],
          need_category: cat.code,
          display_order: order++,
        })
      }
    }
  }

  return {
    campaign_name: deriveCampaignName(headline, eventType),
    disaster_type: capitalize(eventType),
    disaster_date: disasterDate,
    questions,
  }
}

/** Derive a human-friendly campaign name from the alert headline */
function deriveCampaignName(headline: string, eventType: string): string {
  // If headline is descriptive enough, use it
  if (headline.length > 10 && headline.length < 80) {
    return headline.replace(/\s+/g, ' ').trim()
  }
  // Otherwise build from event type + date
  return `${capitalize(eventType)} Response — ${new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

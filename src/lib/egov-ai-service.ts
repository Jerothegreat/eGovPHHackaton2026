import { supabase } from "./supabase"

/**
 * eGov AI API Service Layer
 *
 * All calls are routed through the Supabase Edge Function ("egov").
 * API keys (EGOV_AI_ACCESS_CODE, GEMINI_API_KEY) are read from Deno.env
 * on the server — they are never exposed in the browser bundle.
 */

export type LanguageCode = "en" | "fil" | "ilo" | "ceb" | "hil" | "war" | "pam" | "pag" | "bik"

export type AiResponseSource = "egov_live" | "gemini_fallback" | "local_fallback" | "unavailable"

export interface TranslationResponse {
  original_prompt: string
  source_lang: string
  target_lang: string
  translate_from: { code: string; label: string }
  translated_prompt: string
  transliterated_prompt?: string
  is_live_api?: boolean
  source?: AiResponseSource
  error_message?: string
}

export interface AiAssistantResponse {
  data: string
  session_id: string
  is_live_api?: boolean
  source?: AiResponseSource
  error_message?: string
}

export interface CreditBalanceResponse {
  credits_total: number
  credits_used: number
  credits_remaining: number
  expires_at?: string
  is_live_api?: boolean
}

function getLocalFallbackAnswer(prompt: string): string {
  const lower = prompt.toLowerCase()
  if (lower.includes("hotline") || lower.includes("number") || lower.includes("call") || lower.includes("contact")) {
    return `Here are the official National & Local Disaster Emergency Hotlines:\n\n1. **National Emergency Hotline**: 911\n2. **NDRRMC Operational Command Center**: (02) 8911-1406 / (02) 8912-2665\n3. **Philippine Red Cross Emergency Services**: 143 / (02) 8790-2300\n4. **PCG (Philippine Coast Guard)**: 0917-724-3682\n5. **Local MDRRMO / Barangay Command**: Access check-in queue or contact your local Barangay Health Worker.`
  }
  if (lower.includes("typhoon") || lower.includes("storm") || lower.includes("signal") || lower.includes("flood")) {
    return `For active storm warnings or typhoon alerts:\n\n1. Charge all mobile devices, power banks, and emergency flashlights.\n2. Keep your eGovPH Mobile ID and physical emergency bag accessible.\n3. Complete your **eHANDA Household Check-in** in the app to notify your Barangay of your location and critical needs (food, water, medicine, shelter).\n4. Evacuate immediately if local authorities issue forced evacuation orders.`
  }
  if (lower.includes("emergency aid") || lower.includes("relief") || lower.includes("assistance") || lower.includes("evacuation")) {
    return `For eHANDA emergency assistance, you can request support such as:\n\n1. **Food and clean water** for your household\n2. **Temporary shelter or evacuation support** if your home is unsafe\n3. **Medicine or first aid** for urgent medical needs\n4. **Rescue or transport assistance** if someone is trapped, injured, or unable to travel\n5. **Barangay follow-up** by completing your eHANDA check-in so responders can prioritize your case\n\nIf the situation is life-threatening, call **911** immediately.`
  }
  return `Regarding your inquiry **"${prompt}"**:\n\n1. **Disaster Assistance**: Complete your active Disaster Needs Check-in inside eHANDA so your Barangay Command Center can prioritize relief distribution.\n2. **Emergency Hotlines**: Call **911** for immediate medical/fire rescue or 143 for Red Cross.\n3. **Official Updates**: Monitor local PAGASA typhoon bulletins and your Barangay Command Center announcements.`
}

/**
 * Translate text between supported languages via Edge Function.
 */
export async function translateText(
  prompt: string,
  targetLang: LanguageCode | string = "fil",
  sourceLang: LanguageCode | string = "en"
): Promise<TranslationResponse> {
  try {
    if (supabase) {
      const { data, error } = await supabase.functions.invoke("egov", {
        body: { action: "translate", payload: { prompt, targetLang, sourceLang } },
      })
      if (!error && data) return data as TranslationResponse
      if (error) console.warn("[eGov AI] Edge function translate failed:", error.message)
    }
  } catch (err) {
    console.warn("[eGov AI] Edge function translate failed:", err)
  }

  // Local fallback
  return {
    original_prompt: prompt,
    source_lang: sourceLang,
    target_lang: targetLang,
    translate_from: { code: sourceLang, label: sourceLang.toUpperCase() },
    translated_prompt: prompt,
    is_live_api: false,
    source: "local_fallback",
  }
}

/**
 * Ask eGov AI Assistant a natural language question via Edge Function.
 */
export async function askAiAssistant(
  prompt: string,
  category: string = "PH"
): Promise<AiAssistantResponse> {
  try {
    if (supabase) {
      const { data, error } = await supabase.functions.invoke("egov", {
        body: { action: "assistant", payload: { prompt, category } },
      })
      if (!error && data && (data as AiAssistantResponse).data) {
        return data as AiAssistantResponse
      }
      if (error) console.warn("[eGov AI] Edge function assistant failed:", error.message)
    }
  } catch (err) {
    console.warn("[eGov AI] Edge function assistant failed:", err)
  }

  // Local fallback
  return {
    data: getLocalFallbackAnswer(prompt),
    session_id: crypto.randomUUID(),
    is_live_api: false,
    source: "local_fallback",
  }
}

/**
 * Get remaining token credit balance via Edge Function.
 */
export async function getCreditBalance(): Promise<CreditBalanceResponse> {
  try {
    if (supabase) {
      const { data, error } = await supabase.functions.invoke("egov", {
        body: { action: "credits", payload: {} },
      })
      if (!error && data) return data as CreditBalanceResponse
      if (error) console.warn("[eGov AI] Credits check failed:", error.message)
    }
  } catch (err) {
    console.warn("[eGov AI] Credits endpoint error:", err)
  }

  return {
    credits_total: 200,
    credits_used: 0,
    credits_remaining: 200,
    is_live_api: false,
  }
}

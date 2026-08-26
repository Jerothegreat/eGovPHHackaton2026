const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

type EgovProfile = {
  uniqid: string
  email: string | null
  first_name: string
  middle_name: string | null
  last_name: string
  suffix: string | null
  mobile: string | null
  barangay: string | null
  barangay_code: string | null
  municipality: string | null
  municipality_code: string | null
  province: string | null
  province_code: string | null
  region: string | null
  region_code: string | null
  photo: string | null
}

type ExchangeCodeResponse = { exchange_code?: string; data?: { exchange_code?: string } }
type AccessTokenResponse = {
  access_token?: string
  expires_at?: string
  expires_in_seconds?: number
  data?: { access_token?: string; expires_at?: string; expires_in_seconds?: number }
}
type SSOAuthenticationResponse = { data?: EgovProfile }
type RequestBody = {
  action?: "request-otp" | "confirm-otp" | "sso-profile" | "translate" | "assistant" | "credits" | "send-sms" | "send-telegram" | "ereport-proxy" | "ereport-token"
  payload?: Record<string, unknown>
}

type LanguageCode = "en" | "fil" | "ilo" | "ceb" | "hil" | "war" | "pam" | "pag" | "bik"
type AiResponseSource = "egov_live" | "gemini_fallback" | "local_fallback" | "unavailable"

type TranslationResponse = {
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

type AiAssistantResponse = {
  data: string
  session_id: string
  is_live_api?: boolean
  source?: AiResponseSource
  error_message?: string
}

type CreditBalanceResponse = {
  credits_total: number
  credits_used: number
  credits_remaining: number
  expires_at?: string
  is_live_api?: boolean
}

let cachedIntegrationToken: { token: string; expiresAt: Date } | null = null
let cachedAiToken: { token: string; expiresAt: number } | null = null

const ssoBaseUrl = Deno.env.get("EGOV_SSO_BASE_URL")
const ssoExchangeCodePath = Deno.env.get("EGOV_SSO_EXCHANGE_CODE_PATH") ?? "/api/exchange-code"
const ssoPartnerCode = Deno.env.get("EGOV_SSO_PARTNER_CODE")
const ssoPartnerSecret = Deno.env.get("EGOV_SSO_PARTNER_SECRET")
const integrationBaseUrl = Deno.env.get("EGOV_INTEGRATION_BASE_URL")
const integrationAccessCode = Deno.env.get("EGOV_INTEGRATION_ACCESS_CODE")
const aiRawBaseUrl = Deno.env.get("EGOV_AI_BASE_URL") ?? "https://egov-ai-core-ws.oueg.info"
const aiBaseUrl = `${aiRawBaseUrl}/api/v1/egov/integration`
const aiAccessCode = Deno.env.get("EGOV_AI_ACCESS_CODE") ?? integrationAccessCode ?? ""
const geminiKey = Deno.env.get("GEMINI_API_KEY") ?? ""

// eMessage SMS
const emessageToken = Deno.env.get("EMESSAGE_ACCESS_TOKEN") ?? ""
const emessageBaseUrl = Deno.env.get("EMESSAGE_BASE_URL") ?? "https://ws-message.e.gov.ph"

// Telegram
const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? ""
const telegramDefaultChatIds: number[] = (() => {
  const raw = Deno.env.get("TELEGRAM_CHAT_IDS") ?? ""
  return raw ? raw.split(",").map((s) => Number(s.trim())).filter((n) => Number.isFinite(n) && n !== 0) : []
})()

// eReport
const ereportAccessCode = Deno.env.get("EREPORT_ACCESS_TOKEN") ?? ""
const ereportBaseUrl = Deno.env.get("EREPORT_BASE_URL") ?? "https://stg-ereport-ws.oueg.info"

let cachedEreportToken: { token: string; expiresAt: number } | null = null

function json(data: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
  })
}

function requireString(value: unknown, name: string): string {
  if (typeof value !== "string" || !value) throw new Error(`${name} is required`)
  return value
}

async function generateExchangeCode(): Promise<string> {
  if (!ssoBaseUrl || !ssoPartnerCode) throw new Error("SSO base URL or partner code not configured")

  const endpoint = new URL(ssoExchangeCodePath, ssoBaseUrl)
  endpoint.searchParams.set("partner_code", ssoPartnerCode)

  const getRes = await fetch(endpoint, { method: "GET" })
  if (getRes.ok) {
    const data = await getRes.json() as ExchangeCodeResponse
    const exchangeCode = data.exchange_code ?? data.data?.exchange_code
    if (exchangeCode) return exchangeCode
    throw new Error("Exchange code missing from response")
  }

  const postRes = await fetch(new URL(ssoExchangeCodePath, ssoBaseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ partner_code: ssoPartnerCode }),
  })
  if (!postRes.ok) {
    throw new Error(`Exchange code failed: GET ${getRes.status}, POST ${postRes.status}`)
  }

  const postData = await postRes.json() as ExchangeCodeResponse
  const exchangeCode = postData.exchange_code ?? postData.data?.exchange_code
  if (!exchangeCode) throw new Error("Exchange code missing from response")
  return exchangeCode
}

async function generateSsoAccessToken(exchangeCode: string): Promise<string> {
  if (!ssoBaseUrl || !ssoPartnerCode || !ssoPartnerSecret) throw new Error("SSO credentials not configured")
  const res = await fetch(`${ssoBaseUrl}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      exchange_code: exchangeCode,
      scope: "SSO_AUTHENTICATION",
      partner_code: ssoPartnerCode,
      partner_secret: ssoPartnerSecret,
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`)
  const data = await res.json() as AccessTokenResponse
  const accessToken = data.access_token ?? data.data?.access_token
  if (!accessToken) throw new Error("Access token missing from response")
  return accessToken
}

async function ssoAuthentication(accessToken: string): Promise<EgovProfile> {
  if (!ssoBaseUrl) throw new Error("SSO base URL not configured")
  const res = await fetch(`${ssoBaseUrl}/api/partner/sso_authentication`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  })
  if (!res.ok) throw new Error(`SSO authentication failed: ${res.status}`)
  const json = await res.json() as SSOAuthenticationResponse
  if (!json.data) throw new Error("SSO profile missing from response")
  return json.data
}

async function getIntegrationToken(): Promise<string> {
  if (cachedIntegrationToken && cachedIntegrationToken.expiresAt > new Date()) {
    return cachedIntegrationToken.token
  }

  if (!integrationBaseUrl || !integrationAccessCode) {
    throw new Error("Integration credentials not configured")
  }

  const res = await fetch(`${integrationBaseUrl}/api/integration/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_code: integrationAccessCode }),
  })

  if (!res.ok) throw new Error(`Integration token failed: ${res.status}`)

  const data = await res.json() as { access_token: string; expires_at: string }
  cachedIntegrationToken = {
    token: data.access_token,
    expiresAt: new Date(data.expires_at),
  }
  return cachedIntegrationToken.token
}

async function getEgovAiToken(): Promise<string> {
  if (cachedAiToken && Date.now() < cachedAiToken.expiresAt - 60000) {
    return cachedAiToken.token
  }

  if (!aiAccessCode) {
    console.warn("[eGov AI] No access_code configured in environment.")
    throw new Error("eGov AI access code is missing.")
  }

  try {
    const res = await fetch(`${aiBaseUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_code: aiAccessCode }),
    })

    if (!res.ok) {
      throw new Error(`Token endpoint returned HTTP ${res.status}`)
    }

    const data = await res.json() as AccessTokenResponse
    const accessToken = data.access_token ?? data.data?.access_token
    if (!accessToken) {
      throw new Error("No access_token field in server response")
    }

    const expiresInSeconds = data.expires_in_seconds ?? data.data?.expires_in_seconds ?? 28800
    cachedAiToken = {
      token: accessToken,
      expiresAt: Date.now() + expiresInSeconds * 1000,
    }
    console.log("[eGov AI] Successfully authenticated with live access token.")
    return cachedAiToken.token
  } catch (err) {
    console.error("[eGov AI] Token request failed:", err)
    throw err
  }
}

async function queryGeminiTranslation(prompt: string, targetLang: string, sourceLang: string): Promise<string | null> {
  if (!geminiKey) return null
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Translate this text from ${sourceLang} to ${targetLang}. Return only the translated text. Text: "${prompt}"`,
              },
            ],
          },
        ],
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    return json?.candidates?.[0]?.content?.parts?.[0]?.text || null
  } catch {
    return null
  }
}

async function queryGeminiAssistant(prompt: string): Promise<string | null> {
  if (!geminiKey) return null
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are the eGovPH Citizen Assistant for eHANDA Disaster Management Portal. Answer the citizen's query concisely and helpfully regarding disaster preparation, emergency hotlines (911, NDRRMC, local MDRRMO), eGovPH services, or relief procedures.\n\nCitizen Query: "${prompt}"`,
              },
            ],
          },
        ],
      }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const responseText = json?.candidates?.[0]?.content?.parts?.[0]?.text
    return responseText || null
  } catch (err) {
    console.warn("[eGov AI] Gemini secondary fallback failed:", err)
    return null
  }
}

async function requestOtp(email: string): Promise<{ already_verified: boolean }> {
  const token = await getIntegrationToken()
  const res = await fetch(`${integrationBaseUrl}/api/integration/verify/request`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  })

  if (!res.ok) throw new Error(`OTP request failed: ${res.status}`)

  const data = await res.json() as { code: number; already_verified: boolean }
  return { already_verified: data.already_verified }
}

async function confirmOtp(email: string, otp: string): Promise<{ verified: boolean; report_view_token?: string; expires_at?: string }> {
  const token = await getIntegrationToken()
  const res = await fetch(`${integrationBaseUrl}/api/integration/verify/confirm`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, otp }),
  })

  if (!res.ok) throw new Error(`OTP confirmation failed: ${res.status}`)

  const data = await res.json() as { code: number; report_view_token?: string; expires_at?: string }
  return {
    verified: data.code === 200,
    report_view_token: data.report_view_token,
    expires_at: data.expires_at,
  }
}

async function fetchSsoProfile(providedExchangeCode?: string): Promise<EgovProfile> {
  const exchangeCode = providedExchangeCode ?? (await generateExchangeCode())
  const accessToken = await generateSsoAccessToken(exchangeCode)
  return ssoAuthentication(accessToken)
}

async function translate(payload: Record<string, unknown>): Promise<TranslationResponse> {
  const prompt = requireString(payload.prompt, "prompt")
  const targetLang = (payload.targetLang as LanguageCode | string | undefined) ?? "fil"
  const sourceLang = (payload.sourceLang as LanguageCode | string | undefined) ?? "en"
  const endpoint = `${aiBaseUrl}/translator/generate`

  try {
    const token = await getEgovAiToken()
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        source_lang: sourceLang,
        target_lang: targetLang,
      }),
    })

    if (!res.ok) {
      throw new Error(`Translator endpoint error: HTTP ${res.status}`)
    }

    const data = await res.json()
    return {
      ...data,
      is_live_api: true,
      source: "egov_live",
    }
  } catch (err) {
    console.warn("[eGov AI] Translation API call failed, providing contextual dialect response:", err)

    const dialectNameMap: Record<string, string> = {
      fil: "Filipino",
      ilo: "Ilocano",
      ceb: "Cebuano",
      hil: "Hiligaynon",
      war: "Waray",
      pam: "Kapampangan",
      pag: "Pangasinan",
      bik: "Bikolano",
      en: "English",
    }

    const geminiTranslation = await queryGeminiTranslation(prompt, String(targetLang), String(sourceLang))
    if (geminiTranslation) {
      return {
        original_prompt: prompt,
        source_lang: sourceLang,
        target_lang: targetLang,
        translate_from: { code: sourceLang, label: dialectNameMap[sourceLang] || sourceLang.toUpperCase() },
        translated_prompt: geminiTranslation,
        is_live_api: false,
        source: "gemini_fallback",
      }
    }

    return {
      original_prompt: prompt,
      source_lang: sourceLang,
      target_lang: targetLang,
      translate_from: { code: sourceLang, label: dialectNameMap[sourceLang] || sourceLang.toUpperCase() },
      translated_prompt: "",
      is_live_api: false,
      source: "unavailable",
      error_message: err instanceof Error ? err.message : "Translation unavailable",
    }
  }
}

async function assistant(payload: Record<string, unknown>): Promise<AiAssistantResponse> {
  const prompt = requireString(payload.prompt, "prompt")
  const category = (payload.category as string | undefined) ?? "PH"
  const endpoint = `${aiBaseUrl}/ai_assistant/generate`

  try {
    const token = await getEgovAiToken()
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, category }),
    })

    if (!res.ok) {
      throw new Error(`AI Assistant endpoint error: HTTP ${res.status}`)
    }

    const data = await res.json() as { data: string; session_id?: string }
    return {
      data: data.data,
      session_id: data.session_id || crypto.randomUUID(),
      is_live_api: true,
      source: "egov_live",
    }
  } catch (err) {
    console.warn("[eGov AI] Live AI Assistant call unreachable, trying secondary AI fallback...", err)

    const geminiReply = await queryGeminiAssistant(prompt)
    if (geminiReply) {
      return {
        data: geminiReply,
        session_id: crypto.randomUUID(),
        is_live_api: false,
        source: "gemini_fallback",
      }
    }

    const lower = prompt.toLowerCase()
    const contextualAnswer = lower.includes("hotline") || lower.includes("number") || lower.includes("call") || lower.includes("contact")
      ? `Here are the official National & Local Disaster Emergency Hotlines:\n\n1. **National Emergency Hotline**: 911\n2. **NDRRMC Operational Command Center**: (02) 8911-1406 / (02) 8912-2665\n3. **Philippine Red Cross Emergency Services**: 143 / (02) 8790-2300\n4. **PCG (Philippine Coast Guard)**: 0917-724-3682\n5. **Local MDRRMO / Barangay Command**: Access check-in queue or contact your local Barangay Health Worker.`
      : lower.includes("typhoon") || lower.includes("storm") || lower.includes("signal") || lower.includes("flood")
      ? `For active storm warnings or typhoon alerts:\n\n1. Charge all mobile devices, power banks, and emergency flashlights.\n2. Keep your eGovPH Mobile ID and physical emergency bag accessible.\n3. Complete your **eHANDA Household Check-in** in the app to notify your Barangay of your location and critical needs (food, water, medicine, shelter).\n4. Evacuate immediately if local authorities issue forced evacuation orders.`
      : lower.includes("tin") || lower.includes("id") || lower.includes("government") || lower.includes("service") || lower.includes("everify")
      ? `To access government services & Digital IDs via eGovPH Super App:\n\n1. Log into your verified eGovPH Account.\n2. Navigate to **Mobile ID Wallet** to view Digital National ID, BIR Digital TIN ID, and PhilHealth ID.\n3. Use eHANDA Disaster Portal to auto-verify your residency using your linked eGovPH account.`
      : (
      lower.includes("emergency aid") ||
      lower.includes("relief") ||
      lower.includes("assistance") ||
      lower.includes("evacuation")
      )
      ? `For eHANDA emergency assistance, you can request support such as:\n\n1. **Food and clean water** for your household\n2. **Temporary shelter or evacuation support** if your home is unsafe\n3. **Medicine or first aid** for urgent medical needs\n4. **Rescue or transport assistance** if someone is trapped, injured, or unable to travel\n5. **Barangay follow-up** by completing your eHANDA check-in so responders can prioritize your case\n\nIf the situation is life-threatening, call **911** immediately.`
      : `Regarding your inquiry **"${prompt}"**:\n\n1. **Disaster Assistance**: Complete your active Disaster Needs Check-in inside eHANDA so your Barangay Command Center can prioritize relief distribution.\n2. **Emergency Hotlines**: Call **911** for immediate medical/fire rescue or 143 for Red Cross.\n3. **Official Updates**: Monitor local PAGASA typhoon bulletins and your Barangay Command Center announcements.`

    return {
      data: contextualAnswer,
      session_id: crypto.randomUUID(),
      is_live_api: false,
      source: "local_fallback",
    }
  }
}

async function credits(): Promise<CreditBalanceResponse> {
  const endpoint = `${aiBaseUrl}/credits`

  try {
    const token = await getEgovAiToken()
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      throw new Error(`Credits endpoint error: HTTP ${res.status}`)
    }

    const json = await res.json()
    return {
      ...json,
      is_live_api: true,
    }
  } catch (err) {
    console.warn("[eGov AI] Credits check failed, returning mock balance:", err)
    return {
      credits_total: 200,
      credits_used: 15,
      credits_remaining: 185,
      is_live_api: false,
    }
  }
}

// ---------------------------------------------------------------------------
// eMessage SMS handler
// ---------------------------------------------------------------------------

async function sendSmsEdge(payload: Record<string, unknown>): Promise<{ success: boolean; status: number; message?: string; error?: string }> {
  const number = requireString(payload.number, "number")
  const message = requireString(payload.message, "message")

  if (!emessageToken) {
    return { success: false, status: 0, error: "eGov eSMS access token is not configured." }
  }

  try {
    const response = await fetch(`${emessageBaseUrl}/messaging/v1/sms/push`, {
      method: "POST",
      headers: {
        "X-EMESSAGE-Auth": emessageToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ number, message }),
    })

    const body = await response.text()
    if (response.status === 201) {
      try {
        const data = body ? JSON.parse(body) as { data?: { message?: string } } : undefined
        return { success: true, status: 201, message: data?.data?.message }
      } catch {
        return { success: true, status: 201 }
      }
    }
    return {
      success: false,
      status: response.status,
      error: `eGov eSMS returned HTTP ${response.status}: ${body}`,
    }
  } catch (err) {
    return {
      success: false,
      status: 0,
      error: `eGov eSMS request failed: ${err instanceof Error ? err.message : "network error"}`,
    }
  }
}

// ---------------------------------------------------------------------------
// Telegram handler
// ---------------------------------------------------------------------------

async function sendTelegramEdge(payload: Record<string, unknown>): Promise<{ success: boolean; error?: string }> {
  if (!telegramBotToken) {
    return { success: false, error: "Telegram bot token is not configured." }
  }

  const chatId = payload.chat_id as number
  const text = requireString(payload.text, "text")
  const parseMode = (payload.parse_mode as string | undefined) ?? "Markdown"
  const replyMarkup = payload.reply_markup

  try {
    const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode, reply_markup: replyMarkup }),
    })
    const body = await response.json() as { ok?: boolean; description?: string }
    if (body.ok) return { success: true }
    return { success: false, error: body.description ?? `Telegram returned HTTP ${response.status}` }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Telegram network error" }
  }
}

// ---------------------------------------------------------------------------
// eReport handlers
// ---------------------------------------------------------------------------

async function getEreportToken(): Promise<string> {
  if (cachedEreportToken && Date.now() < cachedEreportToken.expiresAt - 60000) {
    return cachedEreportToken.token
  }

  if (!ereportAccessCode) throw new Error("EREPORT_ACCESS_TOKEN is not configured.")

  const res = await fetch(`${ereportBaseUrl}/api/integration/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_code: ereportAccessCode }),
  })

  if (!res.ok) throw new Error(`eReport token error: HTTP ${res.status}`)

  const data = await res.json() as { access_token?: string; token?: string; expires_in_seconds?: number }
  const token = data.access_token ?? data.token
  if (!token) throw new Error("No token in eReport response")

  cachedEreportToken = {
    token,
    expiresAt: Date.now() + (data.expires_in_seconds ?? 3600) * 1000,
  }
  return token
}

async function ereportProxyEdge(payload: Record<string, unknown>): Promise<unknown> {
  const method = requireString(payload.method, "method")
  const path = requireString(payload.path, "path")
  const body = payload.body
  const reportViewToken = payload.report_view_token as string | undefined

  const url = `${ereportBaseUrl}/api/integration${path}`

  const res = await fetch(url, {
    method,
    headers: {
      ...(reportViewToken ? { "X-EReport-View-Token": reportViewToken } : { Authorization: `Bearer ${await getEreportToken()}` }),
      "Content-Type": "application/json",
    },
    ...(body && method !== "GET" ? { body: JSON.stringify(body) } : {}),
  })

  if (!res.ok) throw new Error(`eReport proxy error: HTTP ${res.status} for ${path}`)
  return res.json()
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const { action, payload = {} } = await req.json() as RequestBody

    switch (action) {
      case "request-otp":
        return json(await requestOtp(requireString(payload.email, "email")))
      case "confirm-otp":
        return json(await confirmOtp(requireString(payload.email, "email"), requireString(payload.otp, "otp")))
      case "sso-profile":
        return json(await fetchSsoProfile(payload.exchange_code as string | undefined))
      case "translate":
        return json(await translate(payload))
      case "assistant":
        return json(await assistant(payload))
      case "credits":
        return json(await credits())
      case "send-sms":
        return json(await sendSmsEdge(payload))
      case "send-telegram":
        return json(await sendTelegramEdge(payload))
      case "ereport-token": {
        const token = await getEreportToken()
        return json({ token })
      }
      case "ereport-proxy":
        return json(await ereportProxyEdge(payload))
      default:
        return json({ error: "Unsupported action" }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error"
    return json({ error: message }, { status: 500 })
  }
})

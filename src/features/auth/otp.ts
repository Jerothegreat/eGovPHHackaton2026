const INTEGRATION_BASE_URL = import.meta.env.VITE_EGOV_INTEGRATION_BASE_URL as string | undefined
const INTEGRATION_ACCESS_CODE = import.meta.env.VITE_EGOV_INTEGRATION_ACCESS_CODE as string | undefined
const USE_MOCK = import.meta.env.VITE_EGOV_SSO_USE_MOCK !== "false"

let cachedToken: { token: string; expiresAt: Date } | null = null

async function getIntegrationToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > new Date()) {
    return cachedToken.token
  }

  if (!INTEGRATION_BASE_URL || !INTEGRATION_ACCESS_CODE) {
    throw new Error("Integration credentials not configured")
  }

  const res = await fetch(`${INTEGRATION_BASE_URL}/api/integration/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ access_code: INTEGRATION_ACCESS_CODE }),
  })

  if (!res.ok) throw new Error(`Integration token failed: ${res.status}`)

  const data = (await res.json()) as { access_token: string; expires_at: string }
  cachedToken = {
    token: data.access_token,
    expiresAt: new Date(data.expires_at),
  }
  return cachedToken.token
}

export async function requestOTP(email: string): Promise<{ already_verified: boolean }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    return { already_verified: false }
  }

  const token = await getIntegrationToken()
  const res = await fetch(`${INTEGRATION_BASE_URL}/api/integration/verify/request`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  })

  if (!res.ok) throw new Error(`OTP request failed: ${res.status}`)

  const data = (await res.json()) as { code: number; already_verified: boolean }
  return { already_verified: data.already_verified }
}

export async function confirmOTP(email: string, otp: string): Promise<boolean> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400))
    return otp === "323446"
  }

  const token = await getIntegrationToken()
  const res = await fetch(`${INTEGRATION_BASE_URL}/api/integration/verify/confirm`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, otp }),
  })

  if (!res.ok) throw new Error(`OTP confirmation failed: ${res.status}`)

  const data = (await res.json()) as { code: number }
  return data.code === 200
}

import { supabase } from './supabase'

export type DynamicQuestionItem = {
  question_text: string
  need_category?: string
}

export type SmsPushResult = {
  success: boolean
  status: number
  message?: string
  error?: string
}

export const SMS_HOTLINES_BLOCK =
  'EMG HOTLINES:\n' +
  '*911 (National)\n' +
  '*143 (Red Cross)\n' +
  '*(02)8911-1406 (NDRRMC)\n' +
  '*0917-724-3682 (Coast Guard)\n' +
  '*1555 (DOH Healthline)'

export function normalizeToE164(input: string): string | null {
  const cleaned = input.replace(/[\s\-()]/g, '')
  if (/^\+63\d{10}$/.test(cleaned)) return cleaned
  if (/^63\d{10}$/.test(cleaned)) return `+${cleaned}`
  if (/^0\d{10}$/.test(cleaned)) return `+63${cleaned.slice(1)}`
  if (/^9\d{9}$/.test(cleaned)) return `+63${cleaned}`
  return null
}

/**
 * Send SMS via Supabase Edge Function proxy.
 * Token never leaves the server — EMESSAGE_ACCESS_TOKEN is read from Deno.env.
 */
export async function sendSms(number: string, message: string): Promise<SmsPushResult> {
  const normalized = normalizeToE164(number)
  if (!normalized) {
    return { success: false, status: 422, error: `Invalid Philippine mobile number: ${number}` }
  }

  if (!supabase) {
    return { success: false, status: 0, error: 'Supabase client not initialised.' }
  }

  try {
    const { data, error } = await supabase.functions.invoke('egov', {
      body: { action: 'send-sms', payload: { number: normalized, message } },
    })

    if (error) {
      return { success: false, status: 0, error: error.message ?? 'Edge Function error' }
    }

    const result = data as { success?: boolean; status?: number; message?: string; error?: string }
    return {
      success: result.success ?? false,
      status: result.status ?? 0,
      message: result.message,
      error: result.error,
    }
  } catch (err) {
    return {
      success: false,
      status: 0,
      error: `SMS request failed: ${err instanceof Error ? err.message : 'network error'}`,
    }
  }
}

export async function broadcastSms(
  recipients: string[],
  message: string,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  let sent = 0
  let failed = 0
  const errors: string[] = []

  for (const recipient of recipients) {
    const result = await sendSms(recipient, message)
    if (result.success) sent++
    else {
      failed++
      if (result.error) errors.push(result.error)
    }
  }

  return { sent, failed, errors }
}

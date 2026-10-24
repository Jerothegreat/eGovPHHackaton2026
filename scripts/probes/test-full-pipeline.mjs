/**
 * eHANDA Full Integration Pipeline Test
 *
 * Tests the complete disaster alert → RDANA assessment → SMS broadcast → Telegram notification pipeline.
 * Uses real sample credentials for live-fire integration demonstration.
 *
 * Run:
 *   node --loader ts-node/esm scripts/probes/test-full-pipeline.mjs
 *   OR (plain node with built files):
 *   node scripts/probes/test-full-pipeline.mjs
 */

import 'dotenv/config'

// ─── Official PH Emergency Hotlines ──────────────────────────────────────────
// Shared constant across SMS, Telegram, and app UI — keep in sync with
// src/lib/emessage-sms-service.ts :: SMS_HOTLINES_BLOCK
const PH_HOTLINES_SMS =
  `EMG HOTLINES:\n` +
  `*911 (National)\n` +
  `*143 (Red Cross)\n` +
  `*(02)8911-1406 (NDRRMC)\n` +
  `*0917-724-3682 (Coast Guard)\n` +
  `*1555 (DOH Healthline)`

const PH_HOTLINES_TG =
  `📞 *Official PH Emergency Hotlines:*\n` +
  `• *911* — National Emergency\n` +
  `• *143 / (02) 8790-2300* — Philippine Red Cross\n` +
  `• *(02) 8911-1406* — NDRRMC Command Center\n` +
  `• *0917-724-3682* — Philippine Coast Guard Rescue\n` +
  `• *(02) 8284-0800* — PAGASA Weather Bureau\n` +
  `• *(02) 8931-8101* — DSWD Social Services\n` +
  `• *1555* — DOH Healthline`

// ─── Sample Integration Credentials ─────────────────────────────────────────
const EMESSAGE_BASE_URL = process.env.VITE_EMESSAGE_INTEGRATION_BASE_URL || 'https://ws-message.e.gov.ph'
const EMESSAGE_TOKEN = process.env.VITE_EMESSAGE_ACCESS_TOKEN || ''

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || ''
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

// ─── Sample Recipient (real verified number used for testing) ─────────────────
const SAMPLE_NUMBER = '+639702045579'
const SAMPLE_DISASTER = 'Typhoon Signal No. 4 — Coastal Storm Surge Warning'
const SAMPLE_BARANGAY = 'Brgy. 83 San Jose, Tacloban City'
const SAMPLE_MUNICIPALITY = 'Tacloban City, Leyte'

// ─── Normalizer ───────────────────────────────────────────────────────────────
function normalizeToE164(input) {
  const cleaned = input.replace(/[\s\-()]/g, '')
  if (/^\+63\d{10}$/.test(cleaned)) return cleaned
  if (/^63\d{10}$/.test(cleaned)) return `+${cleaned}`
  if (/^0\d{10}$/.test(cleaned)) return `+63${cleaned.slice(1)}`
  if (/^9\d{9}$/.test(cleaned)) return `+63${cleaned}`
  return null
}

// ─── eMessage SMS Push ────────────────────────────────────────────────────────
async function sendSms(number, message) {
  const normalized = normalizeToE164(number)
  if (!normalized) return { ok: false, error: `Invalid number: ${number}` }
  if (!EMESSAGE_TOKEN) return { ok: false, error: 'VITE_EMESSAGE_ACCESS_TOKEN not set' }

  const res = await fetch(`${EMESSAGE_BASE_URL}/messaging/v1/sms/push`, {
    method: 'POST',
    headers: { 'X-EMESSAGE-Auth': EMESSAGE_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ number: normalized, message }),
  })
  const body = await res.text()
  const rateLeft = res.headers.get('x-ratelimit-remaining')
  return { ok: res.status === 201, status: res.status, body, rateLeft }
}

// ─── Telegram Broadcast ───────────────────────────────────────────────────────
async function sendTelegramBroadcast(chatId, message, replyMarkup = null) {
  if (!TELEGRAM_BOT_TOKEN) return { ok: false, error: 'TELEGRAM_BOT_TOKEN not set' }

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {})
    }),
  })
  return await res.json()
}

// ─── Get Telegram Chat ID from last update ────────────────────────────────────
async function getTelegramChatId() {
  if (!TELEGRAM_BOT_TOKEN) return null
  const res = await fetch(`${TELEGRAM_API}/getUpdates`)
  const data = await res.json()
  if (data.ok && data.result.length > 0) {
    const last = data.result[data.result.length - 1]
    return last.message?.chat?.id || last.callback_query?.message?.chat?.id || null
  }
  return null
}

// ─── Full Pipeline ────────────────────────────────────────────────────────────
async function runFullPipeline() {
  console.log('====================================================================')
  console.log('eHANDA FULL INTEGRATION PIPELINE TEST')
  console.log('====================================================================\n')

  // ── Step 1: SMS Alert Broadcast ──────────────────────────────────────────────
  console.log('STEP 1 — eMessage SMS Broadcast')
  console.log(`  Target:   ${SAMPLE_NUMBER} (${SAMPLE_MUNICIPALITY})`)
  console.log(`  Disaster: ${SAMPLE_DISASTER}`)

  const smsMessage =
    `[eHANDA OFFICIAL EMERGENCY ALERT]\n` +
    `${SAMPLE_DISASTER}\n` +
    `Area: ${SAMPLE_BARANGAY}\n\n` +
    `Evacuation order active. If not able to answer via app/telegram due to internet/wifi constraints, send a text to the specified contact unit to have a deployed LGU unit come to your aid and do an offline registration for extensive relief recording:\n\n` +
    `*Barangay Desk: 0917-724-3682 / (02) 8911-1406\n\n` +
    PH_HOTLINES_SMS

  const smsResult = await sendSms(SAMPLE_NUMBER, smsMessage)
  if (smsResult.ok) {
    console.log(`  ✅ SMS delivered — Status: ${smsResult.status} | Rate limit remaining: ${smsResult.rateLeft}`)
  } else {
    console.log(`  ⚠️  SMS failed — ${smsResult.error || smsResult.body}`)
  }

  // ── Step 2: Telegram Notification ────────────────────────────────────────────
  console.log('\nSTEP 2 — Telegram Notification')
  const chatId = await getTelegramChatId() || '8619550367'
  if (chatId) {
    console.log(`  Telegram Chat ID found: ${chatId}`)
    const tgMessage =
      `🚨 *[eHANDA OFFICIAL EMERGENCY ALERT]*\n` +
      `*${SAMPLE_DISASTER}*\n` +
      `*Area:* ${SAMPLE_BARANGAY}\n\n` +
      `⚠️ Forced evacuation order in effect.\n\n` +
      `📋 *Household Needs Survey:*\n` +
      `• *Q1:* Do you have access to electricity?\n` +
      `• *Q2:* Is your family short on food supply (less than 3 days)?\n` +
      `• *Q3:* Does anyone in your household need medical attention?\n\n` +
      `👉 Reply text: \`HANDA YES NO YES\`\n` +
      `Or tap buttons in the bot\n\n` +
      PH_HOTLINES_TG

    const keyboard = {
      inline_keyboard: [
        [{ text: '📌 Q1: Do you have access to electricity?', callback_data: 'info_q_0' }],
        [{ text: '⚪ YES — Need Help', callback_data: 'set_yes_0' }, { text: '🟢 [ NO — SAFE ]', callback_data: 'set_no_0' }],
        [{ text: '📌 Q2: Short on food supply (<3 days)?', callback_data: 'info_q_1' }],
        [{ text: '⚪ YES — Need Help', callback_data: 'set_yes_1' }, { text: '🟢 [ NO — SAFE ]', callback_data: 'set_no_1' }],
        [{ text: '📌 Q3: Need medical attention?', callback_data: 'info_q_2' }],
        [{ text: '⚪ YES — Need Help', callback_data: 'set_yes_2' }, { text: '🟢 [ NO — SAFE ]', callback_data: 'set_no_2' }],
        [{ text: '✅ SUBMIT CHECK-IN TO BARANGAY', callback_data: 'submit_checkin' }],
        [{ text: '📞 Emergency Hotlines (911)', callback_data: 'show_hotlines' }],
      ]
    }

    const tgResult = await sendTelegramBroadcast(chatId, tgMessage, keyboard)
    if (tgResult.ok) {
      console.log(`  ✅ Telegram message with interactive buttons delivered to chat ${chatId}`)
    } else {
      console.log(`  ⚠️  Telegram failed:`, tgResult)
    }
  } else {
    console.log(`  ℹ️  No Telegram chat found yet — open @ehandaTest_bot and send /start first!`)
  }

  // ── Step 3: AI Citizen Triage SMS Parsing ────────────────────────────────────
  console.log('\nSTEP 3 — Simulated Citizen SMS Reply Parsing')
  const testReplies = [
    'HANDA YES YES NO',
    'HANDA OO OO HINDI',
    'HANDA YES NO YES',
    'YES YES NO',
  ]
  for (const reply of testReplies) {
    const upper = reply.toUpperCase().replace(/^(HANDA|CHECKIN)\s+/i, '').trim()
    const parts = upper.split(/\s+/)
    const shelter = parts[0] === 'YES' || parts[0] === 'OO'
    const food = parts[1] === 'YES' || parts[1] === 'OO'
    const medical = parts[2] === 'YES' || parts[2] === 'OO'
    console.log(`  Reply "${reply}" → Shelter: ${shelter}, Food: ${food}, Medical: ${medical}`)
  }

  console.log('\n====================================================================')
  console.log('Pipeline complete. Check your phone and Telegram for live results!')
  console.log('====================================================================')
}

runFullPipeline().catch(console.error)

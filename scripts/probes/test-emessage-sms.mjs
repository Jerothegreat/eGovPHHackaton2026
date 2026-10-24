/**
 * Test eMessage Push SMS API — sends a live test SMS!
 *
 * Usage:
 *   node scripts/probes/test-emessage-sms.mjs "+639171234567"
 *   node scripts/probes/test-emessage-sms.mjs "09171234567"
 */

import 'dotenv/config'

const EMESSAGE_BASE_URL = process.env.VITE_EMESSAGE_INTEGRATION_BASE_URL || 'https://ws-message.e.gov.ph'
const EMESSAGE_TOKEN = process.env.VITE_EMESSAGE_ACCESS_TOKEN || ''

const SMS_HOTLINES_BLOCK =
  `EMG HOTLINES:\n` +
  `*911 (National)\n` +
  `*143 (Red Cross)\n` +
  `*(02)8911-1406 (NDRRMC)\n` +
  `*0917-724-3682 (Coast Guard)\n` +
  `*1555 (DOH Healthline)`

// Sample: real number used for verification
const SAMPLE_RECIPIENT = '+639702045579'
const targetNumber = process.argv[2] || SAMPLE_RECIPIENT

if (!EMESSAGE_TOKEN) {
  console.error('❌ VITE_EMESSAGE_ACCESS_TOKEN is not set in .env')
  process.exit(1)
}

if (!targetNumber) {
  console.log(`
===================================================================
📱 eMessage SMS Test Script
-------------------------------------------------------------------
Usage:
  node scripts/probes/test-emessage-sms.mjs "+639XXXXXXXXX"
  node scripts/probes/test-emessage-sms.mjs "09XXXXXXXXX"

This sends a real SMS via the official eGovPH eMessage gateway.
===================================================================
`)
  process.exit(0)
}

// Normalize to E.164
function normalizeToE164(input) {
  const cleaned = input.replace(/[\s\-()]/g, '')
  if (/^\+63\d{10}$/.test(cleaned)) return cleaned
  if (/^63\d{10}$/.test(cleaned)) return `+${cleaned}`
  if (/^0\d{10}$/.test(cleaned)) return `+63${cleaned.slice(1)}`
  if (/^9\d{9}$/.test(cleaned)) return `+63${cleaned}`
  return null
}

const normalized = normalizeToE164(targetNumber)
if (!normalized) {
  console.error(`❌ Invalid phone number: "${targetNumber}". Use E.164 format like +639171234567 or 09171234567`)
  process.exit(1)
}

const message =
  `[eHANDA OFFICIAL EMERGENCY ALERT]\n` +
  `Typhoon Signal No. 4 — Storm Surge Warning\n` +
  `Area: Brgy. 83 San Jose, Tacloban City\n\n` +
  `Evacuation order is now in effect.\n` +
  `Report your household status:\n` +
  `Reply: HANDA YES YES NO\n` +
  `(1=Shelter 2=Food/Water 3=Medical)\n\n` +
  SMS_HOTLINES_BLOCK

console.log(`📱 Sending eMessage SMS to: ${normalized}`)
console.log(`📡 Gateway: ${EMESSAGE_BASE_URL}`)
console.log(`📨 Message:\n${message}\n`)
console.log('---')

try {
  const res = await fetch(`${EMESSAGE_BASE_URL}/messaging/v1/sms/push`, {
    method: 'POST',
    headers: {
      'X-EMESSAGE-Auth': EMESSAGE_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ number: normalized, message }),
  })

  const rateLimitRemaining = res.headers.get('x-ratelimit-remaining')
  const body = await res.text()

  console.log(`Status: ${res.status}`)
  console.log(`Rate Limit Remaining: ${rateLimitRemaining}`)
  console.log(`Response Body: ${body}`)

  if (res.status === 201) {
    console.log('\n✅ SMS successfully queued via eMessage! Check your phone.')
  } else {
    console.log(`\n⚠️  eMessage returned status ${res.status}. Check response above.`)
  }
} catch (err) {
  console.error('❌ Network error:', err.message)
}

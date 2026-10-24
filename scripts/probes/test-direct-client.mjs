import { config } from 'dotenv'
config()

const EGOV_AI_BASE = process.env.VITE_EGOV_AI_BASE_URL || 'https://egov-ai-core-ws.oueg.info'
const EGOV_AI_ACCESS_CODE = process.env.VITE_EGOV_AI_ACCESS_CODE || ''

let clientCachedToken = null

async function getLiveClientToken() {
  if (clientCachedToken && Date.now() < clientCachedToken.expiresAt - 60000) {
    return clientCachedToken.token
  }
  const res = await fetch(`${EGOV_AI_BASE}/api/v1/egov/integration/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_code: EGOV_AI_ACCESS_CODE }),
  })
  if (!res.ok) throw new Error(`Token error: ${res.status}`)
  const data = await res.json()
  const token = data.access_token
  const expiresInSeconds = data.expires_in_seconds || 172800
  clientCachedToken = {
    token,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  }
  return token
}

async function testAsk(prompt) {
  const token = await getLiveClientToken()
  const res = await fetch(`${EGOV_AI_BASE}/api/v1/egov/integration/ai_assistant/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, category: 'PH' }),
  })
  const data = await res.json()
  console.log('--- Direct Live eGov AI Ask Result ---')
  console.log('Source: egov_live')
  console.log('Data:', data.data)
  console.log('Session ID:', data.session_id)
}

async function testTranslate(prompt, target = 'fil', source = 'en') {
  const token = await getLiveClientToken()
  const res = await fetch(`${EGOV_AI_BASE}/api/v1/egov/integration/translator/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, source_lang: source, target_lang: target }),
  })
  const data = await res.json()
  console.log('\n--- Direct Live eGov AI Translate Result ---')
  console.log('Original:', data.original_prompt)
  console.log('Translated:', data.translated_prompt)
  console.log('Source:', 'egov_live')
}

async function run() {
  await testAsk('What emergency aid can I request during a flood in the Philippines?')
  await testTranslate('Evacuation orders are in effect. Please stay calm.')
}

run()

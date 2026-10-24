import { config } from 'dotenv'
config()

const ssoBase = process.env.VITE_EGOV_INTEGRATION_BASE_URL || 'https://hackathon-sso.e.gov.ph'
const integrationCode = process.env.VITE_EGOV_INTEGRATION_ACCESS_CODE
const aiCode = process.env.VITE_EGOV_AI_ACCESS_CODE

console.log('Testing eGov AI & Integration Authentication...')

async function testToken(code, name) {
  try {
    const res = await fetch(`${ssoBase}/api/v1/egov/integration/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_code: code })
    })
    console.log(`[${name}] Token status:`, res.status)
    const data = await res.json()
    console.log(`[${name}] Token result:`, data)
    return data?.access_token || data?.data?.access_token
  } catch (err) {
    console.error(`[${name}] Error:`, err.message)
  }
}

async function testIntegrationToken(code) {
  try {
    const res = await fetch(`${ssoBase}/api/integration/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_code: code })
    })
    console.log('[Standard Integration] Token status:', res.status)
    const data = await res.json()
    console.log('[Standard Integration] Token result:', data)
  } catch (err) {
    console.error('[Standard Integration] Error:', err.message)
  }
}

async function testLiveAIWithToken(token) {
  if (!token) return
  console.log('\nTesting live AI with token...')
  try {
    const res = await fetch(`${ssoBase}/api/v1/egov/integration/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: 'Give me 3 emergency safety steps during an earthquake.',
        session_id: 'test-session-123'
      })
    })
    console.log('Assistant status:', res.status)
    const data = await res.json()
    console.log('Assistant data:', data)
  } catch (err) {
    console.error('Assistant error:', err.message)
  }
}

async function run() {
  const token1 = await testToken(integrationCode, 'VITE_EGOV_INTEGRATION_ACCESS_CODE')
  const token2 = await testToken(aiCode, 'VITE_EGOV_AI_ACCESS_CODE')
  await testIntegrationToken(integrationCode)
  if (token1) await testLiveAIWithToken(token1)
  else if (token2) await testLiveAIWithToken(token2)
}

run()

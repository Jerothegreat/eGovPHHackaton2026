import { config } from 'dotenv'
config()

const baseUrl = 'https://egov-ai-core-ws.oueg.info'
const accessCode = process.env.VITE_EGOV_AI_ACCESS_CODE

async function testExactEndpoints() {
  console.log('1. Getting access token from:', `${baseUrl}/api/v1/egov/integration/token`)
  const tokenRes = await fetch(`${baseUrl}/api/v1/egov/integration/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_code: accessCode })
  })

  const tokenData = await tokenRes.json()
  console.log('Token response:', tokenData)
  const token = tokenData.access_token

  if (!token) {
    console.error('No token received')
    return
  }

  console.log('\n2. Testing AI Assistant at /api/v1/egov/integration/ai_assistant/generate...')
  try {
    const res = await fetch(`${baseUrl}/api/v1/egov/integration/ai_assistant/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: 'What are the emergency hotlines in the Philippines for disaster response?',
        category: 'PH'
      })
    })
    console.log('Assistant status:', res.status, res.statusText)
    const data = await res.text()
    console.log('Assistant response body:', data)
  } catch (err) {
    console.error('Assistant error:', err.message)
  }

  console.log('\n3. Testing Translator at /api/v1/egov/integration/translator/generate...')
  try {
    const res = await fetch(`${baseUrl}/api/v1/egov/integration/translator/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: 'Emergency evacuation is in progress. Please proceed to the designated evacuation center.',
        source_lang: 'en',
        target_lang: 'fil'
      })
    })
    console.log('Translator status:', res.status, res.statusText)
    const data = await res.text()
    console.log('Translator response body:', data)
  } catch (err) {
    console.error('Translator error:', err.message)
  }
}

testExactEndpoints()

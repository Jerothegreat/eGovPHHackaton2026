import { config } from 'dotenv'
config()

const baseUrl = 'https://egov-ai-core-ws.oueg.info'
const accessCode = process.env.VITE_EGOV_AI_ACCESS_CODE

async function probeAllWithToken() {
  const tokenRes = await fetch(`${baseUrl}/api/v1/egov/integration/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_code: accessCode })
  })
  const tokenData = await tokenRes.json()
  const token = tokenData.access_token
  console.log('Got token:', token)

  const paths = [
    '/api/v1/egov/assistant',
    '/api/v1/egov/translate',
    '/api/v1/egov/credits',
    '/api/v1/assistant',
    '/api/v1/translate',
    '/api/v1/credits',
    '/api/v1/chat',
    '/api/v1/egov/integration/chat',
    '/api/v1/egov/integration/completions',
    '/api/v1/egov/integration/ask',
    '/api/assistant',
    '/api/translate',
    '/api/credits',
    '/assistant',
    '/translate',
    '/credits'
  ]

  for (const path of paths) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: 'What are the safety steps during an earthquake?',
          session_id: 'test-123',
          source_lang: 'en',
          target_lang: 'fil'
        })
      })
      console.log(`POST ${path} -> Status:`, res.status)
      if (res.status !== 404) {
        const data = await res.text()
        console.log(` >>> HIT ${path}:`, data)
      }
    } catch (e) {
      console.log(`ERR ${path}:`, e.message)
    }
  }
}

probeAllWithToken()

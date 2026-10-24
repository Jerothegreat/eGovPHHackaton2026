import { config } from 'dotenv'
config()

const aiBase = 'https://egov-ai-core-ws.oueg.info'
const accessCode = process.env.VITE_EGOV_AI_ACCESS_CODE

console.log('Probing eGov AI API POST routes with access code:', accessCode?.slice(0, 10) + '...')

const candidatePaths = [
  '/token',
  '/auth/token',
  '/v1/token',
  '/api/v1/token',
  '/api/v1/egov/integration/token',
  '/translate',
  '/v1/translate',
  '/api/v1/translate',
  '/assistant',
  '/v1/assistant',
  '/api/v1/assistant',
  '/chat',
  '/v1/chat',
  '/api/v1/chat',
  '/v1/chat/completions',
  '/credits',
  '/v1/credits'
]

async function testPost() {
  for (const path of candidatePaths) {
    try {
      const res = await fetch(`${aiBase}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessCode}`,
          'x-access-code': accessCode,
          'x-api-key': accessCode
        },
        body: JSON.stringify({
          access_code: accessCode,
          prompt: 'Hello disaster response test',
          text: 'Hello disaster response test',
          messages: [{ role: 'user', content: 'Hello' }],
          source_lang: 'en',
          target_lang: 'fil'
        })
      })
      console.log(`POST ${path} -> Status:`, res.status, res.statusText)
      const text = await res.text()
      if (res.status !== 404) {
        console.log(` -> Body [${path}]:`, text.slice(0, 400))
      }
    } catch (err) {
      console.log(`POST ${path} ERR:`, err.message)
    }
  }
}

testPost()

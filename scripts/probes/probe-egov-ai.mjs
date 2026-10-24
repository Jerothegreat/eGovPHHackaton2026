import { config } from 'dotenv'
config()

const aiBase = 'https://egov-ai-core-ws.oueg.info'
const accessCode = process.env.VITE_EGOV_AI_ACCESS_CODE

console.log('Testing eGov AI Core endpoints at:', aiBase)

const testEndpoints = [
  '/',
  '/api',
  '/api/v1',
  '/api/v1/token',
  '/api/token',
  '/token',
  '/api/v1/translate',
  '/api/v1/assistant',
  '/docs',
  '/swagger',
  '/openapi.json'
]

async function probe() {
  for (const ep of testEndpoints) {
    try {
      const res = await fetch(`${aiBase}${ep}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessCode}`,
          'x-access-code': accessCode
        }
      })
      console.log(`GET ${ep}:`, res.status, res.statusText)
      if (res.status !== 404) {
        const text = await res.text()
        console.log(' -> Body:', text.slice(0, 300))
      }
    } catch (err) {
      console.log(`GET ${ep} ERR:`, err.message)
    }
  }
}

probe()

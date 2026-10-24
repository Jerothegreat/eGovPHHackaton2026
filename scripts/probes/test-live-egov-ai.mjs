import { config } from 'dotenv'
config()

const aiBase = 'https://egov-ai-core-ws.oueg.info/api/v1/egov/integration'
const accessCode = process.env.VITE_EGOV_AI_ACCESS_CODE

async function testLiveEgovAI() {
  console.log('1. Getting live access token from eGov AI...')
  const tokenRes = await fetch(`${aiBase}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_code: accessCode })
  })

  const tokenData = await tokenRes.json()
  console.log('Token response:', tokenData)
  const token = tokenData.access_token

  if (!token) {
    console.error('Failed to get token')
    return
  }

  console.log('\n2. Testing eGov AI Assistant with prompt...')
  const assistantRes = await fetch(`${aiBase}/assistant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      prompt: 'What are the top 3 emergency steps during an earthquake in the Philippines?',
      session_id: 'test-session-' + Date.now()
    })
  })
  console.log('Assistant status:', assistantRes.status)
  const assistantData = await assistantRes.json()
  console.log('Assistant response:', JSON.stringify(assistantData, null, 2))

  console.log('\n3. Testing eGov AI Dialect Translation (English -> Tagalog/Filipino)...')
  const transRes = await fetch(`${aiBase}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      prompt: 'Emergency evacuation is now in effect for all coastal barangays.',
      source_lang: 'en',
      target_lang: 'fil'
    })
  })
  console.log('Translation status:', transRes.status)
  const transData = await transRes.json()
  console.log('Translation response:', JSON.stringify(transData, null, 2))

  console.log('\n4. Testing eGov AI Credits...')
  const credRes = await fetch(`${aiBase}/credits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({})
  })
  console.log('Credits status:', credRes.status)
  const credData = await credRes.json()
  console.log('Credits response:', JSON.stringify(credData, null, 2))
}

testLiveEgovAI()

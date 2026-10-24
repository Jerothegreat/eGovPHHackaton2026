import { buildGroundingPrompt } from '../../src/features/alerts/rdana-framework.ts'

console.log('====================================================')
console.log('TESTING DYNAMIC RDANA PROMPT GENERATION')
console.log('====================================================\n')

const eventType = 'earthquake'
const severity = 'Extreme'
const headline = 'Magnitude 7.8 Earthquake – Offshore Maasim, Sarangani Province'

const prompt = buildGroundingPrompt(eventType, severity, headline)
console.log('Generated RDANA System Prompt sent to AI:\n')
console.log(prompt)
console.log('\n====================================================\n')

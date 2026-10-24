import 'dotenv/config'

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`

async function sendTelegramMessage(chatId, text, replyMarkup) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      ...(replyMarkup ? { reply_markup: replyMarkup } : {})
    }),
  })
  return await res.json()
}

async function testDispatch() {
  console.log('Testing alert dispatch to Telegram and SMS...')

  const questions = [
    { question_text: 'Do you have access to electricity & utilities?', need_category: 'utilities' },
    { question_text: 'Is your family short on food supply (less than 3 days)?', need_category: 'food_water' },
    { question_text: 'Does anyone in your household need medical attention?', need_category: 'medical' },
  ]

  const titleDisplay = 'Magnitude 7.8 Earthquake — Offshore Maasim'
  const cleanBarangay = 'Poblacion'
  const cleanMunicipality = 'City Of Alaminos'

  const keyboardRows = []
  questions.forEach((q, idx) => {
    const shortText = q.question_text.length > 36 ? q.question_text.slice(0, 33) + '...' : q.question_text
    keyboardRows.push([
      { text: `📌 Q${idx + 1}: ${shortText}`, callback_data: `info_q_${idx}` },
    ])
    keyboardRows.push([
      { text: '⚪ YES — Need Help', callback_data: `set_yes_${idx}` },
      { text: '🟢 [ NO — SAFE ]', callback_data: `set_no_${idx}` },
    ])
  })
  keyboardRows.push([{ text: '✅ SUBMIT CHECK-IN TO BARANGAY', callback_data: 'submit_checkin' }])
  keyboardRows.push([{ text: '📞 Emergency Hotlines (911)', callback_data: 'show_hotlines' }])

  const questionsListText = '\n📋 *Household Needs Survey:*\n' +
    questions.map((q, idx) => `• *Q${idx + 1}:* ${q.question_text}`).join('\n') +
    `\n\n👉 Reply text: \`HANDA YES NO YES\`\n` +
    `Or tap the *YES / NO* buttons below:\n\n`

  const tgMessage =
    `🚨 *[eHANDA OFFICIAL EMERGENCY ALERT]*\n` +
    `*${titleDisplay}*\n` +
    `*Area:* ${cleanBarangay}, ${cleanMunicipality}\n\n` +
    `⚠️ Forced evacuation order in effect.\n` +
    questionsListText +
    `📞 *Official Emergency Hotlines:*\n` +
    `• *911* (National Emergency) • *143* (Red Cross)\n` +
    `• *(02) 8911-1406* (NDRRMC) • *0917-724-3682* (Coast Guard)`

  const chatId = 8619550367
  const tgRes = await sendTelegramMessage(chatId, tgMessage, { inline_keyboard: keyboardRows })
  console.log('Telegram API result:', tgRes)
}

testDispatch()

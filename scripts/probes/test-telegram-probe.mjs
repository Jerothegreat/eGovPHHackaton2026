import 'dotenv/config'

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`

async function probe() {
  console.log('--- Probing Telegram Bot ---')
  const meRes = await fetch(`${TELEGRAM_API}/getMe`)
  const me = await meRes.json()
  console.log('Bot Info:', me)

  const updatesRes = await fetch(`${TELEGRAM_API}/getUpdates`)
  const updates = await updatesRes.json()
  console.log('Recent Updates (Chats):', JSON.stringify(updates, null, 2))

  if (updates.ok && updates.result && updates.result.length > 0) {
    const lastUpdate = updates.result[updates.result.length - 1]
    const chatId = lastUpdate.message?.chat?.id || lastUpdate.callback_query?.message?.chat?.id
    if (chatId) {
      console.log(`Sending live test message to chat ID: ${chatId}...`)
      const sendRes = await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `🚨 *[eHANDA EMERGENCY ALERT — SYSTEM TEST]*\n\n` +
            `Hello! Your Telegram bot is *successfully connected and working* with eHANDA! ✅\n\n` +
            `*Disaster Event:* Typhoon Signal No. 4 Coastal Surge Warning\n` +
            `*Location:* Tacloban City, Leyte (Brgy. 83 San Jose)\n\n` +
            `You can reply:\n` +
            `👉 \`HANDA YES YES NO\` to submit a household check-in, or ask any disaster safety question!`,
          parse_mode: 'Markdown',
        }),
      })
      const sent = await sendRes.json()
      console.log('Send Result:', sent)
    }
  } else {
    console.log('No users have clicked /start yet in the bot. Please send /start to your bot in Telegram so it gets your chat ID!')
  }
}

probe()

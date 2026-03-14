export async function POST(request) {
    try {
      const { photoUrl, caption, uploadedAt } = await request.json()
  
      const token  = process.env.TELEGRAM_BOT_TOKEN
      const chatId = process.env.TELEGRAM_CHAT_ID
  
      const date = new Date(uploadedAt).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        month:    'long',
        day:      'numeric',
        year:     'numeric',
        hour:     '2-digit',
        minute:   '2-digit',
      })
  
      const message = [
        '🎀 *Deidree uploaded a photo!*',
        '',
        caption ? `✏️ _"${caption}"_` : '📷 No caption',
        `🕐 ${date}`,
        '',
        '💗 Open the app to see it!',
      ].join('\n')
  
      // try sending photo first
      const res = await fetch(
        `https://api.telegram.org/bot${token}/sendPhoto`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id:    chatId,
            photo:      photoUrl,
            caption:    message,
            parse_mode: 'Markdown',
          }),
        }
      )
  
      const data = await res.json()
  
      // if photo fails, send text only
      if (!data.ok) {
        await fetch(
          `https://api.telegram.org/bot${token}/sendMessage`,
          {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id:    chatId,
              text:       message + `\n\n🔗 ${photoUrl}`,
              parse_mode: 'Markdown',
            }),
          }
        )
      }
  
      return Response.json({ success: true })
    } catch (err) {
      console.error('Telegram notify error:', err)
      return Response.json({ success: false, error: err.message }, { status: 500 })
    }
  }
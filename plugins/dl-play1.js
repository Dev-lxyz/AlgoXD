import fetch from 'node-fetch'

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text?.trim()) return conn.reply(m.chat, `*🌾 Ingrese el nombre en una música.*\n✿ Ejemplo: *${usedPrefix + command} diles - Bad Bunny*`, m)

  try {
    await m.react("🕐")
    let s = await (await fetch(`${api.url}/search/yt-search?q=${encodeURIComponent(text)}`)).json()
    let d = s.result
    if (!s.status || !d) return conn.reply(m.chat, "✿ No se encontraron resultados.", m)

    let caption = `*「✦」 Descargando » ${d.title}*

*✐ Canal ›* ${d.author}
*ⴵ Duración ›* ${d.duration}
*ꕥ Vistas ›* ${d.views}
*✰ Publicado ›* ${d.uploaded}

> \`\`\`🍬 Iniciando descarga, espere un momento.\`\`\``

    await conn.sendMessage(m.chat, {
      text: caption,
      linkPreview: d.thumbnail ? (await gojo(
        { image: { url: d.thumbnail } },
        { upload: conn.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }
      ).then(({ imageMessage }) => ({
        'canonical-url': d.url,
        'matched-text': d.url,
        title: `𖹭  ׄ  ְ 🍁 Y O U T U B E   ݁      ✩   ݂      ݁  `,
        description: botname,
        jpegThumbnail: imageMessage?.jpegThumbnail ? Buffer.from(imageMessage.jpegThumbnail) : undefined,
        highQualityThumbnail: imageMessage || undefined
      }))) : undefined,
      contextInfo: {
        mentionedJid: [m.sender],
        isForwarded: false
      }
    }, { quoted: m })

    if (command === 'playvideo') {
      let api2 = await (await fetch(`${api.url}/download/ytdl?url=${d.url}&format=mp4`)).json()
      let dl = api2.data?.download
      if (!dl) throw new Error("No se pudo obtener el enlace")

      await conn.sendFile(m.chat, dl, `${d.title}.mp4`, `*» Título:* ${d.title}`, m, null, {
        asDocument: true,
        mimetype: 'video/mp4'
      })

    } else {
      let api2 = await (await fetch(`${api.url}/download/savetube?url=${d.url}&type=audio`)).json()
      let dl = api2.data?.dl
      if (!dl) throw new Error("No se pudo obtener el enlace")

      await conn.sendMessage(m.chat, {
        audio: { url: dl },
        mimetype: 'audio/ogg; codecs=opus',
        fileName: `${d.title}.ogg`,
        ptt: false
      }, { quoted: m })
    }
    await m.react("✔️")
  } catch (e) {
    conn.reply(m.chat, `✿ Error: ${e.message}`, m)
  }
}

handler.command = ['playaudio', 'playvideo']
handler.tags = ['download']
handler.help = ['playaudio <query>', 'playvideo <query>']
handler.group = true
export default handler
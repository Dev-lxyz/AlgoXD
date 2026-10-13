import fetch from 'node-fetch'
import yts from 'yt-search'

function durationToSeconds(str) {
  if (!str) return 0
  const parts = String(str).split(':').map(n => parseInt(n, 10))
  if (parts.some(isNaN)) return 0
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

let handler = async (m, { conn, text, command }) => {
  try {
    if (!text?.trim())
      return conn.reply(m.chat, `《✧》Por favor, menciona el nombre o URL del video que deseas descargar`, m)

    const searchRes = await yts(text)
    if (!searchRes.videos || !searchRes.videos.length)
      throw 'No se encontraron resultados.'

    const video = searchRes.videos[0]
    const formatViews = (views) => views.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

    const seconds = durationToSeconds(video.timestamp)
    if (seconds > 3600) {
      return conn.reply(m.chat, `《✧》 El video dura *${video.timestamp}* y supera el límite de *1 hora*.`, m)
    }

    await conn.sendMessage(m.chat, {
      text: ` *｡ Título :* ${video.title}
 *｡ Author :* ${video.author?.name || 'Desconocido'}
 *｡ Vistas :* ${formatViews(video.views)}
 *｡ Duración :* ${video.timestamp}
 *｡ Publicado :* ${video.ago || '```'}
 *｡ Enlace :* ${video.url} 
     
      _🎋 Descargando Video..._
      `,
      linkPreview: video.thumbnail ? (await gojo(
        { image: { url: video.thumbnail } },
        { upload: conn.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }
      ).then(({ imageMessage }) => ({
        'canonical-url': video.url,
        'matched-text': video.url,
        title: `𖹭  ׄ  ְ 🍡 Y O U T U B E - M U S I C   ݁      ✩   ݂      ݁  `,
        description: botname,
        jpegThumbnail: imageMessage?.jpegThumbnail ? Buffer.from(imageMessage.jpegThumbnail) : undefined,
        highQualityThumbnail: imageMessage || undefined
      }))) : undefined,
      contextInfo: {
        mentionedJid: [m.sender],
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: channelRD.id,
          serverMessageId: '',
          newsletterName: channelRD.name
        },
      }
    }, { quoted: m })

    let dl = null
    let title = video.title
    let quality = 'N/A'
    let resolution = ''
    let server = 'N/A'
    try {
      const dlJson = await fetch(
        `${global.api.url}/download/ytmp4?url=${encodeURIComponent(video.url)}`
      ).then(r => r.json())

      const d = dlJson?.data?.download
      if (d?.url) {
        dl = { url: d.url }
        title = dlJson.data.title || video.title
        quality = d.quality || d.label || 'N/A'
        resolution = d.resolution ? ` (${d.resolution})` : ''
        server = '1'
      }
    } catch (err) {
      console.log('⚠️ Principal falló:', err.message)
    }

    if (!dl?.url) {
      try {
        const altJson = await fetch(
          `${global.api.url}/download/aio/v3?url=${encodeURIComponent(video.url)}`
        ).then(r => r.json())

        const a = altJson?.data
        if (a?.url) {
          dl = { url: a.url }
          title = a.title && a.title !== 'Media' ? a.title : video.title
          quality = a.quality || 'N/A'
          resolution = ''
          server = '2'
        }
      } catch (err) {
        console.log('⚠️ Respaldo falló:', err.message)
      }
    }

    if (!dl?.url) throw 'No se pudo obtener el enlace de descarga en ningún servidor.'

    const videoBuffer = await fetch(dl.url).then(r => r.buffer())
    const fileSize = videoBuffer.length / (1024 * 1024)

    const sizeMb = fileSize.toFixed(2)
    const caption = `    -ˏ͛⑅🍜.⃟꩜‹— 𝗬𝗢𝗨𝗧𝗨𝗕𝗘 𝗠𝗣𝟰  ˚₊·—̳͟͞͞♡ 
 ᰔ ִ ׄ *Título:* ${title}
 ᰔ ִ ׄ *Calidad:* ${quality}${resolution}
 ᰔ ִ ׄ *Peso:* ${sizeMb} MB
 ᰔ ִ ׄ *Server:* ${server}`

    const fileName = `${title}.mp4`
    await conn.sendFile(m.chat, videoBuffer, fileName, caption, m)

    await m.react('✔️')
  } catch (e) {
    conn.reply(m.chat, ` Error:\n${e}`, m)
  }
}

handler.command = ['play2', 'video', 'mp4']
handler.tags = ['download']
handler.help = ['play2 + <query/url>']
handler.group = true
export default handler
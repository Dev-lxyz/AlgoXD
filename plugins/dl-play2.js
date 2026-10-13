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

function isYoutubeUrl(str) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\//i.test(str.trim())
}

async function tryServer1(url) {
  const dlJson = await fetch(
    `${global.api.url}/download/ytmp4?url=${encodeURIComponent(url)}`
  ).then(r => r.json())

  const d = dlJson?.data?.download
  if (!d?.url) throw new Error('Server 1 sin URL')

  const buffer = await fetch(d.url).then(r => {
    if (!r.ok) throw new Error(`Server 1 download HTTP ${r.status}`)
    return r.buffer()
  })

  return {
    buffer,
    title: dlJson.data.title || 'YouTube Video',
    quality: d.quality || d.label || 'N/A',
    resolution: d.resolution ? ` (${d.resolution})` : '',
    server: '1'
  }
}

async function tryServer2(url) {
  const altJson = await fetch(
    `${global.api.url}/download/aio/v3?url=${encodeURIComponent(url)}`
  ).then(r => r.json())

  const a = altJson?.data
  if (!a?.url) throw new Error('Server 2 sin URL')

  const buffer = await fetch(a.url).then(r => {
    if (!r.ok) throw new Error(`Server 2 download HTTP ${r.status}`)
    return r.buffer()
  })

  return {
    buffer,
    title: a.title && a.title !== 'Media' ? a.title : 'YouTube Video',
    quality: a.quality || 'N/A',
    resolution: '',
    server: '2'
  }
}

let handler = async (m, { conn, text, command }) => {
  try {
    if (!text?.trim())
      return conn.reply(m.chat, `《✧》Por favor, menciona el nombre o URL del video que deseas descargar`, m)

    let video = null

    if (isYoutubeUrl(text)) {
      video = {
        title: 'YouTube Video',
        author: { name: 'Desconocido' },
        views: 0,
        timestamp: '0:00',
        ago: 'N/A',
        url: text.trim(),
        thumbnail: null
      }
    } else {
      const searchRes = await yts(text)
      if (!searchRes.videos || !searchRes.videos.length)
        throw 'No se encontraron resultados.'
      video = searchRes.videos[0]
    }

    const formatViews = (views) => views.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

    if (video.timestamp && video.timestamp !== '0:00') {
      const seconds = durationToSeconds(video.timestamp)
      if (seconds > 3600) {
        return conn.reply(m.chat, `《✧》 El video dura *${video.timestamp}* y supera el límite de *1 hora*.`, m)
      }
    }

    const infoCaption = ` *｡ Título :* ${video.title}
 *｡ Author :* ${video.author?.name || 'Desconocido'}
 *｡ Vistas :* ${video.views ? formatViews(video.views) : 'N/A'}
 *｡ Duración :* ${video.timestamp || 'N/A'}
 *｡ Publicado :* ${video.ago || 'N/A'}
 *｡ Enlace :* ${video.url} 
 
      _🎋 Descargando Video..._`

    if (video.thumbnail) {
      await conn.sendMessage(m.chat, {
        image: { url: video.thumbnail },
        caption: infoCaption
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { text: infoCaption }, { quoted: m })
    }

    let result = null

    try {
      result = await tryServer1(video.url)
    } catch (err) {
      console.log('⚠️ Server 1 falló:', err.message)
    }

    if (!result) {
      try {
        result = await tryServer2(video.url)
      } catch (err) {
        console.log('⚠️ Server 2 falló:', err.message)
      }
    }

    if (!result) throw 'No se pudo obtener el video en ningún servidor.'

    const { buffer: videoBuffer, title, quality, resolution, server } = result
    const fileSize = videoBuffer.length / (1024 * 1024)
    const sizeMb = fileSize.toFixed(2)

    const caption = `    -ˏ͛⑅🍜.⃟꩜‹— 𝗬𝗢𝗨𝗧𝗨𝗕𝗘 𝗠𝗣𝟰  ˚₊·—̳͟͞͞♡ 
 ᰔ ִ ׄ *Título:* ${title}
 ᰔ ִ ׄ *Calidad:* ${quality}${resolution}
 ᰔ ִ ׄ *Peso:* ${sizeMb} MB
 ᰔ ִ ׄ *Server:* ${server}`

    const fileName = `${title}.mp4`

    if (fileSize > 150) {
      await conn.sendMessage(m.chat, {
        document: videoBuffer,
        mimetype: 'video/mp4',
        fileName,
        caption
      }, { quoted: m })
    } else {
      await conn.sendFile(m.chat, videoBuffer, fileName, caption, m)
    }

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
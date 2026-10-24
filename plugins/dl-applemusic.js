import fetch from "node-fetch"

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text?.trim()) return conn.reply(m.chat, "✿ *Por favor, proporciona el nombre de una canción o artista.*", m)
  try {
    const s = await (await fetch(`${api.url}/search/applemusic?q=${encodeURIComponent(text)}&limit=1`)).json()
    if (!s.status || !s.results?.length) throw "Sin resultados"
    const song = s.results[0]

    await conn.sendMessage(m.chat, {
      image: { url: song.cover },
      caption: `   *｡ Título ›* ${song.title}
   *｡ Artista ›* ${song.artist}
   *｡ Álbum ›* ${song.album}
   *｡ Género ›* ${song.genre}
   *｡ Duración ›* ${song.duration}
   *｡ Fecha ›* ${song.release_date}
   *｡ Enlace ›* ${song.link}
    
> 🕸️ Descargando audio... `
    }, { quoted: m })

    const d = await (await fetch(`${api.url}/download/aplmate?url=${song.link}`)).json()
    await conn.sendMessage(m.chat, { audio: { url: d.data.downloads[0].url }, mimetype: "audio/mpeg" }, { quoted: m })
  } catch (e) {
    conn.reply(m.chat, `> ✿︎ An unexpected error occurred while executing command *${usedPrefix + command}*.\n> *[Error: ${e.message || e}]*`, m)
  }
}
handler.command = ["apple", "applemusic", "apl"]
handler.tags = ["download"]
handler.help = ["apple *« ǫᴜᴇʀʏ »*"]
handler.group = true

export default handler
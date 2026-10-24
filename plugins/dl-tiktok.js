import fetch from 'node-fetch'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) return m.reply(`*ꕥ Por favor, ingresa un término de búsqueda o el enlace de TikTok.*`)
  
  let url = args[0]
  if (!/tiktok\.com/.test(url)) return m.reply('ingrese un link de tiktok válido.')

  try {
    await m.reply('➪ Descargando video de TikTok.')
    let api = `${api.url}/download/tiktok?url=${encodeURIComponent(url)}`
    let res = await fetch(api)
    let json = await res.json()
    if (!json.status) throw 'ꕥ Enlace inválido o sin contenido descargable.'

    let d = json.data
    let cap = `    *乂 TIKTOK - INFO 乂*

   *｡ Título ›* ${d.title || 'Sin título'}
   *｡ Author ›* ${d.author.name} (@${d.author.username})
   *｡ Duración ›* ${d.duration}
   *｡ Tamaño ›* ${d.size}
  
   *｡ likes ›* ${d.likes}
   *｡ comments ›* ${d.comments}
   *｡ views ›* ${d.views}
   *｡ favorites ›* ${d.favorites}
   *｡ shares ›* ${d.shares}
   *｡ downloads ›* ${d.downloads}
   
   *｡ Audio ›* ${d.audio}
   *｡ Fecha ›* ${d.region}
   *｡ Enlace ›* ${d.link}`.trim()

    await conn.sendFile(m.chat, d.download, 'tiktok.mp4', cap, m)
  } catch (e) {
    m.reply(`> ✿︎ An unexpected error occurred while executing command *${usedPrefix + command}*.\n> *[Error: ${e.message}]*`)
  }
}

handler.help = ['tiktok', 'tt']
handler.tags = ['download', 'search']
handler.command = ['tiktok', 'tt', 'tiktoks', 'tts']
handler.group = true

export default handler
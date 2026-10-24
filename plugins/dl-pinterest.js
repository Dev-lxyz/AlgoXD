import fetch from 'node-fetch'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!args[0]) return m.reply(`*ꕥ Por favor, ingresa un término de búsqueda o el enlace de Pinterest.*`)

  let q = args.join(' ')
  await m.reply(`🍄 *Buscando:* ${q}`)
  try {
    let api = `${api.url}/search/pinterest?q=${encodeURIComponent(q)}`
    let res = await fetch(api)
    let json = await res.json()
    if (!json.status || !json.result?.images?.length) throw 'No se encontraron imágenes'
    let images = json.result.images.slice(0, 10)
    let medias = images.map((url, i) => ({
      image: { url: url },
      caption: i === 0 ? `*乂 PINTEREST - ${q.toUpperCase()} 乂*\n\n*• Total:* ${json.count || images.length}\n*• Búsqueda:* ${q}` : ''
    }))

    if (conn.sendAlbumMessage) {
      await conn.sendAlbumMessage(m.chat, medias, { quoted: m })
    } else {
      for (let media of medias) {
        await conn.sendMessage(m.chat, media, { quoted: m })
        await new Promise(r => setTimeout(r, 100))
      }
    }
  } catch (e) {
    m.reply(`> ✿︎ An unexpected error occurred while executing command *${usedPrefix + command}*.\n> *[Error: ${e.message}]*`)
  }
}

handler.help = ['pinterest']
handler.command = ['pinterest', 'pin']
handler.tags = ["download"]
handler.group = true

export default handler
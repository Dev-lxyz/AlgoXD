import fetch from 'node-fetch'
import { prepareWAMessageMedia } from '@whiskeysockets/baileys'

let handler = async (m, { conn, usedPrefix }) => {
  try {
    let userId = m.mentionedJid?.[0] || m.sender
    let _uptime = process.uptime() * 1000
    let uptime = clockString(_uptime)

    let totalreg = global.db?.data?.users ? Object.keys(global.db.data.users).length : 0
    let totalCommands = global.plugins ? Object.keys(global.plugins).length : 0
    let groupsCount = Object.values(conn.chats || {}).filter(v => v?.id?.endsWith('@g.us')).length

    let mediaList = [
      'https://raw.githubusercontent.com/Dev-lxyz/file/main/files/b6kxa.mp4',
      'https://raw.githubusercontent.com/Dev-lxyz/file/main/files/adcs8.jpeg'
    ]

    let banner = mediaList[Math.floor(Math.random() * mediaList.length)]

    let grupos = {}
    for (let plugin of Object.values(global.plugins || {})) {
      if (!plugin.help || !plugin.tags) continue
      let helps = Array.isArray(plugin.help) ? plugin.help : [plugin.help]
      let tags = Array.isArray(plugin.tags) ? plugin.tags : [plugin.tags]

      for (let tag of tags) {
        if (!grupos[tag]) grupos[tag] = []
        for (let help of helps) {
          if (typeof help === 'string' && /^\$|^=>|^>/.test(help)) continue
          grupos[tag].push(`${usedPrefix}${help}`)
        }
      }
    }

    for (let tag in grupos) {
      grupos[tag].sort((a, b) => a.localeCompare(b))
    }

    const secciones = Object.entries(grupos).map(([tag, cmds]) => {
      return `   ⎯       *【  _${tag.toUpperCase()}_ 】*\n`
        + cmds.map(cmd => `*│  °* ${cmd}`).join('\n')
        + `\n*╰─┈⟢*`
    }).join('\n\n')

    const isMainBot = global.conn?.user?.jid
      ? conn.user.jid == global.conn.user.jid
      : true

    let menu = `   *╭ 𖧷۪۪ᰰ⃟ːֱ۪۪۪۪۪۪۪۪፝͜͜͡͡❏▭ֹ▭ֹ▭ֹ²⁰²⁶▭ֹ▭ֹ▭ֹ𖧷۪۪ᰰ⃟ːֱ۪۪۪۪۪۪۪۪፝͜͜͡͡✿╮*
      ⚝ Welcome to! ${global.namebot || 'Bot'} ✧͏
   *╰𖧷۪۪ᰰ⃟ːֱ۪۪۪۪۪۪۪۪፝͜͜͡͡❏▭ֹ▭ֹ▭ֹ²⁰²⁶▭ֹ▭ֹ▭ֹ𖧷۪۪ᰰ⃟ːֱ۪۪۪۪۪۪۪۪፝͜͜͡͡✿*

   *𑄝 𝚃𝙸𝙴𝙼𝙿𝙾 𝙰𝙲𝚃𝙸𝚅𝙾 ──* ${uptime}
   *𑄝 𝚃𝚈𝙿𝙴 ──* ${isMainBot ? 'Bot Principal' : 'Sub-Bot'}
   *𑄝 𝚄𝚂𝚄𝙰𝚁𝙸𝙾𝚂 ──* ${totalreg}
   *𑄝 𝙶𝚁𝚄𝙿𝙾𝚂 ──* ${groupsCount}
   *𑄝 𝙲𝙾𝙼𝙰𝙽𝙳𝙾𝚂 ──* ${totalCommands}
   ￣￣￣￣￣￣￣￣￣￣￣

${secciones}`.trim()

    let isVideo = banner.endsWith('.mp4') || banner.endsWith('.webm')

    let linkPreview = (!isVideo && banner) ? (await prepareWAMessageMedia(
      { image: { url: banner } },
      { upload: conn.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }
    ).then(({ imageMessage }) => ({
      'canonical-url': global.api?.url || '',
      'matched-text': global.api?.url || '',
      title: global.botname || global.namebot || 'Bot',
      description: global.dev || '© Dev',
      jpegThumbnail: imageMessage?.jpegThumbnail ? Buffer.from(imageMessage.jpegThumbnail) : undefined,
      highQualityThumbnail: imageMessage || undefined
    }))) : undefined

    // ✅ Newsletter con fallback seguro
    const newsletterInfo = global.channelRD?.id ? {
      newsletterJid: global.channelRD.id,
      serverMessageId: '',
      newsletterName: global.channelRD.name || 'Channel'
    } : undefined

    await conn.sendMessage(m.chat,
      isVideo
        ? {
            video: { url: banner },
            gifPlayback: true,
            caption: menu,
            contextInfo: {
              mentionedJid: [m.sender],
              isForwarded: true,
              ...(newsletterInfo && { forwardedNewsletterMessageInfo: newsletterInfo })
            }
          }
        : {
            text: `${global.api?.url || ''}\n` + menu,
            linkPreview: linkPreview,
            contextInfo: {
              mentionedJid: [m.sender],
              isForwarded: true,
              ...(newsletterInfo && { forwardedNewsletterMessageInfo: newsletterInfo })
            }
          },
      { quoted: m }
    )

  } catch (e) {
    await conn.sendMessage(m.chat, {
      text: `🌾 Error al enviar el menú: ${e.message}`,
      mentions: [m.sender]
    }, { quoted: m })
  }
}

handler.help = ['menu']
handler.tags = ['main']
handler.command = ['menu', 'menú', 'help', 'allmenu']

export default handler

function clockString(ms) {
  let seconds = Math.floor((ms / 1000) % 60)
  let minutes = Math.floor((ms / (1000 * 60)) % 60)
  let hours = Math.floor((ms / (1000 * 60 * 60)) % 24)
  return `${hours}H ${minutes}M ${seconds}S`
}
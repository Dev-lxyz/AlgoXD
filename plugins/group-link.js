import { prepareWAMessageMedia } from '@whiskeysockets/baileys'

let handler = async (m, { conn }) => {
  try {
    const code = await conn.groupInviteCode(m.chat)
    const link = `https://chat.whatsapp.com/${code}`
    
    let linkPreview
    if (global.banner) {
      const media = await prepareWAMessageMedia(
        { image: { url: global.banner } }, 
        { upload: conn.waUploadToServer, mediaTypeOverride: 'thumbnail-link' }
      )
      linkPreview = {
        'canonical-url': link,
        'matched-text': link,
        title: `🌿 Group Link`,
        description: `🔗 Link del grupo`,
        jpegThumbnail: media.imageMessage?.jpegThumbnail ? Buffer.from(media.imageMessage.jpegThumbnail) : undefined,
        highQualityThumbnail: media.imageMessage
      }
    }

    let teks = `﹒⌗﹒🌿 .ৎ˚₊‧  Aquí tienes el link del grupo:\n\n𐚁 ֹ ִ \`GROUP LINK\` ! ୧ ֹ ִ🔗\n☘️ \`Solicitado por :\` @${m.sender.split('@')[0]}\n\n🌱 \`Enlace :\` ${link}`

    await conn.sendMessage(m.chat, { text: teks, mentions: [m.sender], linkPreview }, { quoted: m })
  } catch (e) {
    m.reply(`> Error: ${e.message}`)
  }
}

handler.help = ['link']
handler.tags = ['grupo']
handler.command = ['link', 'linkgc']
handler.group = true
handler.botAdmin = true

export default handler
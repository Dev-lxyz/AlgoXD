import fetch from 'node-fetch'
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys'

let handler = async (m, { conn, command, usedPrefix }) => {
  try {
    const senderName =
      m.pushName ||
      m.name ||
      m.key?.participant?.split('@')[0] ||
      m.key?.remoteJid?.split('@')[0] ||
      'User'

    const imageUrl = 'https://i.ibb.co/x8dnKqsX/81cedc3bd55a.jpg'
    const imageResponse = await fetch(imageUrl)

    if (!imageResponse.ok) {
      throw new Error(`Branding image download failed: HTTP ${imageResponse.status}`)
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    const payload = proto.Message.fromObject({
      buttonsMessage: {
        buttons: [
          {
            buttonId: `${usedPrefix}ping`,
            buttonText: { displayText: '🏓 Ping' },
            type: 1
          },
          {
            buttonId: `${usedPrefix}menu3`,
            buttonText: { displayText: '📂 List Menu' },
            type: 1
          }
        ],

        locationMessage: {
          degreesLatitude: 0,
          degreesLongitude: 0,
          name: 'SILENT MD ULTIMATE',
          address: '© SILENT TECH',
          jpegThumbnail: imageBuffer
        },

        contentText: [
          `Hello ${senderName} 👋`,
          '',
          'Welcome to *SILENT MD ULTIMATE*',
          '',
          'Tap a button below to continue.'
        ].join('\n'),

        footerText:
          global.footer ||
          global.botname ||
          global.botName ||
          '© SILENT TECH',

        headerType: 6
      }
    })

    const generatedMessage = generateWAMessageFromContent(
      m.chat,
      payload,
      { userJid: conn.user.id }
    )

    const additionalNodes = [
      {
        tag: 'biz',
        attrs: {},
        content: [
          {
            tag: 'interactive',
            attrs: {
              type: 'native_flow',
              v: '1'
            },
            content: [
              {
                tag: 'native_flow',
                attrs: {
                  v: '9',
                  name: 'mixed'
                },
                content: undefined
              }
            ]
          }
        ]
      }
    ]

    if (!m.chat.endsWith('@g.us')) {
      additionalNodes.push({
        tag: 'bot',
        attrs: {
          biz_bot: '1'
        },
        content: undefined
      })
    }

    await conn.relayMessage(
      m.chat,
      generatedMessage.message,
      {
        messageId: generatedMessage.key.id,
        additionalNodes
      }
    )

  } catch (e) {
    console.error('[MENU5 RAFax STYLE ERROR]', e)
    await conn.reply(
      m.chat,
      '❌ Menu5 failed:\n' +
        (e.stack || e.message || String(e)),
      m
    )
  }
}

handler.command = ['menu5']
handler.tags = ['main']
handler.help = ['menu5']
handler.group = false

export default handler
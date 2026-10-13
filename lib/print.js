import { WAMessageStubType } from '@whiskeysockets/baileys'
import chalk from 'chalk'
import { watchFile } from 'fs'

const terminalImage = global.opts['img'] ? require('terminal-image') : ''
const urlRegex = (await import('url-regex-safe')).default({ strict: false })

// ============================================================
// 🎨 PALETA PRO
// ============================================================
const C = {
  border:   chalk.hex('#00E5FF'),       // cian eléctrico
  accent:   chalk.hex('#FF2D95'),       // magenta neón
  success:  chalk.hex('#00FF88'),       // verde lima
  warning:  chalk.hex('#FFB800'),       // ámbar
  info:     chalk.hex('#7B61FF'),       // violeta
  dim:      chalk.hex('#5A5A66'),       // gris
  text:     chalk.hex('#E0E0E0'),       // blanco humo
  highlight: chalk.hex('#FFD93D'),      // amarillo
  danger:   chalk.hex('#FF4D4D'),       // rojo
}

// Detectar JID/LID de WhatsApp v7
const isLid = (jid = '') => typeof jid === 'string' && jid.endsWith('@lid')
const isPn  = (jid = '') => typeof jid === 'string' && jid.endsWith('@s.whatsapp.net')
const isGroup = (jid = '') => typeof jid === 'string' && jid.endsWith('@g.us')
const isNewsletter = (jid = '') => typeof jid === 'string' && jid.endsWith('@newsletter')

// Formatear número de forma legible
const prettyJid = (jid = '') => {
  if (!jid) return ''
  return jid.replace(/@s\.whatsapp\.net|@lid|@g\.us|@newsletter/g, '')
}

// Barra visual de peso
const weightBar = (bytes) => {
  if (!bytes) return C.dim('·'.repeat(10))
  const levels = Math.min(10, Math.max(1, Math.floor(Math.log10(bytes + 1) * 1.6)))
  return C.success('▰'.repeat(levels)) + C.dim('▱'.repeat(10 - levels))
}

// Icono según tipo de mensaje
const typeIcon = (mtype = '') => {
  if (/image/i.test(mtype))       return '📷'
  if (/video/i.test(mtype))       return '🎬'
  if (/audio/i.test(mtype))       return '🎵'
  if (/sticker/i.test(mtype))     return '🩹'
  if (/document/i.test(mtype))    return '📄'
  if (/contact/i.test(mtype))     return '👤'
  if (/location/i.test(mtype))    return '📍'
  if (/poll/i.test(mtype))        return '📊'
  if (/event/i.test(mtype))       return '📅'
  if (/protocol/i.test(mtype))    return '⚙️'
  if (/conversation|extended/i.test(mtype)) return '💬'
  return '❔'
}

// Borde superior/inferior
const topBorder    = (label = '') => {
  const title = label ? ` ${label} ` : ''
  const fill = '─'.repeat(Math.max(0, 40 - title.length - 2))
  return C.border('╭─') + C.accent.bold(title) + C.border('─' + fill + '╮')
}
const bottomBorder = () => C.border('╰' + '─'.repeat(42) + '╯')
const divider      = () => C.border('├' + '─'.repeat(42) + '┤')

// Fila con etiqueta alineada
const row = (icon, label, value) => {
  const l = C.dim(label.padEnd(16))
  return `${C.border('│')} ${icon} ${l} ${value}`
}

export default async function (m, conn = { user: {} }) {
  // ============================================================
  // 🛡️ GUARDS: evitar crasheos con mensajes raros
  // ============================================================
  if (!m || !m.sender) return
  if (m.sender === conn.user?.jid) return
  if (m.key?.remoteJid === 'status@broadcast') return

  let _name = await conn.getName(m.sender).catch(() => '')
  let senderRaw = m.sender
  let senderType = isLid(senderRaw) ? C.accent('LID') : isPn(senderRaw) ? C.success('PN') : C.dim('?')
  let sender = C.highlight(prettyJid(senderRaw)) + (_name ? C.dim(' ~ ') + C.text(_name) : '')

  let chat = await conn.getName(m.chat).catch(() => '')
  let chatId = prettyJid(m.chat)
  let chatBadge = isGroup(m.chat) ? C.info('👥 GRUPO')
                : isNewsletter(m.chat) ? C.warning('📢 CANAL')
                : C.success('💬 PRIVADO')

  let img
  try {
    if (global.opts['img'])
      img = /sticker|image/gi.test(m.mtype) ? await terminalImage.buffer(await m.download()) : false
  } catch (e) {
    console.error(e)
  }

  // ============================================================
  // 📦 Peso del mensaje
  // ============================================================
  let filesize = (
    m.msg ?
      m.msg.vcard ? m.msg.vcard.length :
      m.msg.fileLength ? (m.msg.fileLength.low || m.msg.fileLength) :
      m.msg.axolotlSenderKeyDistributionMessage ? m.msg.axolotlSenderKeyDistributionMessage.length :
      m.text ? m.text.length : 0
    : m.text ? m.text.length : 0
  ) || 0

  let user = global.db?.data?.users?.[m.sender]
  let me = '+' + prettyJid(conn.user?.jid || '')
  const userName = conn.user?.name || conn.user?.verifiedName || 'Desconocido'
  const isMainBot = global.conn?.user?.jid === conn.user?.jid
  const botBadge = isMainBot ? C.success.bold(' ⚡ PRINCIPAL ') : C.warning.bold(' 🔮 SUB-BOT ')

  // ============================================================
  // 🖼️ CABECERA
  // ============================================================
  console.log()
  console.log(topBorder('BOT LOG'))

  console.log(row('🤖', 'Bot',        C.success(me) + C.dim(' ~ ') + C.accent.bold(userName) + botBadge))
  console.log(row('📅', 'Fecha',      C.info(new Date(
      m.messageTimestamp ? 1000 * (m.messageTimestamp.low || m.messageTimestamp) : Date.now()
    ).toLocaleString('es-ES', {
      timeZone: 'America/Mexico_City',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }))))
  console.log(row('⚙️', 'Evento',     m.messageStubType ? C.warning(WAMessageStubType[m.messageStubType]) : C.dim('ninguno')))
  console.log(row('📦', 'Peso',       C.highlight(filesize + ' B') + ' ' + weightBar(filesize) + ' ' + C.dim(
      filesize === 0 ? '0 B' :
      (filesize / 1000 ** Math.floor(Math.log(filesize) / Math.log(1000))).toFixed(1) + ' ' +
      (['B','KB','MB','GB','TB'][Math.floor(Math.log(filesize) / Math.log(1000))] || '')
  )))

  console.log(divider())

  console.log(row('👤', 'Remitente',  sender + ' ' + C.dim('[') + senderType + C.dim(']')))
  console.log(row('💬', 'Chat',       C.info(chatBadge) + ' ' + C.highlight(chatId) + (chat ? C.dim(' ~ ') + C.text(chat) : '')))
  console.log(row(typeIcon(m.mtype), 'Tipo', C.accent(
    m.mtype
      ? m.mtype.replace(/message$/i, '').replace('audio', m.msg?.ptt ? 'PTT' : 'audio').replace(/^./, v => v.toUpperCase())
      : 'Desconocido'
  )))

  console.log(bottomBorder())

  // ============================================================
  // 🖼️ IMAGEN (si está activa)
  // ============================================================
  if (img) console.log(img.trimEnd())

  // ============================================================
  // 💬 TEXTO DEL MENSAJE
  // ============================================================
  if (typeof m.text === 'string' && m.text) {
    let log = m.text.replace(/\u200e+/g, '')
    let mdRegex = /(?<=(?:^|[\s\n])\S?)(?:([*_~`])(?!`)(.+?)\1|```((?:.|[\n\r])+?)```|`([^`]+?)`)(?=\S?(?:[\s\n]|$))/g

    let mdFormat = (depth = 4) => (_, type, text, monospace) => {
      let types = { '_': 'italic', '*': 'bold', '~': 'strikethrough', '`': 'bgGray' }
      text = text || monospace
      let formatted = !types[type] || depth < 1
        ? text
        : chalk[types[type]](text.replace(/`/g, '').replace(mdRegex, mdFormat(depth - 1)))
      return formatted
    }

    log = log.replace(mdRegex, mdFormat(4))
    log = log.split('\n').map(line => {
      if (line.trim().startsWith('>')) {
        return C.accent.dim('┃ ') + C.dim(line.replace(/^>/, '').trim())
      } else if (/^([1-9]|[1-9][0-9])\./.test(line.trim())) {
        return line.replace(/^(\d+)\./, (match, number) => {
          const padding = number.length === 1 ? '  ' : ' '
          return C.info(padding + number + '.')
        })
      } else if (/^[-*]\s/.test(line.trim())) {
        return line.replace(/^[*-]/, C.success('  •'))
      }
      return line
    }).join('\n')

    if (log.length < 1024) {
      log = log.replace(urlRegex, (url, i, text) => {
        let end = url.length + i
        return i === 0 || end === text.length || (/^\s$/.test(text[end]) && /^\s$/.test(text[i - 1]))
          ? C.info.underline(url)
          : url
      })
    }
    log = log.replace(mdRegex, mdFormat(4))

    const testi = await m.mentionedJid
    if (testi) {
      for (let userJid of testi) {
        log = log.replace('@' + userJid.split`@`[0], C.info.bold('@' + await conn.getName(userJid)))
      }
    }

    // Prefijo visual según estado
    const prefix = m.error != null ? C.danger(' ✖ ') : m.isCommand ? C.warning(' ⚡ ') : C.success(' ➤ ')
    const formatted = m.error != null ? C.danger(log) : m.isCommand ? C.warning(log) : C.text(log)
    console.log(prefix + formatted)
  }

  // ============================================================
  // 📋 STUB PARAMETERS
  // ============================================================
  if (m.messageStubParameters) {
    console.log(m.messageStubParameters.map(jid => {
      jid = conn.decodeJid(jid)
      let name = conn.getName(jid)
      return C.dim('+' + prettyJid(jid) + (name ? ' ~ ' + name : ''))
    }).join(C.dim(', ')))
  }

  // ============================================================
  // 🎯 DETALLES POR TIPO
  // ============================================================
  if (/document/i.test(m.mtype)) {
    console.log(C.info('📄 ') + C.highlight(m.msg.fileName || m.msg.displayName || 'Document'))
  } else if (/ContactsArray/i.test(m.mtype)) {
    console.log(C.info('👥 Contactos múltiples'))
  } else if (/contact/i.test(m.mtype)) {
    console.log(C.info('👤 ') + C.highlight(m.msg.displayName || ''))
  } else if (/audio/i.test(m.mtype)) {
    const duration = m.msg.seconds
    const mins = Math.floor(duration / 60).toString().padStart(2, 0)
    const secs = (duration % 60).toString().padStart(2, 0)
    const icon = m.msg.ptt ? '🎙️ PTT' : '🎵 AUDIO'
    console.log(C.accent(icon) + ' ' + C.highlight(`[${mins}:${secs}]`))
  }

  console.log()
}

// ============================================================
// 🔄 Hot reload del archivo
// ============================================================
let file = global.__filename(import.meta.url)
watchFile(file, () => {
  console.log(C.warning.bold("⚡ Hot reload: 'lib/print.js' actualizado"))
})
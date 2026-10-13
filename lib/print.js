import { WAMessageStubType } from '@whiskeysockets/baileys'
import chalk from 'chalk'
import { watchFile } from 'fs'

const terminalImage = global.opts['img'] ? require('terminal-image') : ''
const urlRegex = (await import('url-regex-safe')).default({ strict: false })

const isLid = jid => typeof jid === 'string' && jid.endsWith('@lid')
const cleanNum = v => String(v || '').split('@')[0].split(':')[0].replace(/\D/g, '')

async function resolveToNumber(conn, jid, groupJid) {
  if (!jid) return ''
  if (!isLid(jid)) return cleanNum(jid)
  try {
    const pn = await conn?.signalRepository?.lidMapping?.getPNForLID?.(jid)
    if (pn && !isLid(pn)) return cleanNum(pn)
  } catch {}
  try {
    if (groupJid?.endsWith('@g.us')) {
      const meta = await conn.groupMetadata(groupJid).catch(() => null)
      if (meta?.participants) {
        const lidNum = cleanNum(jid)
        for (const p of meta.participants) {
          const pid = cleanNum(p.id)
          const plid = cleanNum(p.lid)
          const ppn = cleanNum(p.phoneNumber || p.senderPn || p.pn)
          if (pid === lidNum || plid === lidNum) {
            if (ppn) return ppn
            if (p.id && !isLid(p.id)) return cleanNum(p.id)
          }
        }
      }
    }
  } catch {}
  return cleanNum(jid)
}

export default async function (m, conn = { user: {} }) {
  let _name = await conn.getName(m.sender)
  const senderNum = await resolveToNumber(conn, m.sender, m.isGroup ? m.chat : null)
  let sender = '+' + senderNum + (_name ? ' ~ ' + _name : '')
  let chat = await conn.getName(m.chat)
  let img
  try {
    if (global.opts['img'])
      img = /sticker|image/gi.test(m.mtype) ? await terminalImage.buffer(await m.download()) : false
  } catch (e) {
    console.error(e)
  }
  let filesize = (m.msg ?
    m.msg.vcard ?
      m.msg.vcard.length :
      m.msg.fileLength ?
        m.msg.fileLength.low || m.msg.fileLength :
        m.msg.axolotlSenderKeyDistributionMessage ?
          m.msg.axolotlSenderKeyDistributionMessage.length :
          m.text ?
            m.text.length :
            0
    : m.text ? m.text.length : 0) || 0

  let user = global.db.data.users[m.sender]
  let chatName = chat ? (m.isGroup ? 'Grupo ~ ' + chat : 'Privado ~ ' + chat) : ''
  const botNum = cleanNum(conn.user?.jid)
  let me = '+' + botNum
  const userName = conn.user.name || conn.user.verifiedName || "Desconocido"
  if (m.sender === conn.user?.jid) return

  const B = chalk.hex('#00D9FF')
  const A = chalk.hex('#FF2E93')
  const G = chalk.hex('#00FF87')
  const Y = chalk.hex('#FFC93C')
  const P = chalk.hex('#A78BFA')
  const W = chalk.hex('#E5E7EB')
  const D = chalk.hex('#6B7280')

  console.log(`${B.bold('╭────────────────────────────────···')}
${B.bold('│')}${D('Bot:')} ${G(me)} ${D('~')} ${A.bold(userName)} ${global.conn.user.jid === conn.user.jid ? B('(Principal)') : Y('(Sub-Bot)')}
${B.bold('│')}${D('Fecha:')} ${W(new Date(m.messageTimestamp ? 1000 * (m.messageTimestamp.low || m.messageTimestamp) : Date.now()).toLocaleDateString("es-ES", { timeZone: "America/Mexico_City", day: 'numeric', month: 'long', year: 'numeric' }))}
${B.bold('│')}${D('Tipo de evento:')} ${m.messageStubType ? A(WAMessageStubType[m.messageStubType]) : D('Ninguno')}
${B.bold('│')}${D('Peso del mensaje:')} ${Y(filesize + ' B')} ${D('[')}${P(filesize === 0 ? 0 : (filesize / 1000 ** Math.floor(Math.log(filesize) / Math.log(1000))).toFixed(1))} ${G(['B', 'KB', 'MB', 'GB', 'TB'][Math.floor(Math.log(filesize) / Math.log(1000))] || '')}${D(']')}
${B.bold('│')}${D('Remitente:')} ${G(sender)}
${B.bold('│')}${D(`Chat ${m.isGroup ? 'Grupal' : 'Privado'}:`)} ${W(chat)}
${B.bold('│')}${D('Tipo de mensaje:')} ${P(m.mtype ? m.mtype.replace(/message$/i, '').replace('audio', m.msg?.ptt ? 'PTT' : 'audio').replace(/^./, v => v.toUpperCase()) : 'Desconocido')}
${B.bold('╰───────────────────···')}`)

  if (img) console.log(img.trimEnd())
  if (typeof m.text === 'string' && m.text) {
    let log = m.text.replace(/\u200e+/g, '')
    let mdRegex = /(?<=(?:^|[\s\n])\S?)(?:([*_~`])(?!`)(.+?)\1|```((?:.|[\n\r])+?)```|`([^`]+?)`)(?=\S?(?:[\s\n]|$))/g
    let mdFormat = (depth = 4) => (_, type, text, monospace) => {
      let types = {
        '_': 'italic',
        '*': 'bold',
        '~': 'strikethrough',
        '`': 'bgGray'
      }
      text = text || monospace
      let formatted = !types[type] || depth < 1 ? text : chalk[types[type]](text.replace(/`/g, '').replace(mdRegex, mdFormat(depth - 1)))
      return formatted
    }
    log = log.replace(mdRegex, mdFormat(4))
    log = log.split('\n').map(line => {
      if (line.trim().startsWith('>')) {
        return D.dim(line.replace(/^>/, '┃'))
      } else if (/^([1-9]|[1-9][0-9])\./.test(line.trim())) {
        return line.replace(/^(\d+)\./, (match, number) => {
          const padding = number.length === 1 ? '  ' : ' '
          return padding + number + '.'
        })
      } else if (/^[-*]\s/.test(line.trim())) {
        return line.replace(/^[*-]/, '  •')
      }
      return line
    }).join('\n')
    if (log.length < 1024)
      log = log.replace(urlRegex, (url, i, text) => {
        let end = url.length + i
        return i === 0 || end === text.length || (/^\s$/.test(text[end]) && /^\s$/.test(text[i - 1])) ? B.underline(url) : url
      })
    log = log.replace(mdRegex, mdFormat(4))
    const testi = await m.mentionedJid
    if (testi) {
      for (let user of testi)
        log = log.replace('@' + user.split`@`[0], B('@' + await conn.getName(user)))
    }
    console.log(m.error != null ? chalk.hex('#FF4D4D')(log) : m.isCommand ? Y(log) : W(log))
  }
  if (m.messageStubParameters) {
    console.log(m.messageStubParameters.map(jid => {
      jid = conn.decodeJid(jid)
      let name = conn.getName(jid)
      return D('+' + cleanNum(jid) + (name ? ' ~ ' + name : ''))
    }).join(D(', ')))
  }
  if (/document/i.test(m.mtype)) console.log(`${B('🝮')} ${W(m.msg.fileName || m.msg.displayName || 'Document')}`)
  else if (/ContactsArray/i.test(m.mtype)) console.log(`${B('᯼')} ${W(' ')}`)
  else if (/contact/i.test(m.mtype)) console.log(`${B('✎')} ${W(m.msg.displayName || '')}`)
  else if (/audio/i.test(m.mtype)) {
    const duration = m.msg.seconds
    console.log(`${m.msg.ptt ? A('☄ (PTT ') : P('𝄞 (')}${G('AUDIO)')} ${Y(Math.floor(duration / 60).toString().padStart(2, 0))}${D(':')}${Y((duration % 60).toString().padStart(2, 0))}`)
  }
  console.log()
}

let file = global.__filename(import.meta.url)
watchFile(file, () => {
  console.log(chalk.hex('#FFC93C').bold("Update 'lib/print.js'"))
})
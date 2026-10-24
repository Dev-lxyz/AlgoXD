import { WAMessageStubType } from '@whiskeysockets/baileys'
import chalk from 'chalk'
import fs from 'fs'
import path from 'path'

const lidCache = new Map()
const handler = m => m

handler.before = async function (m, { conn, participants }) {
  if (!m.messageStubType || !m.isGroup) return

  const chat = global.db.data.chats[m.chat] || {}
  if (chat.primaryBot && conn.user.jid !== chat.primaryBot) return

  const fake = global.fake || {}
  if (!fake.contextInfo) fake.contextInfo = {}

  const usuario = await resolveToJid(m.sender, conn, m.chat)
  const usuarioNum = usuario.split('@')[0].split(':')[0]

  const rawParam = m.messageStubParameters?.[0]
  const rawParamStr = (rawParam && typeof rawParam === 'object')
    ? String(rawParam.id || rawParam.jid || rawParam.lid || rawParam.phoneNumber || '')
    : String(rawParam || '')

  const isOnOff = rawParamStr === 'on' || rawParamStr === 'off'

  let users = rawParamStr
  if (!isOnOff && /^\d{7,}/.test(rawParamStr)) {
    const jidCandidate = rawParamStr.includes('@') ? rawParamStr : `${rawParamStr}@lid`
    users = await resolveToJid(jidCandidate, conn, m.chat)
  }
  const usersNum = String(users).split('@')[0].split(':')[0]

  const adminIds = (participants || [])
    .filter(p => p.admin)
    .map(p => p.jid || p.id)
    .filter(Boolean)

  const pp =
    (await conn.profilePictureUrl(m.chat, 'image').catch(() => null)) ||
    'https://files.catbox.moe/5biv5v.jpg'

  const nombre = `> ❀ @${usuarioNum} Ha cambiado el nombre del grupo.\n> ✦ Ahora el grupo se llama:\n> *${rawParamStr}*.`
  const foto = `> ❀ Se ha cambiado la imagen del grupo.\n> ✦ Acción hecha por:\n> » @${usuarioNum}`
  const edit = `> ❀ @${usuarioNum} Ha permitido que ${rawParamStr == 'on' ? 'solo admins' : 'todos'} puedan configurar el grupo.`
  const newlink = `> ❀ El enlace del grupo ha sido restablecido.\n> ✦ Acción hecha por:\n> » @${usuarioNum}`
  const status = `> ❀ El grupo ha sido ${rawParamStr == 'on' ? '*cerrado*' : '*abierto*'} Por @${usuarioNum}\n> ✦ Ahora ${rawParamStr == 'on' ? '*solo admins*' : '*todos*'} pueden enviar mensaje.`
  const admingp = `> ❀ @${usersNum} Ahora es admin del grupo.\n> ✦ Acción hecha por:\n> » @${usuarioNum}`
  const noadmingp = `> ❀ @${usersNum} Deja de ser admin del grupo.\n> ✦ Acción hecha por:\n> » @${usuarioNum}`

  const stub = m.messageStubType

  if (chat.detect && stub == 2) {
    const uniqid = (m.isGroup ? m.chat : m.sender).split('@')[0]
    const sessionPath = `./${global.sessions || 'sessions'}/`
    try {
      for (const file of await fs.promises.readdir(sessionPath)) {
        if (file.includes(uniqid)) {
          await fs.promises.unlink(path.join(sessionPath, file))
          console.log(
            `${chalk.yellow.bold('✎ Delete!')} ${chalk.greenBright(`'${file}'`)}\n${chalk.redBright('Que provoca el "undefined" en el chat.')}`
          )
        }
      }
    } catch {}
    return
  }

  if (!chat.detect) return

  const mentions = [usuario, ...adminIds].filter(Boolean)

  if (stub == 21) {
    fake.contextInfo.mentionedJid = mentions
    await this.sendMessage(m.chat, { text: nombre, ...fake }, { quoted: null })
  } else if (stub == 22) {
    fake.contextInfo.mentionedJid = mentions
    await this.sendMessage(m.chat, { image: { url: pp }, caption: foto, ...fake }, { quoted: null })
  } else if (stub == 23) {
    fake.contextInfo.mentionedJid = mentions
    await this.sendMessage(m.chat, { text: newlink, ...fake }, { quoted: null })
  } else if (stub == 25) {
    fake.contextInfo.mentionedJid = mentions
    await this.sendMessage(m.chat, { text: edit, ...fake }, { quoted: null })
  } else if (stub == 26) {
    fake.contextInfo.mentionedJid = mentions
    await this.sendMessage(m.chat, { text: status, ...fake }, { quoted: null })
  } else if (stub == 29) {
    fake.contextInfo.mentionedJid = [usuario, users, ...adminIds].filter(Boolean)
    await this.sendMessage(m.chat, { text: admingp, ...fake }, { quoted: null })
  } else if (stub == 30) {
    fake.contextInfo.mentionedJid = [usuario, users, ...adminIds].filter(Boolean)
    await this.sendMessage(m.chat, { text: noadmingp, ...fake }, { quoted: null })
  } else {
    console.log({
      messageStubType: stub,
      messageStubParameters: m.messageStubParameters,
      type: WAMessageStubType[stub]
    })
  }
}

export default handler

async function resolveToJid(jid, conn, groupChatId) {
  if (!jid) return ''
  const input = String(jid).trim()
  if (!input) return ''

  if (input.endsWith('@s.whatsapp.net')) return input

  const cached = lidCache.get(input)
  if (cached) return cached

  if (!input.endsWith('@lid')) {
    if (!input.includes('@') && /^\d+$/.test(input)) return `${input}@s.whatsapp.net`
    return input
  }

  try {
    const pn = await conn?.signalRepository?.lidMapping?.getPNForLID?.(input)
    if (pn && pn.endsWith('@s.whatsapp.net')) {
      lidCache.set(input, pn)
      return pn
    }
  } catch {}

  if (groupChatId?.endsWith('@g.us')) {
    try {
      const metadata = await conn.groupMetadata(groupChatId).catch(() => null)
      const parts = metadata?.participants || []
      const lidNum = input.split('@')[0].split(':')[0]

      for (const p of parts) {
        const candidates = [p.lid, p.id, p.jid, p.phoneNumber].filter(Boolean)
        for (const c of candidates) {
          const cNum = String(c).split('@')[0].split(':')[0]
          if (cNum === lidNum) {
            const realJid =
              p.jid ||
              p.phoneNumber ||
              (p.id && !p.id.endsWith('@lid') ? p.id : '')
            if (realJid && realJid.endsWith('@s.whatsapp.net')) {
              lidCache.set(input, realJid)
              return realJid
            }
          }
        }
      }
    } catch {}
  }

  lidCache.set(input, input)
  return input
}
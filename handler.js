import { smsg } from "./lib/simple.js"
import { format } from "util"
import { fileURLToPath } from "url"
import path, { join } from "path"
import fs, { unwatchFile, watchFile } from "fs"
import chalk from "chalk"
import fetch from "node-fetch"
import ws from "ws"

const opts = global.opts || {}
const isNumber = x => typeof x === "number" && !isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(function () {
  clearTimeout(this); resolve()
}, ms))

const jidCache = new Map()
const metadataCache = new Map()
const metadataInflight = new Map()

const JID_TTL_DM = 7 * 24 * 60 * 60_000
const JID_TTL_GROUP = 24 * 60 * 60_000
const META_TTL = 24 * 60 * 60_000
const MAX_JID_CACHE = 1000
const MAX_META_CACHE = 300

const normalizeNumber = value => {
  if (!value) return ""
  return String(value).split("@")[0].split(":")[0].replace(/\D/g, "")
}

const normalizeJid = value => {
  if (!value) return ""
  const string = String(value).trim()
  if (string.endsWith("@s.whatsapp.net")) {
    const n = normalizeNumber(string)
    return n ? `${n}@s.whatsapp.net` : ""
  }
  if (string.endsWith("@lid")) return string
  const n = normalizeNumber(string)
  return n ? `${n}@s.whatsapp.net` : ""
}

const isRealJid = jid => /^\d+@s\.whatsapp\.net$/.test(String(jid || ""))
const isLid = jid => String(jid || "").endsWith("@lid")
const isGroupJid = jid => String(jid || "").endsWith("@g.us")

const getIds = jid => {
  if (!jid) return []
  const values = [
    jid, jid?.id, jid?.jid, jid?.lid, jid?.participant, jid?.participantAlt,
    jid?.senderPn, jid?.senderPnAlt, jid?.phoneNumber, jid?.pn, jid?.phone,
    jid?.remoteJid, jid?.remoteJidAlt
  ]
  return [...new Set(values.flat(Infinity).filter(Boolean).map(v => String(v).trim()))]
}

const getNumbers = jid => [
  ...new Set(
    getIds(jid).map(v => normalizeNumber(v)).filter(n => n.length >= 7)
  )
]

const cacheSet = (map, key, value, max = MAX_JID_CACHE) => {
  if (!key || !value) return
  if (map.size >= max) {
    const first = map.keys().next().value
    if (first) map.delete(first)
  }
  map.set(key, value)
}

const getCachedMetadata = chat => {
  const cached = metadataCache.get(chat)
  if (!cached) return null
  if (Date.now() - cached.ts > META_TTL) {
    metadataCache.delete(chat)
    return null
  }
  return cached.data
}

const metadataCacheSet = (key, value) => {
  if (!key || !value) return
  if (metadataCache.size >= MAX_META_CACHE) {
    const first = metadataCache.keys().next().value
    if (first) metadataCache.delete(first)
  }
  metadataCache.set(key, { data: value, ts: Date.now() })
}

const storeLidMapping = async (conn, lid, pn) => {
  if (!conn?.signalRepository?.lidMapping || !lid || !pn) return
  const cleanLid = String(lid).endsWith("@lid") ? String(lid) : `${String(lid)}@lid`
  const cleanPn = normalizeJid(pn)
  if (!isLid(cleanLid) || !isRealJid(cleanPn)) return
  try {
    const mapping = conn.signalRepository.lidMapping
    if (typeof mapping.storeLIDPNMappings === "function") {
      await mapping.storeLIDPNMappings([{ lid: cleanLid, pn: cleanPn }])
    } else if (typeof mapping.storeLIDPNMapping === "function") {
      await mapping.storeLIDPNMapping(cleanLid, cleanPn)
    }
  } catch {}
}

const getPnFromLidMapping = async (conn, lid) => {
  if (!conn?.signalRepository?.lidMapping || !isLid(lid)) return ""
  try {
    const mapping = conn.signalRepository.lidMapping
    if (typeof mapping.getPNForLID === "function") {
      const result = await mapping.getPNForLID(lid)
      if (result) {
        const pn = normalizeJid(result)
        if (isRealJid(pn)) return pn
      }
    }
  } catch {}
  return ""
}

const saveMetadataMappings = async (conn, metadata) => {
  if (!metadata?.participants) return
  for (const p of metadata.participants) {
    const lid = p?.id?.endsWith?.("@lid") ? p.id : p?.lid
    const pn = p?.phoneNumber || p?.senderPn || p?.pn
    if (lid && pn) await storeLidMapping(conn, lid, pn)
  }
  if (metadata.owner && metadata.ownerPn) {
    await storeLidMapping(conn, metadata.owner, metadata.ownerPn)
  }
}

const fetchGroupMetadataDeduped = async (conn, chatId) => {
  const cached = getCachedMetadata(chatId)
  if (cached) return cached
  if (metadataInflight.has(chatId)) return metadataInflight.get(chatId)
  const promise = (async () => {
    try {
      const meta = await conn.groupMetadata(chatId).catch(() => null)
      if (meta) {
        metadataCacheSet(chatId, meta)
        await saveMetadataMappings(conn, meta)
      }
      return meta || null
    } finally {
      metadataInflight.delete(chatId)
    }
  })()
  metadataInflight.set(chatId, promise)
  return promise
}

const resolveParticipantNumber = participant => {
  if (!participant) return ""
  const values = [
    participant.phoneNumber, participant.senderPn, participant.senderPnAlt,
    participant.pn, participant.phone, participant.number, participant.id
  ]
  for (const value of values) {
    if (String(value || "").endsWith("@lid")) continue
    const number = normalizeNumber(value)
    if (number && number.length >= 7) return number
  }
  return ""
}

const participantMatches = (participant, target) => {
  if (!participant || !target) return false
  const targetIds = getIds(target)
  const targetNumbers = getNumbers(target)
  const participantIds = getIds(participant)
  const participantNumbers = getNumbers(participant)
  if (participantIds.some(id => targetIds.includes(id))) return true
  return participantNumbers.some(number =>
    targetNumbers.some(targetNumber =>
      number === targetNumber ||
      number.endsWith(targetNumber) ||
      targetNumber.endsWith(number)
    )
  )
}

async function resolveLidToRealJid(lid, conn, groupChatId) {
  const input = String(lid || "").trim()
  if (!input) return input
  if (isRealJid(input)) return input

  const cached = jidCache.get(input)
  if (cached && Date.now() < cached.exp) return cached.resolved
  if (!isLid(input)) return input

  const mapped = await getPnFromLidMapping(conn, input)
  if (mapped) {
    cacheSet(jidCache, input, { resolved: mapped, exp: Date.now() + JID_TTL_DM })
    return mapped
  }

  if (isGroupJid(groupChatId)) {
    let metadata = getCachedMetadata(groupChatId)
    if (!metadata) metadata = await fetchGroupMetadataDeduped(conn, groupChatId)
    if (metadata) {
      const participant = metadata.participants?.find(p => participantMatches(p, input))
      if (participant) {
        const number = resolveParticipantNumber(participant)
        if (number) {
          const resolved = `${number}@s.whatsapp.net`
          await storeLidMapping(conn, input, resolved)
          cacheSet(jidCache, input, { resolved, exp: Date.now() + JID_TTL_GROUP })
          return resolved
        }
        if (isRealJid(participant.id)) {
          cacheSet(jidCache, input, { resolved: participant.id, exp: Date.now() + JID_TTL_GROUP })
          return participant.id
        }
      }
    }
  }
  return input
}

async function resolveJid(sender, conn, chat, alternate) {
  if (!sender && !alternate) return ""
  const candidates = [sender, alternate].filter(Boolean)
  for (const candidate of candidates) {
    const input = String(candidate)
    if (isRealJid(input)) {
      cacheSet(jidCache, input, {
        resolved: input,
        exp: isGroupJid(chat) ? Date.now() + JID_TTL_GROUP : Date.now() + JID_TTL_DM
      })
      return input
    }
    if (isLid(input)) {
      const resolved = await resolveLidToRealJid(input, conn, chat)
      if (resolved && isRealJid(resolved)) return resolved
    }
  }
  return String(sender || alternate || "")
}

const parseNumbers = list => {
  if (!list) return []
  const source = Array.isArray(list) ? list : [list]
  return [...new Set(
    source
      .map(v => typeof v === "string" ? v : String(v?.number || v?.jid || v || ""))
      .map(normalizeNumber)
      .filter(n => n.length >= 7)
  )]
}

const numberMatchesList = (numbers, list) => {
  if (!numbers.length || !list.length) return false
  return numbers.some(number =>
    list.some(owner =>
      number === owner || number.endsWith(owner) || owner.endsWith(number)
    )
  )
}

setInterval(() => {
  const now = Date.now()
  for (const [key, value] of jidCache) {
    if (!value?.exp || now > value.exp) jidCache.delete(key)
  }
  for (const [key, value] of metadataCache) {
    if (!value?.ts || now - value.ts > META_TTL) metadataCache.delete(key)
  }
}, 10 * 60_000)

export async function handler(chatUpdate) {
  this.msgqueque ||= []
  this.uptime ||= Date.now()
  if (!chatUpdate) return
  this.pushMessage(chatUpdate.messages).catch(console.error)
  let m = chatUpdate.messages[chatUpdate.messages.length - 1]
  if (!m) return
  if (global.db.data == null) await global.loadDatabase()

  try {
    m = smsg(this, m) || m
    if (!m) return
    m.exp = 0

    try {
      const user = global.db.data.users[m.sender]
      if (typeof user !== "object") global.db.data.users[m.sender] = {}
      if (user) {
        if (!("name" in user)) user.name = m.name
        if (!("exp" in user) || !isNumber(user.exp)) user.exp = 0
        if (!("coin" in user) || !isNumber(user.coin)) user.coin = 0
        if (!("bank" in user) || !isNumber(user.bank)) user.bank = 0
        if (!("level" in user) || !isNumber(user.level)) user.level = 0
        if (!("health" in user) || !isNumber(user.health)) user.health = 100
        if (!("genre" in user)) user.genre = ""
        if (!("birth" in user)) user.birth = ""
        if (!("marry" in user)) user.marry = ""
        if (!("description" in user)) user.description = ""
        if (!("packstickers" in user)) user.packstickers = null
        if (!("premium" in user)) user.premium = false
        if (!("premiumTime" in user)) user.premiumTime = 0
        if (!("banned" in user)) user.banned = false
        if (!("bannedReason" in user)) user.bannedReason = ""
        if (!("commands" in user) || !isNumber(user.commands)) user.commands = 0
        if (!("afk" in user) || !isNumber(user.afk)) user.afk = -1
        if (!("afkReason" in user)) user.afkReason = ""
        if (!("warn" in user) || !isNumber(user.warn)) user.warn = 0
      } else global.db.data.users[m.sender] = {
        name: m.name, exp: 0, coin: 0, bank: 0, level: 0, health: 100,
        genre: "", birth: "", marry: "", description: "", packstickers: null,
        premium: false, premiumTime: 0, banned: false, bannedReason: "",
        commands: 0, afk: -1, afkReason: "", warn: 0
      }
      const chat = global.db.data.chats[m.chat]
      if (typeof chat !== "object") global.db.data.chats[m.chat] = {}
      if (chat) {
        if (!("isBanned" in chat)) chat.isBanned = false
        if (!("isMute" in chat)) chat.isMute = false
        if (!("welcome" in chat)) chat.welcome = true
        if (!("sWelcome" in chat)) chat.sWelcome = ""
        if (!("sBye" in chat)) chat.sBye = ""
        if (!("detect" in chat)) chat.detect = true
        if (!("primaryBot" in chat)) chat.primaryBot = null
        if (!("modoadmin" in chat)) chat.modoadmin = false
        if (!("antiLink" in chat)) chat.antiLink = true
        if (!("nsfw" in chat)) chat.nsfw = false
        if (!("economy" in chat)) chat.economy = true
        if (!("gacha" in chat)) chat.gacha = true
      } else global.db.data.chats[m.chat] = {
        isBanned: false, isMute: false, welcome: true, sWelcome: "", sBye: "",
        detect: true, primaryBot: null, modoadmin: false, antiLink: true,
        nsfw: false, economy: true, gacha: true
      }
      const settings = global.db.data.settings[this.user.jid]
      if (typeof settings !== "object") global.db.data.settings[this.user.jid] = {}
      if (settings) {
        if (!("self" in settings)) settings.self = false
        if (!("restrict" in settings)) settings.restrict = true
        if (!("jadibotmd" in settings)) settings.jadibotmd = true
        if (!("antiPrivate" in settings)) settings.antiPrivate = false
        if (!("gponly" in settings)) settings.gponly = false
      } else global.db.data.settings[this.user.jid] = {
        self: false, restrict: true, jadibotmd: true, antiPrivate: false, gponly: false
      }
    } catch (e) {
      console.error(e)
    }

    if (typeof m.text !== "string") m.text = ""
    const user = global.db.data.users[m.sender]
    try {
      const actual = user.name || ""
      const nuevo = m.pushName || await this.getName(m.sender)
      if (typeof nuevo === "string" && nuevo.trim() && nuevo !== actual) {
        user.name = nuevo
      }
    } catch {}

    const chat = global.db.data.chats[m.chat]
    const settings = global.db.data.settings[this.user.jid]

    const alternateSender =
      m.key?.participantAlt || m.key?.senderPn || m.senderPn ||
      m.phoneNumber || ""

    const senderResolved =
      await resolveJid(m.sender, this, m.chat, alternateSender).catch(() => m.sender) ||
      m.sender

    m.senderResolved = senderResolved

    const senderIds = [
      senderResolved, m.sender, m.key?.participant, m.key?.participantAlt,
      m.key?.senderPn, m.key?.senderPnAlt, m.senderPn, m.senderPnAlt, m.phoneNumber
    ].filter(Boolean)

    const senderNumbers = [...new Set(getNumbers(senderIds))]

    const ownerNumbers = parseNumbers(global.owner)
    const modNumbers = parseNumbers(global.mods)
    const premiumNumbers = parseNumbers(global.prems)

    const isROwner =
      Boolean(m.fromMe) || numberMatchesList(senderNumbers, ownerNumbers)
    const isOwner = isROwner
    const isMods = isOwner || numberMatchesList(senderNumbers, modNumbers)
    const isPrems =
      isOwner ||
      user.premium === true ||
      Number(user.premiumTime) > Date.now() ||
      numberMatchesList(senderNumbers, premiumNumbers)

    m.isROwner = isROwner
    m.isOwner = isOwner
    m.isMods = isMods
    m.isPrems = isPrems
    m.senderNumber = normalizeNumber(senderResolved)

    const isOwners = m.sender === this.user.jid || isROwner
    if (settings.self && !isOwners) return
    if (settings.gponly && !isOwners && !m.chat.endsWith("g.us") && !/code|p|ping|qr|estado|status|infobot|botinfo|report|reportar|invite|join|logout|suggest|help|menu/gim.test(m.text)) return

    if (global.opts["queque"] && m.text && !isPrems) {
      const queque = this.msgqueque, time = 1000 * 5
      const previousID = queque[queque.length - 1]
      queque.push(m.id || m.key.id)
      const intervalId = setInterval(async () => {
        if (queque.indexOf(previousID) === -1) clearInterval(intervalId)
        await delay(time)
      }, time)
    }

    if (m.isBaileys) return
    if (m.id.startsWith("NJX-") || (m.id.startsWith("BAE5") && m.id.length === 16) || (m.id.startsWith("B24E") && m.id.length === 20)) return

    m.exp += Math.ceil(Math.random() * 10)
    let usedPrefix

    let groupMetadata = null
    let participants = []
    if (m.isGroup) {
      groupMetadata = getCachedMetadata(m.chat) || await fetchGroupMetadataDeduped(this, m.chat)
      participants = groupMetadata?.participants || []
    }

    const findParticipant = target => {
      if (!target || !participants.length) return {}
      return participants.find(p => participantMatches(p, target)) || {}
    }

    const botJid = this.user?.id || this.user?.jid || this.user?.lid
    const botRealJid =
      await resolveJid(botJid, this, m.chat, this.user?.phoneNumber || this.user?.pn).catch(() => botJid) ||
      botJid

    const userGroup =
      findParticipant(senderResolved) ||
      findParticipant(alternateSender) ||
      findParticipant(m.sender) ||
      {}

    const botGroup =
      findParticipant(botRealJid) ||
      findParticipant(botJid) ||
      {}

    const isRAdmin = userGroup?.admin === "superadmin"
    const isAdmin = isRAdmin || userGroup?.admin === "admin"
    const isBotAdmin = botGroup?.admin === "admin" || botGroup?.admin === "superadmin"

    if (m.isGroup && chat?.primaryBot && chat.primaryBot !== this.user.jid) {
      const primaryBotJid = chat.primaryBot
      const primaryBotConn = (global.conns || []).find(c => c.user?.jid === primaryBotJid && c.ws?.socket && c.ws.socket.readyState !== ws.CLOSED)
      const primaryBotInGroup = participants.some(p => participantMatches(p, primaryBotJid))
      if ((primaryBotConn && primaryBotInGroup) || primaryBotJid === global.conn.user.jid) {
        return
      } else {
        chat.primaryBot = null
      }
    }

    const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), "./plugins")
    for (const name in global.plugins) {
      const plugin = global.plugins[name]
      if (!plugin) continue
      if (plugin.disabled) continue
      const __filename = join(___dirname, name)

      if (typeof plugin.all === "function") {
        try {
          await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename, user, chat, settings })
        } catch (err) { console.error(err) }
      }

      if (!global.opts["restrict"])
        if (plugin.tags && plugin.tags.includes("admin")) continue

      const strRegex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&")
      const pluginPrefix = plugin.customPrefix || this.prefix || global.prefix
      const match = (pluginPrefix instanceof RegExp ?
        [[pluginPrefix.exec(m.text), pluginPrefix]] :
        Array.isArray(pluginPrefix) ?
          pluginPrefix.map(prefix => {
            const regex = prefix instanceof RegExp ? prefix : new RegExp(strRegex(prefix))
            return [regex.exec(m.text), regex]
          }) : typeof pluginPrefix === "string" ?
            [[new RegExp(strRegex(pluginPrefix)).exec(m.text), new RegExp(strRegex(pluginPrefix))]] :
            [[[], new RegExp]]).find(prefix => prefix[1])

      if (typeof plugin.before === "function") {
        if (await plugin.before.call(this, m, {
          match, conn: this, participants, groupMetadata, userGroup, botGroup,
          isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems,
          chatUpdate, __dirname: ___dirname, __filename, user, chat, settings
        })) continue
      }

      if (typeof plugin !== "function") continue

      if ((usedPrefix = (match[0] || "")[0])) {
        const noPrefix = m.text.replace(usedPrefix, "")
        let [command, ...args] = noPrefix.trim().split(" ").filter(v => v)
        args = args || []
        let _args = noPrefix.trim().split(" ").slice(1)
        let text = _args.join(" ")
        command = (command || "").toLowerCase()
        const fail = plugin.fail || global.dfail
        const isAccept = plugin.command instanceof RegExp ?
          plugin.command.test(command) :
          Array.isArray(plugin.command) ?
            plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) :
            typeof plugin.command === "string" ? plugin.command === command : false
        global.comando = command

        if (!isAccept) continue
        m.plugin = name
        global.db.data.users[m.sender].commands = (global.db.data.users[m.sender].commands || 0) + 1

        if (chat) {
          const botId = this.user.jid
          const primaryBotId = chat.primaryBot
          if (name !== "group-banchat.js" && chat?.isBanned && !isROwner) {
            if (!primaryBotId || primaryBotId === botId) {
              const aviso = `ꕥ El bot *${global.botname}* está desactivado en este grupo\n\n> ✦ Un *administrador* puede activarlo con el comando:\n> » *${usedPrefix}bot on*`.trim()
              await m.reply(aviso)
              return
            }
          }
          if (m.text && user.banned && !isROwner) {
            const mensaje = `ꕥ Estas baneado/a, no puedes usar comandos en este bot!\n\n> ● *Razón ›* ${user.bannedReason}\n\n> ● Si este Bot es cuenta oficial y tienes evidencia que respalde que este mensaje es un error, puedes exponer tu caso con un moderador.`.trim()
            if (!primaryBotId || primaryBotId === botId) {
              m.reply(mensaje)
              return
            }
          }
        }

        const adminMode = chat.modoadmin || false
        if (adminMode && !isOwner && m.isGroup && !isAdmin) return

        if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) { fail("owner", m, this); continue }
        if (plugin.rowner && !isROwner) { fail("rowner", m, this); continue }
        if (plugin.owner && !isOwner) { fail("owner", m, this); continue }
        if (plugin.premium && !isPrems) { fail("premium", m, this); continue }
        if (plugin.group && !m.isGroup) { fail("group", m, this); continue }
        else if (plugin.botAdmin && !isBotAdmin) { fail("botAdmin", m, this); continue }
        else if (plugin.admin && !isAdmin) { fail("admin", m, this); continue }

        m.isCommand = true
        m.exp += plugin.exp ? parseInt(plugin.exp) : 10
        let extra = {
          match, usedPrefix, noPrefix, _args, args, command, text,
          conn: this, participants, groupMetadata, userGroup, botGroup,
          isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems,
          chatUpdate, __dirname: ___dirname, __filename, user, chat, settings
        }
        try {
          await plugin.call(this, m, extra)
        } catch (err) {
          m.error = err
          console.error(err)
        } finally {
          if (typeof plugin.after === "function") {
            try { await plugin.after.call(this, m, extra) }
            catch (err) { console.error(err) }
          }
        }
      }
    }
  } catch (err) {
    console.error(err)
  } finally {
    if (global.opts["queque"] && m?.text) {
      const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id)
      if (quequeIndex !== -1) this.msgqueque.splice(quequeIndex, 1)
    }
    if (m && m.sender) {
      const u = global.db.data.users[m.sender]
      if (u) u.exp += m.exp
    }
    try {
      if (!global.opts["noprint"]) await (await import("./lib/print.js")).default(m, this)
    } catch (err) {
      console.warn(err)
      console.log(m?.message)
    }
  }
}

global.dfail = (type, m, conn) => {
  const msg = {
    rowner: `🍡 El comando solo puede ser usado por el creadores del bot.`,
    owner: `🍡 El comando solo puede ser usado por el creador.`,
    premium: `🍡 El comando solo puede ser usado por usuarios premium.`,
    group: `🍡 El comando solo puede ser usado en grupos.`,
    admin: `🍡 Este comando solo puede ser usado por los administradores del grupo.`,
    botAdmin: `🍡 Para ejecutar este comando debo ser administrador del grupo.`
  }[type]
  if (msg) return conn.reply(m.chat, msg, m).then(_ => m.react('✖️'))
}

let file = global.__filename(import.meta.url, true)
watchFile(file, async () => {
  unwatchFile(file)
  console.log(chalk.magenta("Se actualizo 'handler.js'"))
  if (global.reloadHandler) console.log(await global.reloadHandler())
})
import pkg from '@whiskeysockets/baileys'
import fs from 'fs'
import fetch from 'node-fetch'
import axios from 'axios'
import moment from 'moment-timezone'
const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = pkg

var handler = m => m
handler.all = async function (m) { 
global.canalIdM = ["120363421367237421@newsletter", "120363405880253341@newsletter"]
global.canalNombreM = ["☃️ 𝑮𝒐𝒋𝒐𝑩𝒐𝒕 - 𝑴𝑫 | 𝑶𝒇𝒇𝒊𝒄𝒊𝒂𝒍 𝑪𝒉𝒂𝒏𝒏𝒆𝒍 ᯓ🥭", "🍃┇⃟⛩️✧༚◦°𝙲 𝙰 𝚁 𝚂  𝗣𝗛𝗢𝗡𝗞⏤͟͞🇦🇱"]
global.channelRD = await getRandomChannel()

global.d = new Date(new Date + 3600000)
global.locale = 'es'
global.dia = d.toLocaleDateString(locale, {weekday: 'long'})
global.fecha = d.toLocaleDateString('es', {day: 'numeric', month: 'numeric', year: 'numeric'})
global.mes = d.toLocaleDateString('es', {month: 'long'})
global.año = d.toLocaleDateString('es', {year: 'numeric'})
global.tiempo = d.toLocaleString('en-US', {hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true})

var canal = 'https://whatsapp.com/channel/0029VbC34Nt42DchIWA0q11f' 
var canal2 = 'https://whatsapp.com/channel/0029Vb6l62A5a240y2ClLp1M'
var comunidad = 'https://whatsapp.com/channel/0029VbC34Nt42DchIWA0q11f'
var git = 'https://github.com/Shadow-nex'
var github = 'https://github.com/Carlos13ra/GOJOBOT-MD' 
var correo = 'shadowcore.xyz@gmail.com'
global.redes = [canal, comunidad, git, github, correo].getRandom()

global.nombre = m.pushName || 'Anónimo'
global.packsticker = `${botname}`
global.packsticker2 = `${nombre}`

global.fake = { contextInfo: { isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: channelRD.id, newsletterName: channelRD.name, serverMessageId: -1 }
}}, { quoted: m }

global.rcanal = { contextInfo: { isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: channelRD.id, serverMessageId: '', newsletterName: channelRD.name }, externalAdReply: { title: botname, body: dev, mediaUrl: null, description: null, previewType: "PHOTO", thumbnail: await (await fetch(icono)).buffer(), sourceUrl: redes, mediaType: 1, renderLargerThumbnail: false }, mentionedJid: null }}
}

export default handler

function pickRandom(list) {
return list[Math.floor(Math.random() * list.length)]
}

async function getRandomChannel() {
let randomIndex = Math.floor(Math.random() * canalIdM.length)
let id = canalIdM[randomIndex]
let name = canalNombreM[randomIndex]
return { id, name }
}

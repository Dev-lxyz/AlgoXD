import { watchFile, unwatchFile } from "fs"
import chalk from "chalk"
import { fileURLToPath } from "url"
import fs from "fs"

global.botNumber = "" 
global.owner = ["51963315293", "51934053286"]
global.prems = ["51934053286"]


global.prefix = /^[#!./-]/
global.vs = "^3.0 • Latest"
global.sessions = "Sessions/Principal"
global.jadi = "Sessions/SubBot"
global.kanekiAIJadibts = true

global.botname = "𓏲 🎃᪶   ๋  # Satoru Gojo-Bot ⎯꯭༉"
global.namebot = "Satoru Gojo"
global.dev = "ᴍᴀᴅᴇ ᴡɪᴛʜ ʙʏ ᴄᴀʀʟᴏs.ʀᴠ ©"
global.currency = "g᥆𝗍іᥴᥲs"
global.banner = "https://raw.githubusercontent.com/Dev-lxyz/upload/main/uploads/0wfrp.jpeg"
global.icono = "https://raw.githubusercontent.com/Dev-lxyz/upload/main/uploads/g68u4.jpeg"

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*


global.links = {
  group: "https://chat.whatsapp.com/IDo5RtlTvyt59hqj7E9O28?mode=wwt",
  community: "https://chat.whatsapp.com/IDo5RtlTvyt59hqj7E9O28?mode=wwt",
  channel: "https://whatsapp.com/channel/0029VbBGlokA89MliWWv1x16",
  github: "https://github.com/Carlos13ra/GOJOBOT-MD",
  gmail: "shadowcore.xyz@gmail.com",
  api: "https://nexus-light.onrender.com/"
}

global.api = {
  url: 'https://nexus--shadowxyz189.replit.app',
  key: '....'
}

global.ch = {
  ch1: "120363421367237421@newsletter",
  ch2: "120363421367237421@newsletter"
}

//*─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─⭒─ׄ─ׅ─ׄ─*


global.mess = {
rowner: `🎋 El comando solo puede ser usado por el creadores del bot.`,
owner: `🎋 El comando solo puede ser usado por el creador.`,
premium: `🎋 El comando solo puede ser usado por usuarios premium.`,
group: `🎋 El comando solo puede ser usado en grupos.`,
admin: `🎋 Este comando solo puede ser usado por los administradores del grupo.`,
botAdmin: `🎋 Para ejecutar este comando debo ser administrador del grupo.`
}


let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
unwatchFile(file)
console.log(chalk.redBright("Update 'settings'"))
import(`${file}?update=${Date.now()}`)
})

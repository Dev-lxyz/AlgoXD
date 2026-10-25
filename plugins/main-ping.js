import os from 'os'
import { performance } from 'perf_hooks'

let handler = async (m, { conn }) => {
  const t1 = performance.now()
  const msg = await conn.sendMessage(m.chat, { text: '`🌱 Midiendo...`' }, { quoted: m })
  const t2 = performance.now()

  const latensi = (t2 - t1).toFixed(2)
  const ramTotal = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2)
  const ramLibre = (os.freemem() / 1024 / 1024 / 1024).toFixed(2)
  const ramUso = (os.totalmem() - os.freemem()) / 1024 / 1024
  const cpus = os.cpus()
  const cpuModel = cpus[0].model.split(' @')[0]
  const load = os.loadavg()[0].toFixed(2)

  let pingEmoji =
    latensi < 50 ? '🟢 Excelente' :
    latensi < 120 ? '🟡 Bueno' :
    latensi < 200 ? '🟠 Medio' :
    '🔴 Lento'

  let teks = `*'ׄ𐚁ִㅤS T A T U S - P I N Gׄ ₍ ᐢ..ᐢ ₎'*

*｡ speed :* ${latensi} ms (${pingEmoji})
*｡ Runtime :* ${clockString(process.uptime() * 1000)}
*｡ CPU :* ${cpuModel} (${load}%)
*｡ Plataforma :* ${os.platform()} (${os.arch()})
*｡ Node :* ${process.version}
*｡ Ram :* ${ramUso.toFixed(0)} MB / ${ramTotal} GB
*｡ Free :* ${ramLibre} GB

> ${dev}`

  await conn.sendMessage(m.chat, { text: teks, edit: msg.key })
}

handler.help = ['ping']
handler.tags = ['info']
handler.command = ['ping', 'p']

export default handler

function clockString(ms) {
  let d = Math.floor(ms / 86400000)
  let h = Math.floor(ms / 3600000) % 24
  let m = Math.floor(ms / 60000) % 60
  let s = Math.floor(ms / 1000) % 60
  return [d ? `${d}d ` : '', h ? `${h}h ` : '', m ? `${m}m ` : '', `${s}s`].join('').trim()
}
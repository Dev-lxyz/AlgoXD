let handler = async (m, { conn }) => {
  await conn.relayMessage(
    m.chat,
    {
      "interactiveMessage": {
        "header": {
          "title": "⁌⁍  ㅤׅ  ㅤׄ   𝗢 𝗪 𝗡 𝗘 𝗥  🍬  𝅼   ෭ "
        },
        "body": {
          "text": "```</> Contacto oficial - Soporte / Desarrollo```"
        },
        "footer": {
          "text": dev
        },
        "nativeFlowMessage": {
          "buttons": [
            {
              "name": "booking_confirmation",
              "buttonParamsJson": JSON.stringify({
                start_datetime: "2026-06-12T12:32:04.983Z",
                end_datetime: "2026-06-12T12:42:04.983Z",
                location: "🇵🇪 Peru 🇵🇪",
                booking_url: "https://wa.me/51963315293",
                phone_number: "51963315293",
                booking_management_url: "https://wa.me/51963315293",
                description: "*◦ 🧃 Name :* espantaviejas3000 🥢\n*◦ 💎 Status :* _Creador & owner_\n",
                email: "",
                display_text: "🧋 ᴍᴀɪɴ ᴏᴡɴᴇʀ"
              })
            }
          ],
          "messageParamsJson": "{}"
        }
      }
    },
    {
      "additionalNodes": [
        {
          "tag": "biz",
          "attrs": {},
          "content": [
            {
              "tag": "interactive",
              "attrs": {
                "type": "native_flow",
                "v": "1"
              },
              "content": [
                {
                  "tag": "native_flow",
                  "attrs": {
                    "v": "9",
                    "name": "mixed"
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  )
}

handler.help = ['owner']
handler.tags = ['info']
handler.command = ['owner', 'creator', 'creador']

export default handler
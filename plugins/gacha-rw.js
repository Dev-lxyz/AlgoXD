import nodeFetch from 'node-fetch';
import axios from 'axios';
import { promises as fs } from 'fs';

const FILE_PATH = './lib/characters.json';
async function loadCharacters() {
  try {
    await fs.access(FILE_PATH);
  } catch {
    await fs.writeFile(FILE_PATH, '{}');
  }
  const fileContent = await fs.readFile(FILE_PATH, 'utf-8');
  return JSON.parse(fileContent);
}

function flattenCharacters(characters) {
  return Object.entries(characters).flatMap(
    (entry) => (Array.isArray(entry[1]['characters']) ? entry[1]['characters'] : [])
  );
}

function getSeriesNameByCharacter(characters, characterId) {
  return (
    Object.entries(characters).find(
      ([, series]) =>
        Array.isArray(series['characters']) &&
        series['characters'].some((char) => String(char['id']) === String(characterId))
    )?.[1]?.['name'] || 'Desconocido'
  );
}

function formatTag(tag) {
  return String(tag).toLowerCase().trim().replace(/\s+/g, '_');
}

async function buscarImagenDelirius(tag) {
  const query = formatTag(tag);
  const sources = [
    { url: `https://safebooru.org/index.php?page=dapi&s=post&q=index&json=1&tags=${query}&limit=100`, extract: (data) => {
        const posts = Array.isArray(data) ? data : data?.post || [];
        return posts.map(i => i?.file_url || (i?.directory && i?.image ? `https://safebooru.org/images/${i.directory}/${i.image}` : null)).filter(u => typeof u === 'string' && /\.(jpe?g|png)(\?.*)?$/i.test(u));
    }},
    { url: `https://danbooru.donmai.us/posts.json?tags=${query}&limit=100`, extract: (data) => {
        const posts = Array.isArray(data) ? data : [];
        return posts.map(i => i?.file_url || i?.large_file_url).filter(u => typeof u === 'string' && /\.(jpe?g|png)(\?.*)?$/i.test(u));
    }},
    { url: `https://gelbooru.com/index.php?page=dapi&s=post&q=index&json=1&tags=${query}&limit=100&api_key=98f554258c88c44f4dd28ccde0c28f36682b2a992490ab35ebcc7baf7e196a86d7550b174bce577b8cc3f544e9b3ad0f6aeb09ad63bf89a9141cc3eddb6fbfd2&user_id=1917269`, extract: (data) => {
        const posts = Array.isArray(data) ? data : data?.post || data?.data || [];
        return posts.map(i => i?.file_url).filter(u => typeof u === 'string' && /\.(jpe?g|png)(\?.*)?$/i.test(u));
    }}
  ];
  const results = await Promise.allSettled(sources.map(async (source) => {
    const res = await axios.get(source.url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, timeout: 8000 });
    return source.extract(res.data);
  }));
  const allUrls = results.filter(r => r.status === 'fulfilled' && r.value.length > 0).flatMap(r => r.value);
  return [...new Set(allUrls)];
}

const handler = async (message, { conn, usedPrefix, command }) => {
  
  const chats = global.db.data.chats;
  if (!chats[message.chat]) chats[message.chat] = {};
  const chatData = chats[message.chat];
  if (!chatData.characters) chatData.characters = {};

  if (!chatData.gacha && message.isGroup) {
    return message.reply(
      `ꕥ Los comandos de *Gacha* están desactivados en este grupo.\n\nUn *administrador* puede activarlos con el comando:\n» *${usedPrefix}gacha on*`
    );
  }

  const userData = global.db.data.users[message.sender];
  const currentTime = Date.now();
  const COOLDOWN_TIME = 15 * 60 * 1000;
  if (userData.reservedUntil && currentTime < userData.reservedUntil) {
    const remainingSeconds = Math.ceil((userData.reservedUntil - currentTime) / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;

    let timeString = '';
    if (minutes > 0) timeString += minutes + ' minuto' + (minutes !== 1 ? 's' : '') + ' ';
    if (seconds > 0 || timeString === '') timeString += seconds + ' segundo' + (seconds !== 1 ? 's' : '');

    return message.reply(
      `ꕥ Debes esperar *${timeString.trim()}* para usar *${usedPrefix}${command}* de nuevo.`
    );
  }

  try {
    const allCharacters = await loadCharacters();
    const flatCharacters = flattenCharacters(allCharacters);
    const randomCharacter = flatCharacters[Math.floor(Math.random() * flatCharacters.length)];
    const characterId = String(randomCharacter.id);
    const seriesName = getSeriesNameByCharacter(allCharacters, randomCharacter.id);
    const tag = formatTag(randomCharacter.tags?.[0] || '');
    const imageUrls = await buscarImagenDelirius(tag);
    const selectedImage = imageUrls[Math.floor(Math.random() * imageUrls.length)];

    if (!selectedImage) {
      return message.reply(`ꕥ No se encontró imágenes para el personaje *${randomCharacter.name}*.`);
    }

    if (!global.db.data.characters) global.db.data.characters = {};
    if (!global.db.data.characters[characterId]) global.db.data.characters[characterId] = {};

    const characterData = global.db.data.characters[characterId];
    const existingData = global.db.data.characters?.[characterId] || {};

    characterData.name = String(randomCharacter.name || 'Sin nombre');
    characterData.value = typeof existingData.value === 'number' ? existingData.value : Number(randomCharacter.value) || 100;
    characterData.votes = Number(characterData.votes || existingData.votes || 0);
    characterData.reservedBy = message.sender;
    characterData.reservedUntil = currentTime + 0x4e20; // 20 minutos
    characterData.expiresAt = currentTime + 0xea60; // 60 minutos

    let userName = 'desconocido';
    if (typeof characterData.user === 'string' && characterData.user.trim()) {
      userName =
        global.db.data.users[characterData.user]?.name?.trim() ||
        (await conn.getName(characterData.user)
          .then((name) => (typeof name === 'string' && name.trim() ? name : characterData.user.split('@')[0]))
          .catch(() => characterData.user.split('@')[0]));
    }

    const messageText =
      `❀ Nombre » *${characterData.name}*\n⚥ Género » *${randomCharacter.gender || 'Desconocido'}*\n✰ Valor » *${characterData.value.toLocaleString()}*\n♡ Estado » *${
        characterData.user ? 'Reclamado por ' + userName : 'Libre'
      }*\n❖ Fuente » *${seriesName}*`;

    const sentMessage = await conn.sendFile(message.chat, selectedImage, randomCharacter.name + '.jpg', messageText, message);

    chatData.lastRolledId = characterId;
    chatData.lastRolledMsgId = sentMessage.message?.id || null;
    chatData.lastRolledCharacter = {
      id: characterId,
      name: characterData.name,
      media: selectedImage,
    };

    userData.reservedUntil = currentTime + COOLDOWN_TIME;
  } catch (error) {
    await conn.reply(
      message.chat,
      `⚠︎ Se ha producido un problema.\n> Usa *${usedPrefix}report* para informarlo.\n\n${error.message}`,
      message
    );
  }
};

handler.help = ['gacha', 'rw', 'rollwaifu'];
handler.tags = ['gacha'];
handler.command = ['rollwaifu', 'rw', 'rollwaifu'];

export default handler;
import { cmd } from '../lib/command.js'
import { fetchJson } from '../lib/functions.js'
import { pick, truncate } from '../lib/helpers.js'

const WAIFU = 'https://api.waifu.pics/sfw'
const NEKOS = 'https://nekos.life/api/v2/img'

async function sendWaifu(sock, m, endpoint, caption) {
  try {
    const data = await fetchJson(`${WAIFU}/${endpoint}`)
    if (!data?.url) throw new Error('No media URL')
    const isGif = data.url.endsWith('.gif')
    if (isGif) await sock.sendMessage(m.chat, { video: { url: data.url }, gifPlayback: true, caption }, { quoted: m })
    else await sock.sendMessage(m.chat, { image: { url: data.url }, caption }, { quoted: m })
  } catch (error) {
    await m.reply(`Anime media failed (${endpoint}): ${error.message}`)
  }
}

async function sendNekos(sock, m, endpoint, caption) {
  try {
    const data = await fetchJson(`${NEKOS}/${endpoint}`)
    if (!data?.url) throw new Error('No media URL')
    await sock.sendMessage(m.chat, { image: { url: data.url }, caption }, { quoted: m })
  } catch (error) {
    await m.reply(`Nekos API failed (${endpoint}): ${error.message}`)
  }
}

const actionMap = [
  ['cuddle', 'cuddle'],
  ['feed', 'feed'],
  ['hug', 'hug'],
  ['kiss', 'kiss'],
  ['pat', 'pat'],
  ['slap', 'slap'],
  ['smug', 'smug'],
  ['tickle', 'tickle']
]

export default [
  cmd('anime', { category: 'anime', desc: 'Random anime image' }, async (sock, m, args) => {
    const q = args.join(' ') || 'anime'
    try {
      const data = await fetchJson(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=1`)
      const item = data?.data?.[0]
      if (!item) throw new Error('No results')
      const caption = `*${item.title}*\nScore: ${item.score || '-'}\nEpisodes: ${item.episodes || '-'}\n${truncate(item.synopsis || '', 700)}`
      if (item.images?.jpg?.image_url) {
        await sock.sendMessage(m.chat, { image: { url: item.images.jpg.image_url }, caption }, { quoted: m })
      } else await m.reply(caption)
    } catch (error) {
      await m.reply(`Anime search failed: ${error.message}`)
    }
  }),

  cmd('animegif', { category: 'anime', desc: 'Random anime gif' }, async (sock, m) => {
    await sendWaifu(sock, m, 'dance', 'anime gif')
  }),

  cmd('animenews', { category: 'anime', desc: 'Latest anime news' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://api.jikan.moe/v4/recommendations/anime')
      const rows = (data?.data || []).slice(0, 5)
      if (!rows.length) throw new Error('No news')
      await m.reply(
        rows
          .map((row, i) => `${i + 1}. ${row.entry?.map((e) => e.title).join(' / ')}\n${truncate(row.content || '', 180)}`)
          .join('\n\n')
      )
    } catch (error) {
      await m.reply(`Anime news failed: ${error.message}`)
    }
  }),

  cmd('animequote', { category: 'anime', desc: 'Random anime quote' }, async (sock, m) => {
    const fallback = [
      { anime: 'Naruto', character: 'Naruto Uzumaki', quote: 'I never go back on my word. That is my nindo.' },
      { anime: 'One Piece', character: 'Monkey D. Luffy', quote: 'If you don\'t take risks, you can\'t create a future.' }
    ]
    try {
      const data = await fetchJson('https://api.animechan.io/v1/quotes/random')
      const q = data?.data || data
      if (!q?.quote && !q?.content) throw new Error('empty')
      await m.reply(`*${q.character?.name || q.character} — ${q.anime?.name || q.anime}*\n"${q.quote || q.content}"`)
    } catch {
      const q = pick(fallback)
      await m.reply(`*${q.character} — ${q.anime}*\n"${q.quote}"`)
    }
  }),

  cmd('animerec', { category: 'anime', desc: 'Anime recommendation' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://api.jikan.moe/v4/random/anime')
      const item = data?.data
      if (!item) throw new Error('No recommendation')
      await m.reply(`*Watch:* ${item.title}\nType: ${item.type}\nScore: ${item.score || '-'}\n${truncate(item.synopsis || '', 500)}`)
    } catch (error) {
      await m.reply(`Recommendation failed: ${error.message}`)
    }
  }),

  cmd('character', { category: 'anime', desc: 'Search anime character' }, async (sock, m, args) => {
    const q = args.join(' ')
    if (!q) {
      await m.reply('Usage: .character Luffy')
      return
    }
    try {
      const data = await fetchJson(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(q)}&limit=1`)
      const item = data?.data?.[0]
      if (!item) throw new Error('No character')
      const caption = `*${item.name}*\n${truncate(item.about || '', 700)}`
      if (item.images?.jpg?.image_url) {
        await sock.sendMessage(m.chat, { image: { url: item.images.jpg.image_url }, caption }, { quoted: m })
      } else await m.reply(caption)
    } catch (error) {
      await m.reply(`Character search failed: ${error.message}`)
    }
  }),

  cmd('foxgirl', { category: 'anime', desc: 'Foxgirl image' }, async (sock, m) => sendNekos(sock, m, 'fox_girl', 'foxgirl')),
  cmd('goose', { category: 'anime', desc: 'Goose image' }, async (sock, m) => sendNekos(sock, m, 'goose', 'goose')),
  cmd('lizard', { category: 'anime', desc: 'Lizard image' }, async (sock, m) => sendNekos(sock, m, 'lizard', 'lizard')),

  cmd('manga', { category: 'anime', desc: 'Search manga' }, async (sock, m, args) => {
    const q = args.join(' ')
    if (!q) {
      await m.reply('Usage: .manga Naruto')
      return
    }
    try {
      const data = await fetchJson(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q)}&limit=1`)
      const item = data?.data?.[0]
      if (!item) throw new Error('No manga')
      await m.reply(`*${item.title}*\nChapters: ${item.chapters || '-'}\nScore: ${item.score || '-'}\n${truncate(item.synopsis || '', 600)}`)
    } catch (error) {
      await m.reply(`Manga search failed: ${error.message}`)
    }
  }),

  cmd('season', { category: 'anime', desc: 'Current anime season' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://api.jikan.moe/v4/seasons/now?limit=10')
      const rows = data?.data || []
      if (!rows.length) throw new Error('No season data')
      await m.reply(rows.map((item, i) => `${i + 1}. ${item.title} (${item.type || 'TV'})`).join('\n'))
    } catch (error) {
      await m.reply(`Season list failed: ${error.message}`)
    }
  }),

  ...actionMap.map(([name, endpoint]) =>
    cmd(name, { category: 'anime', desc: `${name} gif` }, async (sock, m) => sendWaifu(sock, m, endpoint, name))
  )
]

import { writeFileSync, readFileSync } from 'fs'
import { cmd } from '../lib/command.js'
import { hasFfmpeg, runFfmpeg, tmpFile, cleanup, missingApi, downloadUrl } from '../lib/functions.js'
import { ephotoProvider, apiError } from '../lib/providers.js'
import { fetchJson } from '../lib/functions.js'
import { truncate } from '../lib/helpers.js'
import config from '../config.js'

const filters = {
  '8daudio': 'apulsator=hz=0.125',
  bassboost: 'bass=g=10',
  black: 'volume=1.5',
  blown: 'acrusher=.1:1:64:0:log',
  chipmunk: 'asetrate=44100*1.3,aresample=44100',
  deep: 'asetrate=44100*0.8,aresample=44100',
  earrape: 'volume=12',
  echo: 'aecho=0.8:0.9:1000:0.3',
  fast: 'atempo=1.35',
  fat: 'asetrate=44100*0.8,atempo=1.1',
  flanger: 'flanger',
  nightcore: 'asetrate=44100*1.25,aresample=44100,atempo=1.05',
  reverb: 'aecho=0.8:0.9:1000:0.3',
  reverse: 'areverse',
  robot: 'afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\'',
  slow: 'atempo=0.8',
  slowed: 'atempo=0.7',
  smooth: 'lowpass=f=3000',
  squirrel: 'asetrate=44100*1.4,aresample=44100',
  tremolo: 'tremolo',
  vibrato: 'vibrato=f=6'
}

async function applyFilter(sock, m, filter) {
  const target = m.type === 'audioMessage' || m.type === 'videoMessage' ? m : m.quoted
  if (!target?.download) {
    await m.reply('Reply to an audio or video message.')
    return
  }
  if (!(await hasFfmpeg())) {
    await m.reply('FFmpeg is not installed.')
    return
  }
  try {
    const buffer = await target.download()
    const input = tmpFile('src')
    const output = tmpFile('mp3')
    writeFileSync(input, buffer)
    await runFfmpeg(['-i', input, '-af', filter, output])
    const out = readFileSync(output)
    cleanup(input, output)
    await sock.sendMessage(m.chat, { audio: out, mimetype: 'audio/mpeg', ptt: false }, { quoted: m })
  } catch (error) {
    await m.reply(`Audio filter failed: ${error.message}`)
  }
}

const audioCmds = Object.entries(filters).map(([name, filter]) =>
  cmd(name, { category: 'audio', desc: `${name} audio filter` }, async (sock, m) => applyFilter(sock, m, filter))
)

audioCmds.push(
  cmd('tomp3', { category: 'audio', desc: 'Convert to mp3' }, async (sock, m) => applyFilter(sock, m, 'anull')),
  cmd('toptt', { category: 'audio', desc: 'Convert to voice note' }, async (sock, m) => {
    const target = m.quoted || m
    if (!target?.download) {
      await m.reply('Reply to audio.')
      return
    }
    if (!(await hasFfmpeg())) {
      await m.reply('FFmpeg required.')
      return
    }
    try {
      const buffer = await target.download()
      const input = tmpFile('src')
      const output = tmpFile('ogg')
      writeFileSync(input, buffer)
      await runFfmpeg(['-i', input, '-c:a', 'libopus', '-b:a', '64k', output])
      const out = readFileSync(output)
      cleanup(input, output)
      await sock.sendMessage(m.chat, { audio: out, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m })
    } catch (error) {
      await m.reply(error.message)
    }
  }),
  cmd('volaudio', { category: 'audio', desc: 'Change audio volume' }, async (sock, m, args) => {
    const vol = Number(args[0] || 2)
    await applyFilter(sock, m, `volume=${Math.min(Math.max(vol, 0.1), 5)}`)
  })
)

const ephotoEffects = [
  '1917style', 'advancedglow', 'blackpinklogo', 'blackpinkstyle', 'cartoonstyle', 'deletingtext',
  'dragonball', 'effectclouds', 'flag3dtext', 'flagtext', 'freecreate', 'galaxystyle',
  'galaxywallpaper', 'glitchtext', 'glowingtext', 'gradienttext', 'graffiti', 'incandescent',
  'lighteffects', 'logomaker', 'luxurygold', 'makingneon', 'matrix', 'multicoloredneon',
  'neonglitch', 'papercutstyle', 'pixelglitch', 'royaltext', 'sand', 'summerbeach',
  'topography', 'watercolortext', 'writetext'
]

const ephotoCmds = ephotoEffects.map((effect) =>
  cmd(effect, { category: 'ephoto', desc: `Ephoto360 ${effect}` }, async (sock, m, args) => {
    const text = args.join(' ')
    if (!text) {
      await m.reply(`Usage: .${effect} <text>`)
      return
    }
    if (!config.apis.ephoto) {
      await m.reply(missingApi('Ephoto360', 'EPHOTO_API_URL'))
      return
    }
    try {
      const url = await ephotoProvider(effect, text)
      const image = await downloadUrl(url)
      await sock.sendMessage(m.chat, { image, caption: effect }, { quoted: m })
    } catch (error) {
      await m.reply(apiError(error))
    }
  })
)

const gfxNames = ['gfx2', 'gfx3', 'gfx4', 'gfx5', 'gfx6', 'gfx7', 'gfx8', 'gfx9', 'gfx10', 'gfx11', 'gfx12']
const imageCmds = [
  cmd('carbon', { category: 'image', desc: 'Carbon code image needs API' }, async (sock, m) => {
    await m.reply(missingApi('Carbon', 'CARBON_API_URL'))
  }),
  cmd('invert', { category: 'image', desc: 'Invert image via ffmpeg' }, async (sock, m) => {
    const target = m.quoted || m
    if (!target?.download) {
      await m.reply('Reply to an image.')
      return
    }
    if (!(await hasFfmpeg())) {
      await m.reply('FFmpeg required.')
      return
    }
    try {
      const buffer = await target.download()
      const input = tmpFile('jpg')
      const output = tmpFile('jpg')
      writeFileSync(input, buffer)
      await runFfmpeg(['-i', input, '-vf', 'negate', output])
      const out = readFileSync(output)
      cleanup(input, output)
      await sock.sendMessage(m.chat, { image: out, caption: 'invert' }, { quoted: m })
    } catch (error) {
      await m.reply(error.message)
    }
  }),
  cmd('jail', { category: 'image', desc: 'Jail overlay needs asset API' }, async (sock, m) => {
    await m.reply('Jail/wanted overlays need a graphics API. Not faked.')
  }),
  cmd('naturewlp', { category: 'image', desc: 'Nature wallpaper' }, async (sock, m) => {
    try {
      await sock.sendMessage(m.chat, { image: { url: 'https://picsum.photos/800/600' }, caption: 'nature/random' }, { quoted: m })
    } catch (error) {
      await m.reply(error.message)
    }
  }),
  cmd('rainbow', { category: 'image', desc: 'Rainbow hue via ffmpeg' }, async (sock, m) => {
    const target = m.quoted || m
    if (!target?.download) {
      await m.reply('Reply to an image.')
      return
    }
    if (!(await hasFfmpeg())) {
      await m.reply('FFmpeg required.')
      return
    }
    try {
      const buffer = await target.download()
      const input = tmpFile('jpg')
      const output = tmpFile('jpg')
      writeFileSync(input, buffer)
      await runFfmpeg(['-i', input, '-vf', 'hue=h=90', output])
      const out = readFileSync(output)
      cleanup(input, output)
      await sock.sendMessage(m.chat, { image: out, caption: 'rainbow' }, { quoted: m })
    } catch (error) {
      await m.reply(error.message)
    }
  }),
  cmd('remini', { category: 'image', desc: 'Enhance API' }, async (sock, m) => {
    await m.reply(missingApi('Remini/enhance', 'REMINI_API_URL'))
  }),
  cmd('wallpaper', { category: 'image', desc: 'Random wallpaper' }, async (sock, m) => {
    await sock.sendMessage(m.chat, { image: { url: 'https://picsum.photos/1080/1920' }, caption: 'wallpaper' }, { quoted: m }).catch(async (e) => m.reply(e.message))
  }),
  cmd('wanted', { category: 'image', desc: 'Wanted poster API' }, async (sock, m) => {
    await m.reply(missingApi('Wanted overlay', 'EPHOTO_API_URL'))
  }),
  cmd('wasted', { category: 'image', desc: 'Wasted overlay API' }, async (sock, m) => {
    await m.reply(missingApi('Wasted overlay', 'EPHOTO_API_URL'))
  }),
  ...gfxNames.map((name) =>
    cmd(name, { category: 'image', desc: `${name} logo` }, async (sock, m, args) => {
      if (!args[0]) {
        await m.reply(`Usage: .${name} text`)
        return
      }
      await m.reply(missingApi('GFX/Ephoto', 'EPHOTO_API_URL'))
    })
  )
]

const searchCmds = [
  cmd('book', { category: 'search', desc: 'Open Library search' }, async (sock, m, args) => {
    const q = args.join(' ')
    if (!q) {
      await m.reply('Usage: .book dune')
      return
    }
    try {
      const data = await fetchJson(`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=3`)
      const docs = data.docs || []
      if (!docs.length) throw new Error('No books')
      await m.reply(docs.map((d) => `*${d.title}* — ${(d.author_name || []).join(', ')}`).join('\n'))
    } catch (error) {
      await m.reply(error.message)
    }
  }),
  cmd('define', { category: 'search', desc: 'Dictionary' }, async (sock, m, args) => {
    const q = args[0]
    if (!q) {
      await m.reply('Usage: .define hello')
      return
    }
    try {
      const data = await fetchJson(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`)
      const def = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition
      if (!def) throw new Error('No definition')
      await m.reply(`*${q}*\n${def}`)
    } catch (error) {
      await m.reply(`Define failed: ${error.message}`)
    }
  }),
  cmd('element', { category: 'search', desc: 'Periodic element' }, async (sock, m, args) => {
    const q = args.join(' ')
    if (!q) {
      await m.reply('Usage: .element oxygen')
      return
    }
    try {
      const data = await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`)
      await m.reply(truncate(`*${data.title}*\n${data.extract || ''}`))
    } catch (error) {
      await m.reply(`Element lookup failed: ${error.message}`)
    }
  }),
  cmd('imdb', { category: 'search', desc: 'OMDb requires a key' }, async (sock, m, args) => {
    if (!args[0]) {
      await m.reply('Usage: .imdb Inception')
      return
    }
    await m.reply(missingApi('OMDb', 'OMDB_API_KEY'))
  }),
  cmd('lyrics', { category: 'search', desc: 'Lyrics via lyrics.ovh' }, async (sock, m, args) => {
    const [artist, ...rest] = args.join(' ').split('|').map((s) => s.trim())
    const title = rest.join(' ')
    if (!artist || !title) {
      await m.reply('Usage: .lyrics artist | title')
      return
    }
    try {
      const data = await fetchJson(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`)
      if (!data?.lyrics) throw new Error('No lyrics')
      await m.reply(truncate(data.lyrics))
    } catch (error) {
      await m.reply(`Lyrics failed: ${error.message}`)
    }
  }),
  cmd('namemeaning', { category: 'search', desc: 'Name meaning via dictionary fallback' }, async (sock, m, args) => {
    if (!args[0]) {
      await m.reply('Usage: .namemeaning Aria')
      return
    }
    await m.reply(`No free official name-meaning API is bundled. Try .define ${args[0]} or .wiki ${args[0]}`)
  }),
  cmd('npm', { category: 'search', desc: 'npm package search' }, async (sock, m, args) => {
    if (!args[0]) {
      await m.reply('Usage: .npm axios')
      return
    }
    try {
      const data = await fetchJson(`https://registry.npmjs.org/${encodeURIComponent(args[0])}`)
      await m.reply(`*${data.name}*\n${data.description || ''}\nLatest: ${data['dist-tags']?.latest}\n${data.homepage || ''}`)
    } catch (error) {
      await m.reply(error.message)
    }
  }),
  cmd('shazam', { category: 'search', desc: 'Audio recognition API' }, async (sock, m) => {
    await m.reply(missingApi('Audd/Shazam', 'AUDD_API_KEY'))
  }),
  cmd('songscan', { category: 'search', desc: 'Audio recognition API' }, async (sock, m) => {
    await m.reply(missingApi('Audd/Shazam', 'AUDD_API_KEY'))
  }),
  cmd('tiktoksearch', { category: 'search', desc: 'TikTok search needs provider' }, async (sock, m) => {
    await m.reply(missingApi('TikTok search', 'DOWNLOAD_API_URL'))
  }),
  cmd('websearch', { category: 'search', desc: 'DuckDuckGo instant answer' }, async (sock, m, args) => {
    const q = args.join(' ')
    if (!q) {
      await m.reply('Usage: .websearch query')
      return
    }
    try {
      const data = await fetchJson(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1`)
      const text = data.AbstractText || data.Heading || 'No instant answer'
      await m.reply(truncate(`${text}\n${data.AbstractURL || ''}`))
    } catch (error) {
      await m.reply(error.message)
    }
  }),
  cmd('wiki', { category: 'search', desc: 'Wikipedia summary' }, async (sock, m, args) => {
    const q = args.join(' ')
    if (!q) {
      await m.reply('Usage: .wiki Node.js')
      return
    }
    try {
      const data = await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q)}`)
      await m.reply(truncate(`*${data.title}*\n${data.extract || ''}\n${data.content_urls?.desktop?.page || ''}`))
    } catch (error) {
      await m.reply(`Wiki failed: ${error.message}`)
    }
  }),
  cmd('yts', { category: 'search', desc: 'YouTube search needs provider' }, async (sock, m, args) => {
    if (!args[0]) {
      await m.reply('Usage: .yts query')
      return
    }
    await m.reply(missingApi('YouTube search', 'DOWNLOAD_API_URL'))
  })
]

const videoCmds = [
  cmd('volvideo', { category: 'video', desc: 'Change video volume' }, async (sock, m, args) => {
    const vol = Number(args[0] || 2)
    const target = m.quoted || m
    if (!target?.download) {
      await m.reply('Reply to a video.')
      return
    }
    if (!(await hasFfmpeg())) {
      await m.reply('FFmpeg required.')
      return
    }
    try {
      const buffer = await target.download()
      const input = tmpFile('mp4')
      const output = tmpFile('mp4')
      writeFileSync(input, buffer)
      await runFfmpeg(['-i', input, '-af', `volume=${Math.min(Math.max(vol, 0.1), 5)}`, output])
      const out = readFileSync(output)
      cleanup(input, output)
      await sock.sendMessage(m.chat, { video: out, caption: 'volume updated' }, { quoted: m })
    } catch (error) {
      await m.reply(error.message)
    }
  }),
  cmd('webp2mp4', { category: 'video', desc: 'Webp to mp4' }, async (sock, m) => {
    const target = m.quoted || m
    if (!target?.download) {
      await m.reply('Reply to a sticker.')
      return
    }
    if (!(await hasFfmpeg())) {
      await m.reply('FFmpeg required.')
      return
    }
    try {
      const buffer = await target.download()
      const input = tmpFile('webp')
      const output = tmpFile('mp4')
      writeFileSync(input, buffer)
      await runFfmpeg(['-i', input, '-movflags', 'faststart', '-pix_fmt', 'yuv420p', output])
      const out = readFileSync(output)
      cleanup(input, output)
      await sock.sendMessage(m.chat, { video: out }, { quoted: m })
    } catch (error) {
      await m.reply(error.message)
    }
  })
]

export default [...audioCmds, ...ephotoCmds, ...imageCmds, ...searchCmds, ...videoCmds]

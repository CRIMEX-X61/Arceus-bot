import { createHash, randomBytes } from 'crypto'
import { writeFileSync, readFileSync } from 'fs'
import { cmd } from '../lib/command.js'
import { fetchJson, missingApi, tmpFile, cleanup, runFfmpeg, hasFfmpeg } from '../lib/functions.js'
import { isUrl, toPnJid, truncate, pick } from '../lib/helpers.js'

const fancyFonts = {
  bold: (s) => s.replace(/[A-Za-z]/g, (c) => {
    const base = c === c.toUpperCase() ? 0x1d5d4 : 0x1d5ee
    return String.fromCodePoint(base + c.toLowerCase().charCodeAt(0) - 97)
  })
}

function romanize(num) {
  const map = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ]
  let n = Number(num)
  if (!Number.isInteger(n) || n < 1 || n > 3999) throw new Error('Use 1-3999')
  let out = ''
  for (const [v, s] of map) {
    while (n >= v) {
      out += s
      n -= v
    }
  }
  return out
}

export default [
  cmd('addnote', { category: 'tools', desc: 'Save a note' }, async (sock, m, args, ctx) => {
    const text = args.join(' ')
    if (!text) {
      await m.reply('Usage: .addnote text')
      return
    }
    if (!ctx.db.data.notes[m.sender]) ctx.db.data.notes[m.sender] = []
    ctx.db.data.notes[m.sender].push({ text, at: Date.now() })
    ctx.db.save()
    await m.reply(`Note #${ctx.db.data.notes[m.sender].length} saved.`)
  }),
  cmd('getnote', { category: 'tools', desc: 'Get a note by index' }, async (sock, m, args, ctx) => {
    const notes = ctx.db.data.notes[m.sender] || []
    const i = Number(args[0]) - 1
    if (!notes[i]) {
      await m.reply('Usage: .getnote 1')
      return
    }
    await m.reply(notes[i].text)
  }),
  cmd('getnotes', { category: 'tools', desc: 'List notes' }, async (sock, m, args, ctx) => {
    const notes = ctx.db.data.notes[m.sender] || []
    if (!notes.length) {
      await m.reply('No notes.')
      return
    }
    await m.reply(notes.map((n, i) => `${i + 1}. ${n.text}`).join('\n'))
  }),
  cmd('anagram', { category: 'tools', desc: 'Shuffle letters' }, async (sock, m, args) => {
    const word = args.join('')
    if (!word) {
      await m.reply('Usage: .anagram listen')
      return
    }
    await m.reply(word.split('').sort(() => Math.random() - 0.5).join(''))
  }),
  cmd('base64', { category: 'tools', desc: 'Encode/decode base64' }, async (sock, m, args) => {
    const mode = args[0]
    const text = args.slice(1).join(' ')
    if (!['enc', 'dec'].includes(mode) || !text) {
      await m.reply('Usage: .base64 enc|dec <text>')
      return
    }
    try {
      const out = mode === 'enc' ? Buffer.from(text).toString('base64') : Buffer.from(text, 'base64').toString('utf8')
      await m.reply(out)
    } catch (error) {
      await m.reply(error.message)
    }
  }),
  cmd('bmi', { category: 'tools', desc: 'BMI calculator' }, async (sock, m, args) => {
    const kg = Number(args[0])
    const cm = Number(args[1])
    if (!kg || !cm) {
      await m.reply('Usage: .bmi 70 175')
      return
    }
    const bmi = kg / (cm / 100) ** 2
    await m.reply(`BMI: ${bmi.toFixed(2)}`)
  }),
  cmd('browse', { category: 'tools', desc: 'Fetch page title' }, async (sock, m, args) => {
    const url = args[0]
    if (!isUrl(url)) {
      await m.reply('Usage: .browse https://example.com')
      return
    }
    try {
      const { data } = await (await import('axios')).default.get(url, { timeout: 15000, maxContentLength: 500000 })
      const title = String(data).match(/<title>([^<]+)<\/title>/i)?.[1] || 'No title'
      await m.reply(truncate(title))
    } catch (error) {
      await m.reply(`Browse failed: ${error.message}`)
    }
  }),
  cmd('catbox', { category: 'tools', desc: 'Upload requires Catbox token/config' }, async (sock, m) => {
    await m.reply(missingApi('Catbox', 'CATBOX_USERHASH'))
  }),
  cmd('channelid', { category: 'tools', desc: 'Show current chat id' }, async (sock, m) => {
    await m.reply(m.chat)
  }),
  cmd('channelinfo', { category: 'tools', desc: 'Channel info if newsletter JID' }, async (sock, m) => {
    await m.reply(`Chat: ${m.chat}\nType: ${m.isGroup ? 'group' : 'private/channel'}`)
  }),
  cmd('circlestk', { category: 'tools', desc: 'Circle sticker (ffmpeg)' }, async (sock, m) => {
    await m.reply('Reply to an image with .sticker. Circle crop needs FFmpeg; use .sticker for now.')
  }),
  cmd('color', { category: 'tools', desc: 'Random hex color' }, async (sock, m) => {
    await m.reply(`#${randomBytes(3).toString('hex')}`)
  }),
  cmd('compress', { category: 'tools', desc: 'Compress quoted image via ffmpeg' }, async (sock, m) => {
    const target = m.quoted || m
    if (!target.download) {
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
      await runFfmpeg(['-i', input, '-q:v', '8', output])
      const out = readFileSync(output)
      cleanup(input, output)
      await sock.sendMessage(m.chat, { image: out, caption: 'Compressed' }, { quoted: m })
    } catch (error) {
      await m.reply(error.message)
    }
  }),
  cmd('countdown', { category: 'tools', desc: 'Countdown seconds' }, async (sock, m, args) => {
    const s = Number(args[0])
    if (!s || s > 30) {
      await m.reply('Usage: .countdown 5 (max 30)')
      return
    }
    await m.reply(`Countdown ${s}s started.`)
    await new Promise((r) => setTimeout(r, s * 1000))
    await m.reply('Time.')
  }),
  cmd('currency', { category: 'tools', desc: 'FX convert via frankfurter' }, async (sock, m, args) => {
    const amount = Number(args[0])
    const from = String(args[1] || '').toUpperCase()
    const to = String(args[2] || '').toUpperCase()
    if (!amount || !from || !to) {
      await m.reply('Usage: .currency 10 USD EUR')
      return
    }
    try {
      const data = await fetchJson(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`)
      await m.reply(`${amount} ${from} = ${data.rates[to]} ${to}`)
    } catch (error) {
      await m.reply(`Currency failed: ${error.message}`)
    }
  }),
  cmd('dns', { category: 'tools', desc: 'Resolve DNS A records' }, async (sock, m, args) => {
    const host = args[0]
    if (!host) {
      await m.reply('Usage: .dns example.com')
      return
    }
    try {
      const { resolve4 } = await import('dns/promises')
      const addrs = await resolve4(host)
      await m.reply(addrs.join('\n'))
    } catch (error) {
      await m.reply(`DNS failed: ${error.message}`)
    }
  }),
  cmd('doc', { category: 'tools', desc: 'Send quoted media as document' }, async (sock, m) => {
    if (!m.quoted?.download) {
      await m.reply('Reply to media.')
      return
    }
    const buffer = await m.quoted.download()
    await sock.sendMessage(m.chat, { document: buffer, fileName: 'file.bin', mimetype: 'application/octet-stream' }, { quoted: m })
  }),
  cmd('emojimix', { category: 'tools', desc: 'Emoji mix via Google' }, async (sock, m, args) => {
    const [a, b] = args
    if (!a || !b) {
      await m.reply('Usage: .emojimix 😎 🔥')
      return
    }
    await m.reply('Emoji mix providers change often and are not hardcoded with fake URLs. Use two emojis in a sticker app, or configure a mix API.')
  }),
  cmd('fancy', { category: 'tools', desc: 'Fancy text' }, async (sock, m, args) => {
    const text = args.join(' ')
    if (!text) {
      await m.reply('Usage: .fancy hello')
      return
    }
    await m.reply(fancyFonts.bold(text))
  }),
  cmd('genpass', { category: 'tools', desc: 'Generate password' }, async (sock, m, args) => {
    const len = Math.min(Math.max(Number(args[0]) || 16, 8), 64)
    await m.reply(randomBytes(len).toString('base64url').slice(0, len))
  }),
  cmd('genusername', { category: 'tools', desc: 'Generate username', aliases: ['namegen'] }, async (sock, m) => {
    await m.reply(`${pick(['silent', 'rapid', 'lunar', 'pixel'])}_${pick(['wolf', 'nova', 'byte', 'arc'])}${Math.floor(Math.random() * 99)}`)
  }),
  cmd('getabout', { category: 'tools', desc: 'Fetch status/about if possible' }, async (sock, m, args) => {
    const target = m.mentionedJid[0] || (args[0] ? toPnJid(args[0]) : m.sender)
    try {
      const status = await sock.fetchStatus(target)
      await m.reply(status?.status || JSON.stringify(status))
    } catch (error) {
      await m.reply(`About unavailable: ${error.message}`)
    }
  }),
  cmd('github', { category: 'tools', desc: 'GitHub user lookup' }, async (sock, m, args) => {
    if (!args[0]) {
      await m.reply('Usage: .github octocat')
      return
    }
    try {
      const data = await fetchJson(`https://api.github.com/users/${encodeURIComponent(args[0])}`)
      await m.reply(`*${data.login}*\n${data.html_url}\nRepos: ${data.public_repos}\nFollowers: ${data.followers}\n${data.bio || ''}`)
    } catch (error) {
      await m.reply(`GitHub lookup failed: ${error.message}`)
    }
  }),
  cmd('gsmarena', { category: 'tools', desc: 'GSMArena is not scraped' }, async (sock, m) => {
    await m.reply('GSMArena has no official public API. This command is not faked.')
  }),
  cmd('hash', { category: 'tools', desc: 'SHA256 hash' }, async (sock, m, args) => {
    const text = args.join(' ')
    if (!text) {
      await m.reply('Usage: .hash text')
      return
    }
    await m.reply(createHash('sha256').update(text).digest('hex'))
  }),
  cmd('jsonformat', { category: 'tools', desc: 'Pretty JSON' }, async (sock, m, args) => {
    const text = args.join(' ') || m.quoted?.body
    try {
      await m.reply('```json\n' + JSON.stringify(JSON.parse(text), null, 2) + '\n```')
    } catch {
      await m.reply('Invalid JSON')
    }
  }),
  cmd('myip', { category: 'tools', desc: 'Public IP of host' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://api.ipify.org?format=json')
      await m.reply(data.ip)
    } catch (error) {
      await m.reply(error.message)
    }
  }),
  cmd('ocr', { category: 'tools', desc: 'OCR requires an API' }, async (sock, m) => {
    await m.reply(missingApi('OCR', 'OCR_API_KEY'))
  }),
  cmd('readqr', { category: 'tools', desc: 'Read QR requires extra decoder lib' }, async (sock, m) => {
    await m.reply('QR reading needs a decoder library/API. Generate with .qrcode instead.')
  }),
  cmd('removebg', { category: 'tools', desc: 'Remove background' }, async (sock, m) => {
    await m.reply(missingApi('Remove.bg', 'REMOVEBG_API_KEY'))
  }),
  cmd('roman', { category: 'tools', desc: 'Integer to roman' }, async (sock, m, args) => {
    try {
      await m.reply(romanize(args[0]))
    } catch (error) {
      await m.reply(error.message)
    }
  }),
  cmd('say', { category: 'tools', desc: 'Repeat text' }, async (sock, m, args) => {
    const text = args.join(' ')
    if (!text) {
      await m.reply('Usage: .say hello')
      return
    }
    await m.reply(text)
  }),
  cmd('shorten', { category: 'tools', desc: 'TinyURL shorten', aliases: ['tinyurl'] }, async (sock, m, args) => {
    const url = args[0]
    if (!isUrl(url)) {
      await m.reply('Usage: .shorten https://example.com')
      return
    }
    try {
      const data = await fetchJson(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`)
      await m.reply(String(data))
    } catch (error) {
      await m.reply(`Shorten failed: ${error.message}`)
    }
  }),
  cmd('sitecheck', { category: 'tools', desc: 'HTTP status check' }, async (sock, m, args) => {
    const url = args[0]
    if (!isUrl(url)) {
      await m.reply('Usage: .sitecheck https://example.com')
      return
    }
    try {
      const axios = (await import('axios')).default
      const res = await axios.get(url, { timeout: 15000, maxRedirects: 3, validateStatus: () => true })
      await m.reply(`Status: ${res.status}`)
    } catch (error) {
      await m.reply(error.message)
    }
  }),
  cmd('split', { category: 'tools', desc: 'Split text' }, async (sock, m, args) => {
    const sep = args[0]
    const text = args.slice(1).join(' ')
    if (!sep || !text) {
      await m.reply('Usage: .split , a,b,c')
      return
    }
    await m.reply(text.split(sep).join('\n'))
  }),
  cmd('ssweb', { category: 'tools', desc: 'Screenshot API not bundled' }, async (sock, m) => {
    await m.reply(missingApi('Website screenshot', 'SSWEB_API_URL'))
  }),
  cmd('take', { category: 'tools', desc: 'Resticker quoted sticker' }, async (sock, m) => {
    if (!m.quoted?.download) {
      await m.reply('Reply to a sticker.')
      return
    }
    const buffer = await m.quoted.download()
    await sock.sendMessage(m.chat, { sticker: buffer }, { quoted: m })
  }),
  cmd('telesticker', { category: 'tools', desc: 'Telegram stickers not bundled' }, async (sock, m) => {
    await m.reply('Telegram sticker import is not bundled (requires Telegram API).')
  }),
  cmd('tempmail', { category: 'tools', desc: 'Temp mail not bundled' }, async (sock, m) => {
    await m.reply('Temporary email providers are not hardcoded.')
  }),
  cmd('texttopdf', { category: 'tools', desc: 'Plain text as .txt document' }, async (sock, m, args) => {
    const text = args.join(' ') || m.quoted?.body
    if (!text) {
      await m.reply('Usage: .texttopdf hello')
      return
    }
    await sock.sendMessage(m.chat, { document: Buffer.from(text), fileName: 'note.txt', mimetype: 'text/plain' }, { quoted: m })
  }),
  cmd('tourl', { category: 'tools', desc: 'Upload requires configured host' }, async (sock, m) => {
    await m.reply(missingApi('File host', 'CATBOX_USERHASH'))
  }),
  cmd('unit', { category: 'tools', desc: 'Simple unit convert' }, async (sock, m, args) => {
    const n = Number(args[0])
    const from = args[1]
    const to = args[2]
    const table = { km: 1000, m: 1, cm: 0.01, kg: 1, g: 0.001 }
    if (!n || !table[from] || !table[to]) {
      await m.reply('Usage: .unit 2 km m | kg g')
      return
    }
    await m.reply(String((n * table[from]) / table[to]))
  }),
  cmd('whois', { category: 'tools', desc: 'RDAP lookup' }, async (sock, m, args) => {
    const host = args[0]
    if (!host) {
      await m.reply('Usage: .whois example.com')
      return
    }
    try {
      const data = await fetchJson(`https://rdap.org/domain/${encodeURIComponent(host)}`)
      await m.reply(truncate(`${data.ldhName || host}\n${(data.status || []).join(', ')}\n${JSON.stringify(data.events || []).slice(0, 500)}`))
    } catch (error) {
      await m.reply(`WHOIS/RDAP failed: ${error.message}`)
    }
  })
]

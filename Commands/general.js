import os from 'os'
import { performance } from 'perf_hooks'
import config from '../config.js'
import { cmd } from '../lib/command.js'
import { buildCategoryMenu, buildMenu, searchCommands } from '../lib/menu.js'
import { formatBytes, formatUptime, isUrl, toPnJid } from '../lib/helpers.js'
import { downloadUrl, fetchJson, hasFfmpeg, missingApi, writeBuffer } from '../lib/functions.js'
import { getUptimeMs } from '../lib/state.js'
import QRCode from 'qrcode'
import { chatLLM, apiError } from '../lib/providers.js'

function pingMs(start) {
  return `${(performance.now() - start).toFixed(2)} ms`
}

export default [
  cmd('ping', { category: 'general', desc: 'Latency check', aliases: ['p'] }, async (sock, m) => {
    const start = performance.now()
    const sent = await m.reply('Pinging...')
    const ms = pingMs(start)
    await sock.sendMessage(m.chat, { text: `*Pong!*\nSpeed: ${ms}`, edit: sent.key }).catch(async () => {
      await m.reply(`*Pong!*\nSpeed: ${ms}`)
    })
  }),

  cmd('ping2', { category: 'general', desc: 'Detailed ping' }, async (sock, m) => {
    const start = performance.now()
    await m.reply(`*${config.botName} ping*\nWA: ${pingMs(start)}\nRAM: ${formatBytes(process.memoryUsage().rss)}`)
  }),

  cmd('alive', { category: 'general', desc: 'Bot alive status', aliases: ['online'] }, async (sock, m, args, ctx) => {
    await m.reply(
      `*${config.botName} is alive*\nUptime: ${ctx.uptime}\nPrefix: ${config.prefix}\nMode: ${config.public ? 'public' : 'private'}`
    )
  }),

  cmd('menu', { category: 'general', desc: 'Main command menu', aliases: ['list'] }, async (sock, m, args, ctx) => {
    const start = performance.now()
    const text = buildMenu({ ping: pingMs(start), uptime: ctx.uptime })
    if (config.menuImage && isUrl(config.menuImage)) {
      try {
        const image = await downloadUrl(config.menuImage)
        await sock.sendMessage(m.chat, { image, caption: text }, { quoted: m })
        return
      } catch {
        /* fall through to text */
      }
    }
    await m.reply(text)
  }),

  cmd('help', { category: 'general', desc: 'Command help' }, async (sock, m, args, ctx) => {
    if (!args[0]) {
      await m.reply(buildMenu({ uptime: ctx.uptime }))
      return
    }
    const found = ctx.getCommand(args[0])
    if (!found) {
      await m.reply(`No help for *${args[0]}*`)
      return
    }
    await m.reply(
      `*${ctx.prefix}${found.name}*\n${found.desc || 'No description'}\nCategory: ${found.category}\nAliases: ${(found.aliases || []).join(', ') || '-'}`
    )
  }),

  cmd('botinfo', { category: 'general', desc: 'Bot information' }, async (sock, m, args, ctx) => {
    await m.reply(
      `*${config.botName}*\nVersion: ${config.version}\nLibrary: Baileys 7.0.0-rc14\nNode: ${process.version}\nOwner: ${config.ownerName}\nUptime: ${ctx.uptime}\nCommands: ${ctx.commands.size}`
    )
  }),

  cmd('botstatus', { category: 'general', desc: 'Runtime status' }, async (sock, m, args, ctx) => {
    await m.reply(
      `*Status*\nPublic: ${config.public}\nAlways online: ${config.alwaysOnline}\nAuto read: ${config.autoRead}\nAuto react: ${config.autoReact}\nAuto typing: ${config.autoTyping}\nAnti-delete: ${config.antiDelete}\nUptime: ${ctx.uptime}\nRSS: ${formatBytes(process.memoryUsage().rss)}`
    )
  }),

  cmd('owner', { category: 'general', desc: 'Show owner contact' }, async (sock, m) => {
    const number = config.owners[0] || ''
    if (!number) {
      await m.reply(`Owner: ${config.ownerName}\nSet OWNER_NUMBER in .env`)
      return
    }
    const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${config.ownerName}\nTEL;type=CELL;type=VOICE;waid=${number}:+${number}\nEND:VCARD`
    await sock.sendMessage(m.chat, { contacts: { displayName: config.ownerName, contacts: [{ vcard }] } }, { quoted: m })
  }),

  cmd('uptime', { category: 'general', desc: 'Process uptime' }, async (sock, m) => {
    await m.reply(`Uptime: ${formatUptime(getUptimeMs())}`)
  }),

  cmd('time', { category: 'general', desc: 'Current time' }, async (sock, m) => {
    const now = new Date()
    const local = now.toLocaleString('en-GB', { timeZone: config.timezone, hour12: false })
    await m.reply(`Timezone: ${config.timezone}\n${local}\nUnix: ${Math.floor(now.getTime() / 1000)}`)
  }),

  cmd('pair', { category: 'general', desc: 'Pairing website and instructions', aliases: ['paircode', 'getpair'] }, async (sock, m) => {
    await m.reply(
      `*${config.botName} Pair*\nWebsite: ${config.pairWebsite}\nNumber: +${config.pairingNumber || config.owners[0] || ''}\n\n1. Open ${config.pairWebsite}\n2. Enter your WhatsApp number with country code\n3. Copy the 8-digit pairing code\n4. WhatsApp → Linked Devices → Link with phone number instead\n5. Enter the code on your phone`
    )
  }),

  cmd('repo', { category: 'general', desc: 'Source repository', aliases: ['script', 'sc'] }, async (sock, m) => {
    await m.reply(`*${config.botName}*\n${config.repo}`)
  }),

  cmd('prefix', { category: 'general', desc: 'Show current prefix' }, async (sock, m) => {
    await m.reply(`Current prefix: *${config.prefix}*`)
  }),

  cmd('groupinfo', { category: 'general', desc: 'Group metadata', group: true }, async (sock, m, args, ctx) => {
    const meta = ctx.metadata || (await sock.groupMetadata(m.chat))
    const admins = meta.participants.filter((p) => p.admin).length
    await m.reply(
      `*${meta.subject}*\nID: ${meta.id}\nMembers: ${meta.participants.length}\nAdmins: ${admins}\nAnnounce: ${meta.announce ? 'on' : 'off'}\nRestrict: ${meta.restrict ? 'on' : 'off'}\nDesc: ${meta.desc || '-'}`
    )
  }),

  cmd('groupid', { category: 'general', desc: 'Group JID', group: true, aliases: ['gcid'] }, async (sock, m) => {
    await m.reply(m.chat)
  }),

  cmd('getpp', { category: 'tools', desc: 'Get profile picture' }, async (sock, m, args) => {
    const target = m.mentionedJid[0] || m.quoted?.sender || (args[0] ? toPnJid(args[0]) : m.sender)
    try {
      const url = await sock.profilePictureUrl(target, 'image')
      const image = await downloadUrl(url)
      await sock.sendMessage(m.chat, { image, caption: target }, { quoted: m })
    } catch {
      await m.reply('No profile picture or it is hidden.')
    }
  }),

  cmd('getjid', { category: 'general', desc: 'Get chat JID', aliases: ['jid'] }, async (sock, m) => {
    await m.reply(`Chat: ${m.chat}\nSender: ${m.sender}`)
  }),

  cmd('getid', { category: 'general', desc: 'Get sender id' }, async (sock, m) => {
    await m.reply(`Sender: ${m.sender}\nAlt: ${m.senderAlt || '-'}\nMessage ID: ${m.id}`)
  }),

  cmd('invite', { category: 'group', desc: 'Group invite link', group: true, admin: true, botAdmin: true }, async (sock, m) => {
    const code = await sock.groupInviteCode(m.chat)
    await m.reply(`https://chat.whatsapp.com/${code}`)
  }),

  cmd('rules', { category: 'group', desc: 'Show group rules' }, async (sock, m, args, ctx) => {
    const text = ctx.db.data.rules[m.chat] || 'No rules set. Admins can use .setrules'
    await m.reply(`*Group rules*\n${text}`)
  }),

  cmd('poll', { category: 'general', desc: 'Create a poll' }, async (sock, m, args) => {
    const raw = args.join(' ')
    const [name, ...rest] = raw.split('|').map((s) => s.trim())
    const values = rest.filter(Boolean)
    if (!name || values.length < 2) {
      await m.reply('Usage: .poll Question | Option1 | Option2')
      return
    }
    await sock.sendMessage(m.chat, { poll: { name, values: values.slice(0, 12), selectableCount: 1 } }, { quoted: m })
  }),

  cmd('qrcode', { category: 'tools', desc: 'Generate QR code', aliases: ['qr'] }, async (sock, m, args) => {
    const text = args.join(' ') || m.quoted?.body
    if (!text) {
      await m.reply('Usage: .qrcode <text>')
      return
    }
    const buffer = await QRCode.toBuffer(text, { width: 512, margin: 1 })
    await sock.sendMessage(m.chat, { image: buffer, caption: 'QR generated' }, { quoted: m })
  }),

  cmd('sticker', { category: 'tools', desc: 'Image/video to sticker', aliases: ['s', 'stiker'] }, async (sock, m) => {
    const ready = await hasFfmpeg()
    if (!ready) {
      await m.reply('FFmpeg is not installed on this host. Install ffmpeg to create stickers.')
      return
    }
    const target = ['imageMessage', 'videoMessage', 'stickerMessage'].includes(m.type) ? m : m.quoted
    if (!target?.download) {
      await m.reply('Reply to an image or short video.')
      return
    }
    try {
      const { writeFileSync, readFileSync } = await import('fs')
      const { runFfmpeg, tmpFile, cleanup } = await import('../lib/functions.js')
      const buffer = await target.download()
      const input = tmpFile('src')
      const output = tmpFile('webp')
      writeFileSync(input, buffer)
      await runFfmpeg([
        '-i',
        input,
        '-vf',
        'scale=512:512:force_original_aspect_ratio=decrease,format=rgba,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-vcodec',
        'libwebp',
        '-loop',
        '0',
        '-an',
        output
      ])
      const webp = readFileSync(output)
      cleanup(input, output)
      await sock.sendMessage(m.chat, { sticker: webp }, { quoted: m })
    } catch (error) {
      await m.reply(`Sticker failed: ${error.message}`)
    }
  }),

  cmd('toimage', { category: 'video', desc: 'Sticker to image', aliases: ['toimg'] }, async (sock, m) => {
    const target = m.type === 'stickerMessage' ? m : m.quoted
    if (!target?.download) {
      await m.reply('Reply to a sticker.')
      return
    }
    if (!(await hasFfmpeg())) {
      await m.reply('FFmpeg is required for conversion.')
      return
    }
    try {
      const { writeFileSync, readFileSync } = await import('fs')
      const { runFfmpeg, tmpFile, cleanup } = await import('../lib/functions.js')
      const buffer = await target.download()
      const input = tmpFile('webp')
      const output = tmpFile('png')
      writeFileSync(input, buffer)
      await runFfmpeg(['-i', input, output])
      const png = readFileSync(output)
      cleanup(input, output)
      await sock.sendMessage(m.chat, { image: png, caption: 'Converted' }, { quoted: m })
    } catch (error) {
      await m.reply(`Conversion failed: ${error.message}`)
    }
  }),

  cmd('tovideo', { category: 'video', desc: 'Gif/sticker to video' }, async (sock, m) => {
    const target = m.quoted || m
    if (!target?.download) {
      await m.reply('Reply to a sticker or gif.')
      return
    }
    if (!(await hasFfmpeg())) {
      await m.reply('FFmpeg is required.')
      return
    }
    try {
      const { writeFileSync, readFileSync } = await import('fs')
      const { runFfmpeg, tmpFile, cleanup } = await import('../lib/functions.js')
      const buffer = await target.download()
      const input = tmpFile('src')
      const output = tmpFile('mp4')
      writeFileSync(input, buffer)
      await runFfmpeg(['-i', input, '-movflags', 'faststart', '-pix_fmt', 'yuv420p', output])
      const mp4 = readFileSync(output)
      cleanup(input, output)
      await sock.sendMessage(m.chat, { video: mp4, caption: 'Converted' }, { quoted: m })
    } catch (error) {
      await m.reply(`Conversion failed: ${error.message}`)
    }
  }),

  cmd('toaudio', { category: 'video', desc: 'Video to audio' }, async (sock, m) => {
    const target = m.type === 'videoMessage' ? m : m.quoted
    if (!target?.download) {
      await m.reply('Reply to a video.')
      return
    }
    if (!(await hasFfmpeg())) {
      await m.reply('FFmpeg is required.')
      return
    }
    try {
      const { writeFileSync, readFileSync } = await import('fs')
      const { runFfmpeg, tmpFile, cleanup } = await import('../lib/functions.js')
      const buffer = await target.download()
      const input = tmpFile('mp4')
      const output = tmpFile('mp3')
      writeFileSync(input, buffer)
      await runFfmpeg(['-i', input, '-vn', '-acodec', 'libmp3lame', output])
      const mp3 = readFileSync(output)
      cleanup(input, output)
      await sock.sendMessage(m.chat, { audio: mp3, mimetype: 'audio/mpeg' }, { quoted: m })
    } catch (error) {
      await m.reply(`Conversion failed: ${error.message}`)
    }
  }),

  cmd('vv2', { category: 'tools', desc: 'Reveal view-once media' }, async (sock, m) => {
    const target = m.isViewOnce ? m : m.quoted
    if (!target?.download) {
      await m.reply('Reply to a view-once message.')
      return
    }
    try {
      const buffer = await target.download()
      const type = target.type || m.type
      if (type === 'videoMessage') await sock.sendMessage(m.chat, { video: buffer, caption: 'View-once opened' }, { quoted: m })
      else await sock.sendMessage(m.chat, { image: buffer, caption: 'View-once opened' }, { quoted: m })
    } catch (error) {
      await m.reply(`Cannot open view-once: ${error.message}`)
    }
  }),

  cmd('translate', { category: 'tools', desc: 'Translate text', aliases: ['tr'] }, async (sock, m, args) => {
    const lang = args[0] || 'en'
    const text = args.slice(1).join(' ') || m.quoted?.body
    if (!text) {
      await m.reply('Usage: .translate en <text>')
      return
    }
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text)}`
      const data = await fetchJson(url)
      const translated = (data?.[0] || []).map((row) => row[0]).join('')
      if (!translated) throw new Error('Empty translation')
      await m.reply(`*${lang}*\n${translated}`)
    } catch (error) {
      await m.reply(`Translate failed: ${error.message}`)
    }
  }),

  cmd('calculate', { category: 'tools', desc: 'Math calculator', aliases: ['calc', 'mathcalc'] }, async (sock, m, args) => {
    const expr = args.join(' ')
    if (!expr) {
      await m.reply('Usage: .calculate 2+2*3')
      return
    }
    try {
      const { safeEvalMath } = await import('../lib/helpers.js')
      await m.reply(`${expr} = ${safeEvalMath(expr)}`)
    } catch (error) {
      await m.reply(`Invalid expression: ${error.message}`)
    }
  }),

  cmd('weather', { category: 'tools', desc: 'Weather by city' }, async (sock, m, args) => {
    const city = args.join(' ')
    if (!city) {
      await m.reply('Usage: .weather London')
      return
    }
    if (!config.apis.weather) {
      await m.reply(missingApi('OpenWeather', 'OPENWEATHER_API_KEY'))
      return
    }
    try {
      const data = await fetchJson(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${config.apis.weather}&units=metric`
      )
      await m.reply(
        `*${data.name}, ${data.sys?.country}*\n${data.weather?.[0]?.description}\nTemp: ${data.main?.temp}°C\nHumidity: ${data.main?.humidity}%\nWind: ${data.wind?.speed} m/s`
      )
    } catch (error) {
      await m.reply(`Weather failed: ${error.message}`)
    }
  }),

  cmd('systemstatus', { category: 'owner', desc: 'Host system status', owner: true }, async (sock, m, args, ctx) => {
    await m.reply(
      `*System*\nPlatform: ${os.platform()} ${os.release()}\nArch: ${os.arch()}\nCPU: ${os.cpus()?.[0]?.model}\nCores: ${os.cpus()?.length}\nRAM: ${formatBytes(os.totalmem() - os.freemem())} / ${formatBytes(os.totalmem())}\nUptime host: ${formatUptime(os.uptime() * 1000)}\nBot uptime: ${ctx.uptime}`
    )
  }),

  cmd('cmdsearch', { category: 'tools', desc: 'Search commands' }, async (sock, m, args) => {
    if (!args[0]) {
      await m.reply('Usage: .cmdsearch ping')
      return
    }
    const hits = searchCommands(args.join(' ')).slice(0, 20)
    if (!hits.length) {
      await m.reply('No commands found.')
      return
    }
    await m.reply(hits.map((cmdItem) => `${config.prefix}${cmdItem.name} — ${cmdItem.desc || cmdItem.category}`).join('\n'))
  }),

  cmd('listcmd', { category: 'tools', desc: 'List all command names' }, async (sock, m, args, ctx) => {
    const names = [...ctx.commands.keys()].sort()
    await m.reply(`*${names.length} commands*\n${names.map((n) => config.prefix + n).join(', ')}`)
  }),

  cmd('features', { category: 'tools', desc: 'Feature overview' }, async (sock, m, args, ctx) => {
    await m.reply(
      `*Features*\nPairing auth, group moderation, economy, games, media conversion, optional LLM.\nTotal commands: ${ctx.commands.size}`
    )
  }),

  cmd('category', { category: 'general', desc: 'Show a category menu', aliases: ['listmenu'] }, async (sock, m, args) => {
    if (!args[0]) {
      await m.reply('Usage: .category group')
      return
    }
    await m.reply(buildCategoryMenu(args[0].toLowerCase()))
  })
]

import { existsSync } from 'fs'
import { join } from 'path'
import config, { persistConfig } from '../config.js'
import { cmd } from '../lib/command.js'
import { parseTarget, chunk, sleep, truncate } from '../lib/helpers.js'

function parseBool(value) {
  const v = String(value || '').toLowerCase()
  if (['on', 'true', '1', 'yes', 'enable'].includes(v)) return true
  if (['off', 'false', '0', 'no', 'disable'].includes(v)) return false
  return null
}

export default [
  cmd('addsudo', { category: 'owner', desc: 'Grant sudo', owner: true }, async (sock, m, args, ctx) => {
    const target = parseTarget(args[0], m)
    if (!target) {
      await m.reply('Tag a user or pass a number.')
      return
    }
    ctx.db.addSudo(target)
    await m.reply(`Sudo added: ${target}`)
  }),

  cmd('delsudo', { category: 'owner', desc: 'Remove sudo', owner: true }, async (sock, m, args, ctx) => {
    const target = parseTarget(args[0], m)
    if (!target) {
      await m.reply('Tag a user or pass a number.')
      return
    }
    ctx.db.delSudo(target)
    await m.reply(`Sudo removed: ${target}`)
  }),

  cmd('block', { category: 'owner', desc: 'Block a user', owner: true }, async (sock, m, args, ctx) => {
    const target = parseTarget(args[0], m)
    if (!target) {
      await m.reply('Tag a user or pass a number.')
      return
    }
    await sock.updateBlockStatus(target, 'block')
    ctx.db.block(target)
    await m.reply(`Blocked ${target}`)
  }),

  cmd('unblock', { category: 'owner', desc: 'Unblock a user', owner: true }, async (sock, m, args, ctx) => {
    const target = parseTarget(args[0], m)
    if (!target) {
      await m.reply('Tag a user or pass a number.')
      return
    }
    await sock.updateBlockStatus(target, 'unblock')
    ctx.db.unblock(target)
    await m.reply(`Unblocked ${target}`)
  }),

  cmd('broadcast', { category: 'owner', desc: 'Broadcast to groups', owner: true, cooldown: 30 }, async (sock, m, args) => {
    const text = args.join(' ') || m.quoted?.body
    if (!text) {
      await m.reply('Usage: .broadcast <text>')
      return
    }
    const groups = await sock.groupFetchAllParticipating()
    const ids = Object.keys(groups).slice(0, config.broadcastLimit)
    let sent = 0
    for (const batch of chunk(ids, 5)) {
      await Promise.all(
        batch.map(async (jid) => {
          try {
            await sock.sendMessage(jid, { text: `*Broadcast*\n${text}` })
            sent += 1
          } catch {
            /* skip */
          }
        })
      )
      await sleep(1500)
    }
    await m.reply(`Broadcast sent to ${sent}/${ids.length} groups (limit ${config.broadcastLimit}).`)
  }),

  cmd('join', { category: 'owner', desc: 'Join group via invite', owner: true }, async (sock, m, args) => {
    const input = args[0] || ''
    const code = input.replace('https://chat.whatsapp.com/', '').split('?')[0]
    if (!code) {
      await m.reply('Usage: .join <invite-code-or-link>')
      return
    }
    const jid = await sock.groupAcceptInvite(code)
    await m.reply(`Joined ${jid}`)
  }),

  cmd('leave', { category: 'owner', desc: 'Leave current or given group', owner: true }, async (sock, m, args) => {
    const jid = args[0] || m.chat
    if (!jid.endsWith('@g.us')) {
      await m.reply('Use this in a group or pass a group JID.')
      return
    }
    await sock.groupLeave(jid)
  }),

  cmd('mode', { category: 'owner', desc: 'Show or set public/private', owner: true }, async (sock, m, args) => {
    if (!args[0]) {
      await m.reply(`Mode: ${config.public ? 'public' : 'private'}`)
      return
    }
    const value = String(args[0]).toLowerCase()
    if (!['public', 'private'].includes(value)) {
      await m.reply('Usage: .mode public|private')
      return
    }
    config.public = value === 'public'
    persistConfig()
    await m.reply(`Mode set to ${value}`)
  }),

  cmd('public', { category: 'owner', desc: 'Enable public mode', owner: true }, async (sock, m) => {
    config.public = true
    persistConfig()
    await m.reply('Public mode enabled.')
  }),

  cmd('private', { category: 'owner', desc: 'Enable private mode', owner: true }, async (sock, m) => {
    config.public = false
    persistConfig()
    await m.reply('Private mode enabled.')
  }),

  cmd('setprefix', { category: 'owner', desc: 'Change command prefix', owner: true }, async (sock, m, args) => {
    if (!args[0] || args[0].length > 3) {
      await m.reply('Usage: .setprefix .')
      return
    }
    config.prefix = args[0]
    persistConfig()
    await m.reply(`Prefix set to ${config.prefix}`)
  }),

  cmd('setbio', { category: 'owner', desc: 'Set WhatsApp about', owner: true }, async (sock, m, args) => {
    const text = args.join(' ')
    if (!text) {
      await m.reply('Usage: .setbio ARCEUS XD')
      return
    }
    await sock.updateProfileStatus(text)
    await m.reply('Bio updated.')
  }),

  cmd('restart', { category: 'owner', desc: 'Restart process', owner: true }, async (sock, m) => {
    await m.reply('Restarting...')
    setTimeout(() => process.exit(0), 500)
  }),

  cmd('shutdown', { category: 'owner', desc: 'Stop the bot', owner: true }, async (sock, m) => {
    await m.reply('Shutting down...')
    setTimeout(async () => {
      const { shutdown } = await import('../connection.js')
      await shutdown()
      process.exit(0)
    }, 500)
  }),

  cmd('getsession', { category: 'owner', desc: 'Session status (no secrets)', owner: true }, async (sock, m) => {
    const credsFile = join(config.paths.auth, 'creds.json')
    const exists = existsSync(credsFile)
    await m.reply(
      `Session folder: ${config.sessionDir}\ncreds.json: ${exists ? 'present' : 'missing'}\nRegistered: ${Boolean(sock.authState?.creds?.registered)}\nSecrets are never exported.`
    )
  }),

  cmd('getsettings', { category: 'owner', desc: 'Dump non-secret settings', owner: true }, async (sock, m) => {
    await m.reply(
      truncate(
        JSON.stringify(
          {
            botName: config.botName,
            prefix: config.prefix,
            public: config.public,
            owners: config.owners,
            alwaysOnline: config.alwaysOnline,
            autoRead: config.autoRead,
            autoReact: config.autoReact,
            autoTyping: config.autoTyping
          },
          null,
          2
        )
      )
    )
  }),

  cmd('setvar', { category: 'owner', desc: 'Set a custom db var', owner: true }, async (sock, m, args, ctx) => {
    const [key, ...rest] = args
    if (!key || !rest.length) {
      await m.reply('Usage: .setvar KEY value')
      return
    }
    ctx.db.setVar(key, rest.join(' '))
    await m.reply(`Saved ${key}`)
  }),

  cmd('getvar', { category: 'owner', desc: 'Get a custom db var', owner: true }, async (sock, m, args, ctx) => {
    if (!args[0]) {
      await m.reply('Usage: .getvar KEY')
      return
    }
    await m.reply(String(ctx.db.getVar(args[0]) ?? 'undefined'))
  }),

  cmd('alwaysonline', { category: 'owner', desc: 'Toggle always online', owner: true }, async (sock, m, args) => {
    const value = parseBool(args[0])
    if (value === null) {
      await m.reply(`Always online: ${config.alwaysOnline}\nUsage: .alwaysonline on|off`)
      return
    }
    config.alwaysOnline = value
    persistConfig()
    await sock.sendPresenceUpdate(value ? 'available' : 'unavailable').catch(() => {})
    await m.reply(`Always online: ${value}`)
  }),

  cmd('autoread', { category: 'owner', desc: 'Toggle auto read', owner: true }, async (sock, m, args) => {
    const value = parseBool(args[0])
    if (value === null) {
      await m.reply(`Auto read: ${config.autoRead}`)
      return
    }
    config.autoRead = value
    persistConfig()
    await m.reply(`Auto read: ${value}`)
  }),

  cmd('autoreact', { category: 'owner', desc: 'Toggle auto react', owner: true }, async (sock, m, args) => {
    const value = parseBool(args[0])
    if (value === null) {
      await m.reply(`Auto react: ${config.autoReact}`)
      return
    }
    config.autoReact = value
    persistConfig()
    await m.reply(`Auto react: ${value}`)
  }),

  cmd('autotyping', { category: 'owner', desc: 'Toggle auto typing', owner: true }, async (sock, m, args) => {
    const value = parseBool(args[0])
    if (value === null) {
      await m.reply(`Auto typing: ${config.autoTyping}`)
      return
    }
    config.autoTyping = value
    persistConfig()
    await m.reply(`Auto typing: ${value}`)
  }),

  cmd('antidelete', { category: 'owner', desc: 'Toggle anti-delete flag', owner: true }, async (sock, m, args) => {
    const value = parseBool(args[0])
    if (value === null) {
      await m.reply(`Anti-delete: ${config.antiDelete}\nFull restore needs a message store; this flag is stored only.`)
      return
    }
    config.antiDelete = value
    persistConfig()
    await m.reply(`Anti-delete: ${value}`)
  }),

  cmd('antideletestatus', { category: 'owner', desc: 'Toggle status anti-delete', owner: true }, async (sock, m, args) => {
    const value = parseBool(args[0])
    if (value === null) {
      await m.reply(`Anti-delete status: ${config.antiDeleteStatus}`)
      return
    }
    config.antiDeleteStatus = value
    persistConfig()
    await m.reply(`Anti-delete status: ${value}`)
  }),

  cmd('autosavestatus', { category: 'owner', desc: 'Toggle auto save status', owner: true }, async (sock, m, args) => {
    const value = parseBool(args[0])
    if (value === null) {
      await m.reply(`Auto save status: ${config.autoSaveStatus}`)
      return
    }
    config.autoSaveStatus = value
    persistConfig()
    await m.reply(`Auto save status: ${value}`)
  }),

  cmd('eval', { category: 'owner', desc: 'Disabled eval', owner: true }, async (sock, m) => {
    await m.reply('Arbitrary eval is disabled for security.')
  }),

  cmd('exec', { category: 'owner', desc: 'Disabled shell exec', owner: true }, async (sock, m) => {
    await m.reply('Shell execution is disabled for security.')
  })
]

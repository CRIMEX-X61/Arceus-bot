import { readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { isJidGroup, isJidStatusBroadcast, jidNormalizedUser } from '@whiskeysockets/baileys'
import chalk from 'chalk'
import config from './config.js'
import db from './database/database.js'
import { serialize } from './lib/serializer.js'
import { extractUrls, formatUptime, isOwner as checkOwner, truncate } from './lib/helpers.js'
import { getUptimeMs } from './lib/state.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const commands = new Map()
export const aliases = new Map()
export const groupCache = new Map()
const cooldowns = new Map()
const spamMap = new Map()
let loaded = false

export async function loadCommands() {
  commands.clear()
  aliases.clear()
  const dir = join(__dirname, 'commands')
  const files = readdirSync(dir).filter((file) => file.endsWith('.js'))
  for (const file of files) {
    const href = pathToFileURL(join(dir, file)).href + `?v=${Date.now()}`
    try {
      const mod = await import(href)
      const list = mod.default || []
      for (const cmd of list) {
        if (!cmd?.name || typeof cmd.exec !== 'function') continue
        cmd.category = cmd.category || file.replace('.js', '')
        commands.set(cmd.name, cmd)
        for (const alias of cmd.aliases || []) aliases.set(alias, cmd.name)
      }
    } catch (error) {
      console.log(chalk.red(`[handler] Failed to load ${file}: ${error.message}`))
    }
  }
  loaded = true
  console.log(chalk.cyan(`[handler] Loaded ${commands.size} commands`))
}

export function getCommand(name) {
  const key = String(name || '').toLowerCase()
  return commands.get(key) || commands.get(aliases.get(key))
}

export async function getGroupMeta(sock, jid) {
  if (groupCache.has(jid)) return groupCache.get(jid)
  const meta = await sock.groupMetadata(jid)
  groupCache.set(jid, meta)
  return meta
}

function participantAdmin(meta, jid, alt) {
  const ids = [jid, alt].filter(Boolean).map((value) => jidNormalizedUser(value))
  const hit = meta.participants.find((p) => ids.includes(jidNormalizedUser(p.id)) || ids.includes(jidNormalizedUser(p.phoneNumber || '')) || ids.includes(jidNormalizedUser(p.lid || '')))
  return Boolean(hit?.admin)
}

async function resolvePerms(sock, m) {
  const owner = m.fromMe || checkOwner(m.sender, m.senderAlt)
  let admin = false
  let botAdmin = false
  let meta = null
  if (m.isGroup) {
    try {
      meta = await getGroupMeta(sock, m.chat)
      admin = participantAdmin(meta, m.sender, m.senderAlt)
      const botIds = [sock.user?.id, sock.user?.lid].filter(Boolean)
      botAdmin = botIds.some((id) => participantAdmin(meta, id))
    } catch {
      /* metadata unavailable */
    }
  }
  return { owner, admin, botAdmin, meta }
}

async function applyGroupGuards(sock, m, group) {
  if (!m.isGroup || m.fromMe) return false
  const { owner, admin } = await resolvePerms(sock, m)
  if (owner || admin) return false

  if (group.antilink) {
    const urls = extractUrls(m.body)
    if (urls.some((url) => /chat\.whatsapp\.com|whatsapp\.com\/channel/i.test(url))) {
      await sock.sendMessage(m.chat, { delete: m.key }).catch(() => {})
      await m.reply('Antilink: invite links are not allowed.')
      return true
    }
  }

  if (group.antibadword) {
    const words = group.badwords || []
    const body = m.body.toLowerCase()
    if (words.some((word) => word && body.includes(String(word).toLowerCase()))) {
      await sock.sendMessage(m.chat, { delete: m.key }).catch(() => {})
      await m.reply('Antibadword: that word is not allowed.')
      return true
    }
  }

  if (group.antisticker && m.type === 'stickerMessage') {
    await sock.sendMessage(m.chat, { delete: m.key }).catch(() => {})
    return true
  }

  if (group.antigroupmention && /@everyone|@here/i.test(m.body)) {
    await sock.sendMessage(m.chat, { delete: m.key }).catch(() => {})
    await m.reply('Group-wide mentions are disabled.')
    return true
  }

  if (group.antitag && m.mentionedJid.length > 5) {
    await sock.sendMessage(m.chat, { delete: m.key }).catch(() => {})
    await m.reply('Mass tagging is disabled.')
    return true
  }

  if (group.antispam) {
    const key = `${m.chat}:${m.sender}`
    const now = Date.now()
    const item = spamMap.get(key) || { count: 0, ts: now }
    if (now - item.ts < 7000) item.count += 1
    else item.count = 1
    item.ts = now
    spamMap.set(key, item)
    if (item.count >= 6) {
      await m.reply('Antispam: slow down.')
      return true
    }
  }
  return false
}

export async function handleMessages(sock, event) {
  if (!loaded) await loadCommands()
  if (event.type !== 'notify') return

  for (const raw of event.messages) {
    try {
      if (!raw.message) continue
      if (isJidStatusBroadcast(raw.key.remoteJid) && config.autoSaveStatus) continue

      const m = serialize(sock, raw)
      if (!m.sender) continue
      if (db.isBlocked(m.sender) && !m.fromMe) continue

      const body = String(m.body || '').trim()
      const prefix = config.prefix
      const usedPrefix = body.startsWith(prefix)
      if (m.fromMe && !usedPrefix) continue

      db.getUser(m.sender)
      if (m.isGroup && !m.fromMe) {
        db.bumpActivity(m.chat, m.sender)
        const group = db.getGroup(m.chat)
        const blocked = await applyGroupGuards(sock, m, group)
        if (blocked) {
          db.save()
          continue
        }
      }

      if (!m.fromMe && config.autoRead) await sock.readMessages([raw.key]).catch(() => {})
      if (!m.fromMe && config.autoReact && m.body) await m.react('⚡').catch(() => {})

      if (!body) continue
      if (!usedPrefix) continue

      if (!config.public && !m.fromMe && !checkOwner(m.sender, m.senderAlt)) continue

      const sliced = body.slice(prefix.length).trim()
      const [name, ...args] = sliced.split(/\s+/)
      const command = getCommand(name)
      if (!command) {
        await m.reply(`Unknown command: *${name}*\nType *${prefix}menu* or *${prefix}cmdsearch ${name}*`)
        continue
      }

      const perms = await resolvePerms(sock, m)
      if (command.owner && !perms.owner) {
        await m.reply('Owner only.')
        continue
      }
      if (command.group && !m.isGroup) {
        await m.reply('Group only.')
        continue
      }
      if (command.admin && m.isGroup && !perms.admin && !perms.owner) {
        await m.reply('Group admin only.')
        continue
      }
      if (command.botAdmin && m.isGroup && !perms.botAdmin) {
        await m.reply('I need to be a group admin for this.')
        continue
      }

      const cdKey = `${command.name}:${m.sender}`
      const wait = command.cooldown ? command.cooldown * 1000 : config.cooldownMs
      const last = cooldowns.get(cdKey) || 0
      if (Date.now() - last < wait) continue
      cooldowns.set(cdKey, Date.now())

      if (config.autoTyping) {
        await sock.sendPresenceUpdate('composing', m.chat).catch(() => {})
      }

      const ctx = {
        args,
        text: args.join(' '),
        prefix,
        config,
        db,
        commands,
        aliases,
        isOwner: perms.owner,
        isAdmin: perms.admin,
        isBotAdmin: perms.botAdmin,
        metadata: perms.meta,
        uptime: formatUptime(getUptimeMs()),
        getCommand
      }

      await command.exec(sock, m, args, ctx)
      db.save()
    } catch (error) {
      console.log(chalk.red(`[handler] ${error.stack || error.message}`))
      try {
        await sock.sendMessage(raw.key.remoteJid, {
          text: truncate(`Command error: ${error.message}`)
        })
      } catch {
        /* ignore */
      }
    }
  }
}

export async function handleGroupEvents(sock, event) {
  try {
    const group = db.getGroup(event.id)
    let meta
    try {
      meta = await sock.groupMetadata(event.id)
      groupCache.set(event.id, meta)
    } catch {
      meta = { subject: 'group' }
    }

    if (group.antibot && event.action === 'add') {
      for (const jid of event.participants || []) {
        if (/bot/i.test(jid)) {
          await sock.groupParticipantsUpdate(event.id, [jid], 'remove').catch(() => {})
        }
      }
    }

    const template = event.action === 'add' ? group.welcome && group.welcomeText : event.action === 'remove' ? group.goodbye && group.goodbyeText : null
    if (!template) return
    for (const jid of event.participants || []) {
      const text = String(template)
        .replace(/@user/g, `@${jid.split('@')[0]}`)
        .replace(/@group/g, meta.subject || 'group')
      await sock.sendMessage(event.id, { text, mentions: [jid] })
    }
  } catch (error) {
    console.log(chalk.red(`[group-event] ${error.message}`))
  }
}

export async function handleDelete(sock, updates) {
  if (!config.antiDelete && !config.antiDeleteStatus) return
  for (const item of updates) {
    if (item.update?.message === null || item.update?.status === 0) {
      /* Baileys does not keep a full message store here; log only. */
      if (config.antiDelete && item.key?.remoteJid && !isJidGroup(item.key.remoteJid) === false) {
        /* group antidelete requires a message store; skip fake restore */
      }
    }
  }
}

export function commandStats() {
  const cats = {}
  for (const cmd of commands.values()) {
    cats[cmd.category] = (cats[cmd.category] || 0) + 1
  }
  return { total: commands.size, cats }
}

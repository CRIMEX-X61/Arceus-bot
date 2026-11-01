import os from 'os'
import config from '../config.js'
import { formatBytes, formatUptime } from './helpers.js'
import { commands, commandStats } from '../handler.js'

export const CATEGORIES = [
  ['general', 'GENERAL'],
  ['group', 'GROUP'],
  ['owner', 'OWNER'],
  ['ai', 'AI'],
  ['anime', 'ANIME'],
  ['audio', 'AUDIO'],
  ['download', 'DOWNLOAD'],
  ['ephoto', 'EPHOTO360'],
  ['fun', 'FUN'],
  ['games', 'GAMES'],
  ['image', 'IMAGE / LOGO'],
  ['search', 'SEARCH'],
  ['tools', 'TOOLS'],
  ['video', 'VIDEO'],
  ['economy', 'ECONOMY'],
  ['finance', 'FINANCE'],
  ['religion', 'RELIGION'],
  ['support', 'SUPPORT']
]

export function listByCategory(category) {
  return [...commands.values()]
    .filter((cmd) => cmd.category === category)
    .map((cmd) => cmd.name)
    .sort()
}

export function buildHeader({ owner, prefix, mode, ping, uptime, ram, total }) {
  return [
    `┏━━❐ ◈ ${config.botName} ◈`,
    `┃ Owner: ${owner}`,
    `┃ Prefix: ${prefix}`,
    `┃ Mode: ${mode}`,
    `┃ Pair: ${config.pairWebsite}`,
    `┃ Platform: WhatsApp`,
    `┃ Version: ${config.version}`,
    `┃ Speed: ${ping}`,
    `┃ Uptime: ${uptime}`,
    `┃ RAM: ${ram}`,
    `┃ Commands: ${total}`,
    '┗━━━━━━━━━━━━━━'
  ].join('\n')
}

export function buildMenu({ ping = '0 ms', uptime } = {}) {
  const stats = commandStats()
  const ram = `${formatBytes(process.memoryUsage().rss)} / ${formatBytes(os.totalmem())}`
  const header = buildHeader({
    owner: config.ownerName,
    prefix: config.prefix,
    mode: config.public ? 'Public' : 'Private',
    ping,
    uptime: uptime || formatUptime(process.uptime() * 1000),
    ram,
    total: stats.total
  })

  const blocks = CATEGORIES.map(([key, label]) => {
    const names = listByCategory(key)
    if (!names.length) return null
    const lines = names.map((name) => `┃ ◈ ${config.prefix}${name}`).join('\n')
    return `┏━❐ ${label} (${names.length})\n${lines}\n┗━━━━━━━━━━━━━━`
  }).filter(Boolean)

  return `${header}\n\n${blocks.join('\n\n')}\n\nType ${config.prefix}help <command> for details.`
}

export function buildCategoryMenu(category) {
  const names = listByCategory(category)
  if (!names.length) return `No commands in *${category}*.`
  return `┏━❐ ${category.toUpperCase()}\n${names.map((name) => `┃ ${config.prefix}${name}`).join('\n')}\n┗━━━━━━━━━━━━━━`
}

export function searchCommands(query) {
  const q = String(query || '').toLowerCase()
  return [...commands.values()].filter(
    (cmd) =>
      cmd.name.includes(q) ||
      (cmd.aliases || []).some((alias) => alias.includes(q)) ||
      String(cmd.desc || '').toLowerCase().includes(q)
  )
}

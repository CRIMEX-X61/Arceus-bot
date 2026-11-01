import { cmd } from '../lib/command.js'
import { parseTarget, toPnJid, chunk } from '../lib/helpers.js'
import config from '../config.js'

function parseToggle(text) {
  const v = String(text || '').toLowerCase()
  if (['on', 'true', '1', 'enable', 'yes'].includes(v)) return true
  if (['off', 'false', '0', 'disable', 'no'].includes(v)) return false
  return null
}

function collectTargets(m, args) {
  const ids = [...(m.mentionedJid || [])]
  if (m.quoted?.sender) ids.push(m.quoted.sender)
  for (const arg of args) {
    if (/\d{5,}/.test(arg)) ids.push(toPnJid(arg))
  }
  return [...new Set(ids.filter(Boolean))]
}

export default [
  cmd('add', { category: 'group', desc: 'Add members', group: true, admin: true, botAdmin: true }, async (sock, m, args) => {
    const targets = collectTargets(m, args)
    if (!targets.length) {
      await m.reply('Usage: .add 1555... or reply/tag')
      return
    }
    const result = await sock.groupParticipantsUpdate(m.chat, targets, 'add')
    await m.reply(`Add result: ${JSON.stringify(result)}`)
  }),

  cmd('kick', { category: 'group', desc: 'Remove members', group: true, admin: true, botAdmin: true }, async (sock, m, args, ctx) => {
    const targets = collectTargets(m, args)
    if (!targets.length) {
      await m.reply('Tag or reply to the user.')
      return
    }
    if (targets.length > config.kickLimit && !ctx.isOwner) {
      await m.reply(`Max ${config.kickLimit} kicks per command unless owner.`)
      return
    }
    await sock.groupParticipantsUpdate(m.chat, targets, 'remove')
    await m.reply('Removed.')
  }),

  cmd('promote', { category: 'group', desc: 'Promote admin', group: true, admin: true, botAdmin: true }, async (sock, m, args) => {
    const targets = collectTargets(m, args)
    if (!targets.length) {
      await m.reply('Tag or reply to the user.')
      return
    }
    await sock.groupParticipantsUpdate(m.chat, targets, 'promote')
    await m.reply('Promoted.')
  }),

  cmd('demote', { category: 'group', desc: 'Demote admin', group: true, admin: true, botAdmin: true }, async (sock, m, args) => {
    const targets = collectTargets(m, args)
    if (!targets.length) {
      await m.reply('Tag or reply to the user.')
      return
    }
    await sock.groupParticipantsUpdate(m.chat, targets, 'demote')
    await m.reply('Demoted.')
  }),

  cmd('tagall', { category: 'group', desc: 'Mention all members', group: true, admin: true }, async (sock, m, args, ctx) => {
    const meta = ctx.metadata || (await sock.groupMetadata(m.chat))
    const mentions = meta.participants.map((p) => p.id)
    const text = args.join(' ') || 'Tag all'
    const body = mentions.map((jid) => `@${jid.split('@')[0]}`).join(' ')
    await sock.sendMessage(m.chat, { text: `${text}\n${body}`, mentions }, { quoted: m })
  }),

  cmd('hidetag', { category: 'group', desc: 'Hidden mention all', group: true, admin: true }, async (sock, m, args, ctx) => {
    const meta = ctx.metadata || (await sock.groupMetadata(m.chat))
    const mentions = meta.participants.map((p) => p.id)
    await sock.sendMessage(m.chat, { text: args.join(' ') || 'Notice', mentions }, { quoted: m })
  }),

  cmd('tagadmin', { category: 'group', desc: 'Mention admins', group: true }, async (sock, m, args, ctx) => {
    const meta = ctx.metadata || (await sock.groupMetadata(m.chat))
    const mentions = meta.participants.filter((p) => p.admin).map((p) => p.id)
    const body = mentions.map((jid) => `@${jid.split('@')[0]}`).join(' ')
    await sock.sendMessage(m.chat, { text: `Admins\n${body}`, mentions }, { quoted: m })
  }),

  cmd('mute', { category: 'group', desc: 'Mute group (admins only)', group: true, admin: true, botAdmin: true }, async (sock, m) => {
    await sock.groupSettingUpdate(m.chat, 'announcement')
    await m.reply('Group closed. Only admins can send messages.')
  }),

  cmd('close', { category: 'group', desc: 'Close group chat', group: true, admin: true, botAdmin: true }, async (sock, m) => {
    await sock.groupSettingUpdate(m.chat, 'announcement')
    await m.reply('Group closed. Only admins can send messages.')
  }),

  cmd('unmute', { category: 'group', desc: 'Unmute group', group: true, admin: true, botAdmin: true }, async (sock, m) => {
    await sock.groupSettingUpdate(m.chat, 'not_announcement')
    await m.reply('Group opened. Everyone can send messages.')
  }),

  cmd('open', { category: 'group', desc: 'Open group chat', group: true, admin: true, botAdmin: true }, async (sock, m) => {
    await sock.groupSettingUpdate(m.chat, 'not_announcement')
    await m.reply('Group opened. Everyone can send messages.')
  }),

  cmd('link', { category: 'group', desc: 'Get invite link', group: true, admin: true, botAdmin: true }, async (sock, m) => {
    const code = await sock.groupInviteCode(m.chat)
    await m.reply(`https://chat.whatsapp.com/${code}`)
  }),

  cmd('resetlink', { category: 'group', desc: 'Revoke invite link', group: true, admin: true, botAdmin: true }, async (sock, m) => {
    const code = await sock.groupRevokeInvite(m.chat)
    await m.reply(`New link: https://chat.whatsapp.com/${code}`)
  }),

  cmd('welcome', { category: 'group', desc: 'Toggle welcome', group: true, admin: true }, async (sock, m, args, ctx) => {
    const group = ctx.db.getGroup(m.chat)
    const value = parseToggle(args[0])
    if (value === null) {
      await m.reply(`Welcome: ${group.welcome}`)
      return
    }
    group.welcome = value
    ctx.db.save()
    await m.reply(`Welcome: ${value}`)
  }),

  cmd('goodbye', { category: 'group', desc: 'Toggle goodbye', group: true, admin: true }, async (sock, m, args, ctx) => {
    const group = ctx.db.getGroup(m.chat)
    const value = parseToggle(args[0])
    if (value === null) {
      await m.reply(`Goodbye: ${group.goodbye}`)
      return
    }
    group.goodbye = value
    ctx.db.save()
    await m.reply(`Goodbye: ${value}`)
  }),

  cmd('setwelcome', { category: 'group', desc: 'Set welcome text', group: true, admin: true }, async (sock, m, args, ctx) => {
    const text = args.join(' ')
    if (!text) {
      await m.reply('Usage: .setwelcome Welcome @user to @group')
      return
    }
    const group = ctx.db.getGroup(m.chat)
    group.welcomeText = text
    group.welcome = true
    ctx.db.save()
    await m.reply('Welcome message saved.')
  }),

  cmd('setgoodbye', { category: 'group', desc: 'Set goodbye text', group: true, admin: true }, async (sock, m, args, ctx) => {
    const text = args.join(' ')
    if (!text) {
      await m.reply('Usage: .setgoodbye Bye @user')
      return
    }
    const group = ctx.db.getGroup(m.chat)
    group.goodbyeText = text
    group.goodbye = true
    ctx.db.save()
    await m.reply('Goodbye message saved.')
  }),

  cmd('setgname', { category: 'group', desc: 'Set group name', group: true, admin: true, botAdmin: true }, async (sock, m, args) => {
    const name = args.join(' ')
    if (!name) {
      await m.reply('Usage: .setgname New Name')
      return
    }
    await sock.groupUpdateSubject(m.chat, name)
    await m.reply('Group name updated.')
  }),

  cmd('setdesc', { category: 'group', desc: 'Set group description', group: true, admin: true, botAdmin: true }, async (sock, m, args) => {
    const desc = args.join(' ')
    if (!desc) {
      await m.reply('Usage: .setdesc text')
      return
    }
    await sock.groupUpdateDescription(m.chat, desc)
    await m.reply('Description updated.')
  }),

  cmd('antilink', { category: 'group', desc: 'Toggle antilink', group: true, admin: true }, async (sock, m, args, ctx) => {
    const group = ctx.db.getGroup(m.chat)
    const value = parseToggle(args[0]) ?? !group.antilink
    group.antilink = value
    ctx.db.save()
    await m.reply(`Antilink: ${value}`)
  }),

  cmd('antispam', { category: 'group', desc: 'Toggle antispam', group: true, admin: true }, async (sock, m, args, ctx) => {
    const group = ctx.db.getGroup(m.chat)
    const value = parseToggle(args[0]) ?? !group.antispam
    group.antispam = value
    ctx.db.save()
    await m.reply(`Antispam: ${value}`)
  }),

  cmd('antibadword', { category: 'group', desc: 'Toggle antibadword', group: true, admin: true }, async (sock, m, args, ctx) => {
    const group = ctx.db.getGroup(m.chat)
    const value = parseToggle(args[0]) ?? !group.antibadword
    group.antibadword = value
    ctx.db.save()
    await m.reply(`Antibadword: ${value}`)
  }),

  cmd('antibot', { category: 'group', desc: 'Toggle antibot', group: true, admin: true }, async (sock, m, args, ctx) => {
    const group = ctx.db.getGroup(m.chat)
    const value = parseToggle(args[0]) ?? !group.antibot
    group.antibot = value
    ctx.db.save()
    await m.reply(`Antibot: ${value}`)
  }),

  cmd('antitag', { category: 'group', desc: 'Toggle antitag', group: true, admin: true }, async (sock, m, args, ctx) => {
    const group = ctx.db.getGroup(m.chat)
    const value = parseToggle(args[0]) ?? !group.antitag
    group.antitag = value
    ctx.db.save()
    await m.reply(`Antitag: ${value}`)
  }),

  cmd('antigroupmention', { category: 'group', desc: 'Toggle anti group mention', group: true, admin: true }, async (sock, m, args, ctx) => {
    const group = ctx.db.getGroup(m.chat)
    const value = parseToggle(args[0]) ?? !group.antigroupmention
    group.antigroupmention = value
    ctx.db.save()
    await m.reply(`Anti group mention: ${value}`)
  }),

  cmd('antisticker', { category: 'group', desc: 'Toggle antisticker', group: true, admin: true }, async (sock, m, args, ctx) => {
    const group = ctx.db.getGroup(m.chat)
    const value = parseToggle(args[0]) ?? !group.antisticker
    group.antisticker = value
    ctx.db.save()
    await m.reply(`Antisticker: ${value}`)
  }),

  cmd('gantidelete', { category: 'group', desc: 'Toggle group antidelete flag', group: true, admin: true }, async (sock, m, args, ctx) => {
    const group = ctx.db.getGroup(m.chat)
    const value = parseToggle(args[0]) ?? !group.antidelete
    group.antidelete = value
    ctx.db.save()
    await m.reply(`Group antidelete flag: ${value}. Full restore needs a message store.`)
  }),

  cmd('warn', { category: 'group', desc: 'Warn a member', group: true, admin: true }, async (sock, m, args, ctx) => {
    const target = parseTarget(args[0], m)
    if (!target) {
      await m.reply('Tag or reply to a user.')
      return
    }
    const group = ctx.db.getGroup(m.chat)
    const count = ctx.db.addWarn(m.chat, target)
    await m.reply(`Warned ${target} (${count}/${group.warnLimit})`)
    if (count >= group.warnLimit && ctx.isBotAdmin) {
      await sock.groupParticipantsUpdate(m.chat, [target], 'remove').catch(() => {})
      ctx.db.resetWarn(m.chat, target)
      await m.reply('Warn limit reached. User removed.')
    }
  }),

  cmd('resetwarn', { category: 'group', desc: 'Reset warns', group: true, admin: true }, async (sock, m, args, ctx) => {
    const target = parseTarget(args[0], m)
    if (!target) {
      await m.reply('Tag or reply to a user.')
      return
    }
    ctx.db.resetWarn(m.chat, target)
    await m.reply('Warns reset.')
  }),

  cmd('kickall', { category: 'group', desc: 'Kick non-admins (owner confirm)', group: true, owner: true, botAdmin: true }, async (sock, m, args, ctx) => {
    if (args[0] !== 'confirm') {
      await m.reply(`Dangerous. Type ${config.prefix}kickall confirm\nLimited to ${config.kickLimit} members per run.`)
      return
    }
    const meta = ctx.metadata || (await sock.groupMetadata(m.chat))
    const botIds = [sock.user?.id, sock.user?.lid].filter(Boolean)
    const targets = meta.participants
      .filter((p) => !p.admin && !botIds.some((id) => String(p.id).includes(String(id).split('@')[0])))
      .map((p) => p.id)
      .slice(0, config.kickLimit)
    for (const batch of chunk(targets, 5)) {
      await sock.groupParticipantsUpdate(m.chat, batch, 'remove').catch(() => {})
    }
    await m.reply(`Removed ${targets.length} members (limit ${config.kickLimit}).`)
  }),

  cmd('kickinactive', { category: 'group', desc: 'Kick inactive members', group: true, owner: true, botAdmin: true }, async (sock, m, args, ctx) => {
    if (args[0] !== 'confirm') {
      await m.reply('Dangerous. Type .kickinactive confirm')
      return
    }
    const meta = ctx.metadata || (await sock.groupMetadata(m.chat))
    const activity = ctx.db.data.activity[m.chat] || {}
    const cutoff = Date.now() - 14 * 86400000
    const targets = meta.participants
      .filter((p) => !p.admin)
      .filter((p) => !activity[p.id] || activity[p.id].last < cutoff)
      .map((p) => p.id)
      .slice(0, config.kickLimit)
    if (!targets.length) {
      await m.reply('No inactive members in the current activity log.')
      return
    }
    await sock.groupParticipantsUpdate(m.chat, targets, 'remove')
    await m.reply(`Removed ${targets.length} inactive members.`)
  }),

  cmd('totalmembers', { category: 'group', desc: 'Member count', group: true }, async (sock, m, args, ctx) => {
    const meta = ctx.metadata || (await sock.groupMetadata(m.chat))
    await m.reply(`Members: ${meta.participants.length}`)
  }),

  cmd('listactive', { category: 'group', desc: 'Most active members', group: true, admin: true }, async (sock, m, args, ctx) => {
    const activity = ctx.db.data.activity[m.chat] || {}
    const rows = Object.entries(activity)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15)
    if (!rows.length) {
      await m.reply('No activity recorded yet.')
      return
    }
    await m.reply(rows.map(([jid, info], i) => `${i + 1}. ${jid.split('@')[0]} — ${info.count}`).join('\n'))
  }),

  cmd('listinactive', { category: 'group', desc: 'Least active members', group: true, admin: true }, async (sock, m, args, ctx) => {
    const meta = ctx.metadata || (await sock.groupMetadata(m.chat))
    const activity = ctx.db.data.activity[m.chat] || {}
    const rows = meta.participants
      .map((p) => ({ id: p.id, count: activity[p.id]?.count || 0 }))
      .sort((a, b) => a.count - b.count)
      .slice(0, 15)
    await m.reply(rows.map((row, i) => `${i + 1}. ${row.id.split('@')[0]} — ${row.count}`).join('\n'))
  }),

  cmd('setrules', { category: 'group', desc: 'Set group rules', group: true, admin: true }, async (sock, m, args, ctx) => {
    const text = args.join(' ')
    if (!text) {
      await m.reply('Usage: .setrules No spam')
      return
    }
    ctx.db.data.rules[m.chat] = text
    ctx.db.save()
    await m.reply('Rules saved.')
  }),

  cmd('delete', { category: 'group', desc: 'Delete quoted message', group: true, admin: true, botAdmin: true, aliases: ['del'] }, async (sock, m) => {
    if (!m.quoted) {
      await m.reply('Reply to the message to delete.')
      return
    }
    await sock.sendMessage(m.chat, { delete: m.quoted.key })
  }),

  cmd('approve', { category: 'group', desc: 'Approve join requests', group: true, admin: true, botAdmin: true }, async (sock, m, args) => {
    const pending = await sock.groupRequestParticipantsList(m.chat)
    const targets = collectTargets(m, args)
    const ids = targets.length ? targets : pending.map((p) => p.jid || p.id).filter(Boolean)
    if (!ids.length) {
      await m.reply('No pending requests.')
      return
    }
    const result = await sock.groupRequestParticipantsUpdate(m.chat, ids, 'approve')
    await m.reply(`Approved ${ids.length}\n${JSON.stringify(result)}`)
  }),

  cmd('reject', { category: 'group', desc: 'Reject join requests', group: true, admin: true, botAdmin: true }, async (sock, m, args) => {
    const pending = await sock.groupRequestParticipantsList(m.chat)
    const targets = collectTargets(m, args)
    const ids = targets.length ? targets : pending.map((p) => p.jid || p.id).filter(Boolean)
    if (!ids.length) {
      await m.reply('No pending requests.')
      return
    }
    await sock.groupRequestParticipantsUpdate(m.chat, ids, 'reject')
    await m.reply(`Rejected ${ids.length}`)
  }),

  cmd('vcf', { category: 'group', desc: 'Export members as VCF', group: true, admin: true }, async (sock, m, args, ctx) => {
    const meta = ctx.metadata || (await sock.groupMetadata(m.chat))
    const cards = meta.participants.map((p, i) => {
      const user = String(p.phoneNumber || p.id).split('@')[0]
      return `BEGIN:VCARD\nVERSION:3.0\nFN:Member ${i + 1}\nTEL;type=CELL:+${user}\nEND:VCARD`
    })
    const buffer = Buffer.from(cards.join('\n'), 'utf8')
    await sock.sendMessage(
      m.chat,
      { document: buffer, fileName: 'members.vcf', mimetype: 'text/vcard', caption: `${meta.participants.length} contacts` },
      { quoted: m }
    )
  })
]

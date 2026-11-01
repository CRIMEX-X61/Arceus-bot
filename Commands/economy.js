import { cmd } from '../lib/command.js'
import { parseTarget, pick } from '../lib/helpers.js'

const jobs = [
  ['delivered packages', 80, 180],
  ['fixed a bot command', 120, 260],
  ['moderated a group', 90, 200],
  ['designed a sticker pack', 70, 160]
]
const shop = {
  potion: { price: 250, desc: 'A shiny potion (cosmetic)' },
  crate: { price: 500, desc: 'Mystery crate (cosmetic)' },
  crown: { price: 2500, desc: 'Flex item' }
}

function eco(db, jid) {
  return db.getEconomy(jid)
}

export default [
  cmd('balance', { category: 'economy', desc: 'Show wallet and bank', aliases: ['bal', 'wallet'] }, async (sock, m, args, ctx) => {
    const e = eco(ctx.db, m.sender)
    await m.reply(`*Balance*\nWallet: ${e.wallet}\nBank: ${e.bank}`)
  }),

  cmd('daily', { category: 'economy', desc: 'Claim daily coins' }, async (sock, m, args, ctx) => {
    const e = eco(ctx.db, m.sender)
    const now = Date.now()
    if (now - e.lastDaily < 86400000) {
      const left = 86400000 - (now - e.lastDaily)
      await m.reply(`Daily already claimed. Wait ${Math.ceil(left / 3600000)}h.`)
      return
    }
    const amount = 500
    e.wallet += amount
    e.lastDaily = now
    ctx.db.save()
    await m.reply(`Daily claimed: +${amount}\nWallet: ${e.wallet}`)
  }),

  cmd('work', { category: 'economy', desc: 'Work for coins' }, async (sock, m, args, ctx) => {
    const e = eco(ctx.db, m.sender)
    const now = Date.now()
    if (now - e.lastWork < 300000) {
      await m.reply('You are tired. Wait 5 minutes.')
      return
    }
    const [job, min, max] = pick(jobs)
    const pay = min + Math.floor(Math.random() * (max - min + 1))
    e.wallet += pay
    e.lastWork = now
    ctx.db.save()
    await m.reply(`You ${job} and earned ${pay}.\nWallet: ${e.wallet}`)
  }),

  cmd('deposit', { category: 'economy', desc: 'Deposit to bank', aliases: ['dep'] }, async (sock, m, args, ctx) => {
    const e = eco(ctx.db, m.sender)
    const amount = args[0] === 'all' ? e.wallet : Number(args[0])
    if (!amount || amount < 1 || amount > e.wallet) {
      await m.reply('Usage: .deposit 100 | .deposit all')
      return
    }
    e.wallet -= amount
    e.bank += amount
    ctx.db.save()
    await m.reply(`Deposited ${amount}. Bank: ${e.bank}`)
  }),

  cmd('withdraw', { category: 'economy', desc: 'Withdraw from bank', aliases: ['wd'] }, async (sock, m, args, ctx) => {
    const e = eco(ctx.db, m.sender)
    const amount = args[0] === 'all' ? e.bank : Number(args[0])
    if (!amount || amount < 1 || amount > e.bank) {
      await m.reply('Usage: .withdraw 100 | .withdraw all')
      return
    }
    e.bank -= amount
    e.wallet += amount
    ctx.db.save()
    await m.reply(`Withdrew ${amount}. Wallet: ${e.wallet}`)
  }),

  cmd('give', { category: 'economy', desc: 'Give coins to a user' }, async (sock, m, args, ctx) => {
    const target = parseTarget('', m) || (args[0] && !Number(args[0]) ? parseTarget(args[0], m) : '')
    const amount = Number(args[1] || args[0])
    if (!target || !amount || amount < 1) {
      await m.reply('Usage: reply/tag + .give 100')
      return
    }
    if (target === m.sender) {
      await m.reply('Cannot pay yourself.')
      return
    }
    const from = eco(ctx.db, m.sender)
    if (from.wallet < amount) {
      await m.reply('Not enough wallet funds.')
      return
    }
    const to = eco(ctx.db, target)
    from.wallet -= amount
    to.wallet += amount
    ctx.db.save()
    await m.reply(`Sent ${amount} to ${target.split('@')[0]}`)
  }),

  cmd('slot', { category: 'economy', desc: 'Slot machine' }, async (sock, m, args, ctx) => {
    const e = eco(ctx.db, m.sender)
    const bet = Number(args[0] || 50)
    if (bet < 10 || bet > 5000) {
      await m.reply('Bet 10-5000')
      return
    }
    if (e.wallet < bet) {
      await m.reply('Not enough coins.')
      return
    }
    const icons = ['🍒', '🍋', '⭐', '💎', '7️⃣']
    const roll = [pick(icons), pick(icons), pick(icons)]
    e.wallet -= bet
    let win = 0
    if (roll[0] === roll[1] && roll[1] === roll[2]) win = bet * 5
    else if (roll[0] === roll[1] || roll[1] === roll[2] || roll[0] === roll[2]) win = bet * 2
    e.wallet += win
    ctx.db.save()
    await m.reply(`${roll.join(' | ')}\n${win ? `Won ${win}` : 'Lost'}\nWallet: ${e.wallet}`)
  }),

  cmd('shop', { category: 'economy', desc: 'Item shop' }, async (sock, m) => {
    const lines = Object.entries(shop).map(([k, v]) => `${k} — ${v.price} (${v.desc})`)
    await m.reply(`*Shop*\n${lines.join('\n')}\nBuy with .buy potion`)
  }),

  cmd('buy', { category: 'economy', desc: 'Buy shop item' }, async (sock, m, args, ctx) => {
    const item = String(args[0] || '').toLowerCase()
    if (!shop[item]) {
      await m.reply('Unknown item. Use .shop')
      return
    }
    const e = eco(ctx.db, m.sender)
    if (e.wallet < shop[item].price) {
      await m.reply('Not enough coins.')
      return
    }
    e.wallet -= shop[item].price
    e.inventory.push(item)
    ctx.db.save()
    await m.reply(`Bought ${item}. Wallet: ${e.wallet}`)
  }),

  cmd('inventory', { category: 'economy', desc: 'Show inventory', aliases: ['inv'] }, async (sock, m, args, ctx) => {
    const e = eco(ctx.db, m.sender)
    await m.reply(e.inventory.length ? e.inventory.join(', ') : 'Inventory empty.')
  }),

  cmd('leaderboard', { category: 'economy', desc: 'Richest users', aliases: ['lb'] }, async (sock, m, args, ctx) => {
    const rows = Object.entries(ctx.db.data.economy)
      .map(([jid, e]) => ({ jid, total: (e.wallet || 0) + (e.bank || 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
    if (!rows.length) {
      await m.reply('No economy data yet.')
      return
    }
    await m.reply(rows.map((r, i) => `${i + 1}. ${r.jid.split('@')[0]} — ${r.total}`).join('\n'))
  }),

  cmd('bank', { category: 'economy', desc: 'Bank balance' }, async (sock, m, args, ctx) => {
    const e = eco(ctx.db, m.sender)
    await m.reply(`Bank: ${e.bank}`)
  })
]

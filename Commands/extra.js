import { cmd } from '../lib/command.js'
import { fetchJson } from '../lib/functions.js'
import { truncate } from '../lib/helpers.js'
import config from '../config.js'

export default [
  cmd('cryptonews', { category: 'finance', desc: 'Top crypto prices (CoinGecko)' }, async (sock, m) => {
    try {
      const data = await fetchJson(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=8&page=1'
      )
      if (!Array.isArray(data) || !data.length) throw new Error('Empty response')
      await m.reply(
        data
          .map((c) => `*${c.symbol.toUpperCase()}* $${c.current_price} (${Number(c.price_change_percentage_24h).toFixed(2)}%)`)
          .join('\n')
      )
    } catch (error) {
      await m.reply(`Crypto data failed: ${error.message}`)
    }
  }),

  cmd('forex', { category: 'finance', desc: 'Latest USD forex rates' }, async (sock, m, args) => {
    const base = String(args[0] || 'USD').toUpperCase()
    try {
      const data = await fetchJson(`https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`)
      const picks = ['EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF']
      const lines = picks
        .filter((k) => data.rates?.[k])
        .map((k) => `${base} → ${k}: ${data.rates[k]}`)
      await m.reply(`*Forex ${data.date}*\n${lines.join('\n')}`)
    } catch (error) {
      await m.reply(`Forex failed: ${error.message}`)
    }
  }),

  cmd('bible', { category: 'religion', desc: 'Bible verse' }, async (sock, m, args) => {
    const ref = args.join(' ') || 'John 3:16'
    try {
      const data = await fetchJson(`https://bible-api.com/${encodeURIComponent(ref)}`)
      if (!data?.text) throw new Error('Verse not found')
      await m.reply(`*${data.reference}*\n${data.text.trim()}`)
    } catch (error) {
      await m.reply(`Bible lookup failed: ${error.message}`)
    }
  }),

  cmd('quran', { category: 'religion', desc: 'Quran ayah' }, async (sock, m, args) => {
    const ref = args[0] || '1:1'
    try {
      const data = await fetchJson(`https://api.alquran.cloud/v1/ayah/${encodeURIComponent(ref)}/en.asad`)
      const ayah = data?.data
      if (!ayah?.text) throw new Error('Ayah not found. Try 2:255')
      await m.reply(`*${ayah.surah?.englishName} ${ayah.numberInSurah}*\n${ayah.text}`)
    } catch (error) {
      await m.reply(`Quran lookup failed: ${error.message}`)
    }
  }),

  cmd('praytime', { category: 'religion', desc: 'Prayer times by city' }, async (sock, m, args) => {
    const city = args.join(' ')
    if (!city) {
      await m.reply('Usage: .praytime Mecca')
      return
    }
    try {
      const data = await fetchJson(
        `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=&method=2`
      )
      const t = data?.data?.timings
      if (!t) throw new Error('No timings')
      await m.reply(
        `*Prayer times — ${city}*\nFajr: ${t.Fajr}\nDhuhr: ${t.Dhuhr}\nAsr: ${t.Asr}\nMaghrib: ${t.Maghrib}\nIsha: ${t.Isha}`
      )
    } catch (error) {
      await m.reply(`Praytime failed: ${error.message}`)
    }
  }),

  cmd('feedback', { category: 'support', desc: 'Send feedback to owner' }, async (sock, m, args) => {
    const text = args.join(' ')
    if (!text) {
      await m.reply('Usage: .feedback your message')
      return
    }
    const owner = config.owners[0]
    if (!owner) {
      await m.reply('Owner number is not configured, so feedback cannot be delivered.')
      return
    }
    await sock.sendMessage(`${owner}@s.whatsapp.net`, {
      text: `*Feedback from ${m.sender}*\n${truncate(text, 1000)}`
    })
    await m.reply('Feedback forwarded to the owner.')
  }),

  cmd('helpers', { category: 'support', desc: 'Support pointers' }, async (sock, m) => {
    await m.reply(
      `*${config.botName} support*\n1. .menu — command list\n2. .cmdsearch <name>\n3. Pair: ${config.pairWebsite}\n4. Repo: ${config.repo}\n5. Never share auth_info or pairing codes.`
    )
  })
]

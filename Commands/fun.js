import { cmd } from '../lib/command.js'
import { fetchJson } from '../lib/functions.js'
import { pick, parseTarget } from '../lib/helpers.js'

const truths = ['What is your most used emoji?', 'What song is stuck in your head?', 'Who was your first WhatsApp chat today?']
const dares = ['Send a sticker without context.', 'Compliment the next message you see.', 'Change your about for 5 minutes.']
const insults = ['You have the charisma of a loading spinner.', 'Your Wi-Fi is faster than your comebacks.']
const compliments = ['You make group chats less chaotic.', 'Your timing is elite.', 'Main-character energy, side-quest humility.']
const advice = ['Drink water.', 'Commit your code.', 'Sleep is a feature, not a bug.']
const facts = ['Octopuses have three hearts.', 'Honey does not spoil.', 'Bananas are berries; strawberries are not.']
const pickup = ['Are you a semicolon? Because you complete my statements.', 'Is your name Wi-Fi? Because I am feeling connected.']
const quotes = ['Stay hungry, stay foolish.', 'Simple is better than complex.', 'Make it work, then make it right.']
const wyr = ['Would you rather have unlimited data or unlimited battery?', 'Would you rather debug at 3am or present without slides?']

function rate(name) {
  const n = [...String(name)].reduce((a, c) => a + c.charCodeAt(0), 0)
  return (n % 101)
}

export default [
  cmd('8ball', { category: 'fun', desc: 'Magic 8-ball' }, async (sock, m, args) => {
    if (!args[0]) {
      await m.reply('Ask a question.')
      return
    }
    await m.reply(pick(['Yes.', 'No.', 'Maybe.', 'Ask again later.', 'Absolutely.', 'Not a chance.']))
  }),
  cmd('advice', { category: 'fun', desc: 'Random advice' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://api.adviceslip.com/advice')
      await m.reply(data?.slip?.advice || pick(advice))
    } catch {
      await m.reply(pick(advice))
    }
  }),
  cmd('avengers', { category: 'fun', desc: 'Random Avenger' }, async (sock, m) => {
    await m.reply(pick(['Iron Man', 'Thor', 'Hulk', 'Black Widow', 'Captain America', 'Spider-Man']))
  }),
  cmd('blur', { category: 'fun', desc: 'Blur requires quoted image + ffmpeg' }, async (sock, m) => {
    await m.reply('Reply to an image and use .wanted / image filters in IMAGE menu. Blur needs FFmpeg locally.')
  }),
  cmd('bully', { category: 'fun', desc: 'Playful bully' }, async (sock, m, args) => {
    const target = parseTarget(args[0], m) || m.sender
    await m.reply(`@${target.split('@')[0]} just got roasted by the loading bar.`, { mentions: [target] })
  }),
  cmd('coffee', { category: 'fun', desc: 'Coffee image' }, async (sock, m) => {
    try {
      await sock.sendMessage(m.chat, { image: { url: 'https://coffee.alexflipnote.dev/random' }, caption: 'coffee' }, { quoted: m })
    } catch (error) {
      await m.reply(`Coffee API failed: ${error.message}`)
    }
  }),
  cmd('compliment', { category: 'fun', desc: 'Compliment someone' }, async (sock, m) => {
    await m.reply(pick(compliments))
  }),
  cmd('couplepp', { category: 'fun', desc: 'Couple profile pair' }, async (sock, m) => {
    await m.reply('Couple PP APIs are third-party and not bundled. Set a media provider if you need this.')
  }),
  cmd('dadjoke', { category: 'fun', desc: 'Dad joke' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://icanhazdadjoke.com/', { headers: { Accept: 'application/json' } })
      await m.reply(data?.joke || pick(['I only know 25 letters of the alphabet. I don\'t know y.']))
    } catch {
      await m.reply('I only know 25 letters of the alphabet. I don\'t know y.')
    }
  }),
  cmd('dance2', { category: 'fun', desc: 'Dance gif' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://api.waifu.pics/sfw/dance')
      await sock.sendMessage(m.chat, { video: { url: data.url }, gifPlayback: true, caption: 'dance' }, { quoted: m })
    } catch (error) {
      await m.reply(`Dance failed: ${error.message}`)
    }
  }),
  cmd('emojiquiz', { category: 'fun', desc: 'Guess the emoji movie' }, async (sock, m) => {
    await m.reply(pick(['Guess: 🦁👑 (Lion King)', 'Guess: 🧊👸 (Frozen)', 'Guess: 🕷️🧑 (Spider-Man)']))
  }),
  cmd('fact', { category: 'fun', desc: 'Random fact', aliases: ['funfact'] }, async (sock, m) => {
    try {
      const data = await fetchJson('https://uselessfacts.jsph.pl/api/v2/facts/random')
      await m.reply(data?.text || pick(facts))
    } catch {
      await m.reply(pick(facts))
    }
  }),
  cmd('gfx', { category: 'image', desc: 'GFX text effect needs provider' }, async (sock, m, args) => {
    await m.reply(args[0] ? 'Configure EPHOTO_API_URL for GFX rendering.' : 'Usage: .gfx <text>')
  }),
  cmd('hack', { category: 'fun', desc: 'Fake hack joke' }, async (sock, m, args) => {
    const target = parseTarget(args[0], m) || m.sender
    await m.reply(`Just kidding. No hacking.\nTarget joke: ${target.split('@')[0]}`)
  }),
  cmd('hug2', { category: 'fun', desc: 'Hug gif' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://api.waifu.pics/sfw/hug')
      await sock.sendMessage(m.chat, { video: { url: data.url }, gifPlayback: true }, { quoted: m })
    } catch (error) {
      await m.reply(`Hug failed: ${error.message}`)
    }
  }),
  cmd('inspire', { category: 'fun', desc: 'Inspirational quote' }, async (sock, m) => {
    await m.reply(pick(quotes))
  }),
  cmd('insult', { category: 'fun', desc: 'Light insult' }, async (sock, m) => {
    await m.reply(pick(insults))
  }),
  cmd('jokes', { category: 'fun', desc: 'Random joke' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://official-joke-api.appspot.com/random_joke')
      await m.reply(`${data.setup}\n${data.punchline}`)
    } catch {
      await m.reply('Why did the function break up with the loop? It needed space.')
    }
  }),
  cmd('kill', { category: 'fun', desc: 'Playful KO' }, async (sock, m, args) => {
    const target = parseTarget(args[0], m)
    if (!target) {
      await m.reply('Tag someone.')
      return
    }
    await m.reply(`@${target.split('@')[0]} was eliminated in a minigame. No actual harm.`, { mentions: [target] })
  }),
  cmd('moviequote', { category: 'fun', desc: 'Movie quote' }, async (sock, m) => {
    await m.reply(pick(['I am inevitable.', 'May the Force be with you.', 'I\'ll be back.']))
  }),
  cmd('panda', { category: 'fun', desc: 'Panda image' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://some-random-api.com/animal/panda')
      if (!data?.image) throw new Error('No image')
      await sock.sendMessage(m.chat, { image: { url: data.image }, caption: data.fact || 'panda' }, { quoted: m })
    } catch (error) {
      await m.reply(`Panda API failed: ${error.message}`)
    }
  }),
  cmd('pickupline', { category: 'fun', desc: 'Pickup line' }, async (sock, m) => {
    await m.reply(pick(pickup))
  }),
  cmd('pubg', { category: 'fun', desc: 'PUBG drop' }, async (sock, m) => {
    await m.reply(`Drop: ${pick(['Pochinki', 'Georgopol', 'Military Base', 'School', 'Rozhok'])}`)
  }),
  cmd('quotes', { category: 'fun', desc: 'Quote' }, async (sock, m) => {
    await m.reply(pick(quotes))
  }),
  cmd('rate', { category: 'fun', desc: 'Rate something 0-100' }, async (sock, m, args) => {
    const thing = args.join(' ') || m.pushName
    await m.reply(`${thing} is ${rate(thing)}/100`)
  }),
  cmd('roast', { category: 'fun', desc: 'Roast' }, async (sock, m) => {
    await m.reply(pick(insults))
  }),
  cmd('ship', { category: 'fun', desc: 'Ship two names' }, async (sock, m, args) => {
    const a = args[0] || m.pushName
    const b = args[1] || 'mystery'
    await m.reply(`${a} + ${b} = ${rate(a + b)}% match`)
  }),
  cmd('simp', { category: 'fun', desc: 'Simp meter' }, async (sock, m, args) => {
    const name = args.join(' ') || m.pushName
    await m.reply(`${name} simp level: ${rate(name)}%`)
  }),
  cmd('trivia', { category: 'fun', desc: 'Trivia question' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://opentdb.com/api.php?amount=1&type=multiple')
      const q = data?.results?.[0]
      if (!q) throw new Error('empty')
      await m.reply(`*Trivia*\n${q.question}\nA) ${q.correct_answer}\n(Answers shuffled locally on next versions)`)
    } catch {
      await m.reply('Trivia API unavailable right now.')
    }
  }),
  cmd('truth', { category: 'fun', desc: 'Truth question' }, async (sock, m) => {
    await m.reply(`*Truth*\n${pick(truths)}`)
  }),
  cmd('truthordare', { category: 'fun', desc: 'Truth or dare' }, async (sock, m) => {
    await m.reply(Math.random() > 0.5 ? `Truth: ${pick(truths)}` : `Dare: ${pick(dares)}`)
  }),
  cmd('wave', { category: 'fun', desc: 'Wave' }, async (sock, m) => {
    await m.reply('Wave sent.')
  }),
  cmd('wink', { category: 'fun', desc: 'Wink gif' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://api.waifu.pics/sfw/wink')
      await sock.sendMessage(m.chat, { video: { url: data.url }, gifPlayback: true }, { quoted: m })
    } catch (error) {
      await m.reply(`Wink failed: ${error.message}`)
    }
  }),
  cmd('wyr', { category: 'fun', desc: 'Would you rather' }, async (sock, m) => {
    await m.reply(pick(wyr))
  })
]

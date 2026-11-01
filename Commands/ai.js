import { cmd } from '../lib/command.js'
import { chatLLM, geminiChat, apiError } from '../lib/providers.js'
import { fetchJson, missingApi } from '../lib/functions.js'
import { pick, truncate } from '../lib/helpers.js'
import config from '../config.js'

async function needText(m, args, usage) {
  const text = args.join(' ') || m.quoted?.body
  if (!text) {
    await m.reply(usage)
    return null
  }
  return text
}

async function llmReply(m, prompt, system) {
  try {
    const text = await chatLLM(prompt, { system })
    await m.reply(truncate(text))
  } catch (error) {
    await m.reply(apiError(error))
  }
}

const dares = [
  'Send a voice note singing your favorite song.',
  'Change your profile picture for 10 minutes.',
  'Text a random emoji to the last person you chatted with.',
  'Talk in rhymes for the next 5 messages.'
]
const flirts = [
  'Are you Wi-Fi? Because I feel a connection.',
  'Do you have a map? I keep getting lost in your messages.',
  'If you were a command, you would be my favorite prefix.'
]
const zodiac = {
  aries: 'Aries: bold, fast, and allergic to waiting.',
  taurus: 'Taurus: steady, stubborn, snack-powered.',
  gemini: 'Gemini: two tabs open, both talking.',
  cancer: 'Cancer: soft shell, steel memory.',
  leo: 'Leo: main character energy, documented.',
  virgo: 'Virgo: will fix your life and your grammar.',
  libra: 'Libra: cannot pick a restaurant, can pick a vibe.',
  scorpio: 'Scorpio: remembers everything you thought they forgot.',
  sagittarius: 'Sagittarius: passport out, plans optional.',
  capricorn: 'Capricorn: sleep is a myth, goals are not.',
  aquarius: 'Aquarius: 10 years ahead, 5 minutes late.',
  pisces: 'Pisces: cried at an ad, then wrote a poem about it.'
}

const llmCommands = [
  ['analyze', 'Analyze text with AI', 'You are an analyst. Be concise.'],
  ['blackbox', 'Blackbox-style coding help', 'You are a coding assistant.'],
  ['chatbot', 'Generic chatbot', 'You are ARCEUS XD, a helpful WhatsApp bot.'],
  ['deepseek', 'DeepSeek-style chat', 'You are a reasoning assistant.'],
  ['doppleai', 'Casual AI chat', 'You are a friendly companion.'],
  ['explaincode', 'Explain code', 'Explain code clearly for beginners.'],
  ['generate', 'Generate text', 'Generate high quality writing.'],
  ['gpt', 'GPT-style chat', 'You are a helpful assistant.'],
  ['grok-ai', 'Grok-style chat', 'Be witty but accurate.'],
  ['llama', 'Llama-style chat', 'You are a helpful open model assistant.'],
  ['metaai', 'Meta AI-style chat', 'Be concise and useful.'],
  ['mistral', 'Mistral-style chat', 'Be precise and technical when needed.'],
  ['programming', 'Programming help', 'You are a senior software engineer.'],
  ['qwen', 'Qwen-style chat', 'You are a capable multilingual assistant.'],
  ['recipe', 'Create a recipe', 'Create a practical recipe.'],
  ['story', 'Write a short story', 'Write a short original story.'],
  ['summarize', 'Summarize text', 'Summarize clearly in bullet points.'],
  ['teach', 'Teach a topic', 'Teach step by step.'],
  ['translate2', 'AI translation', 'Translate accurately. Return only the translation unless asked.'],
  ['valentine', 'Write a valentine message', 'Write a tasteful valentine message.']
]

const list = [
  cmd('cat', { category: 'ai', desc: 'Random cat image' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://api.thecatapi.com/v1/images/search')
      const url = data?.[0]?.url
      if (!url) throw new Error('No image')
      await sock.sendMessage(m.chat, { image: { url }, caption: 'cat' }, { quoted: m })
    } catch (error) {
      await m.reply(`Cat API failed: ${error.message}`)
    }
  }),

  cmd('dog', { category: 'ai', desc: 'Random dog image' }, async (sock, m) => {
    try {
      const data = await fetchJson('https://dog.ceo/api/breeds/image/random')
      if (!data?.message) throw new Error('No image')
      await sock.sendMessage(m.chat, { image: { url: data.message }, caption: 'dog' }, { quoted: m })
    } catch (error) {
      await m.reply(`Dog API failed: ${error.message}`)
    }
  }),

  cmd('dare', { category: 'ai', desc: 'Random dare' }, async (sock, m) => {
    await m.reply(`*Dare*\n${pick(dares)}`)
  }),

  cmd('flirt', { category: 'ai', desc: 'Flirt line' }, async (sock, m) => {
    await m.reply(pick(flirts))
  }),

  cmd('gemini', { category: 'ai', desc: 'Google Gemini chat' }, async (sock, m, args) => {
    const text = await needText(m, args, 'Usage: .gemini <prompt>')
    if (!text) return
    try {
      await m.reply(truncate(await geminiChat(text)))
    } catch (error) {
      await m.reply(apiError(error))
    }
  }),

  cmd('dalle', { category: 'ai', desc: 'Image generation (OpenAI-compatible)' }, async (sock, m, args) => {
    const prompt = await needText(m, args, 'Usage: .dalle <prompt>')
    if (!prompt) return
    if (!config.apis.openai && !config.llm.apiKey) {
      await m.reply(missingApi('Image generation', 'USER_OPENAI_API_KEY or USER_LLM_API_KEY'))
      return
    }
    await m.reply(
      'No image endpoint is hardcoded. Configure an OpenAI-compatible images API yourself. This command will not invent a fake image.'
    )
  }),

  cmd('imagen', { category: 'ai', desc: 'Imagen-style generation' }, async (sock, m, args) => {
    const prompt = await needText(m, args, 'Usage: .imagen <prompt>')
    if (!prompt) return
    await m.reply(missingApi('Imagen / image provider', 'USER_OPENAI_API_KEY'))
  }),

  cmd('neon', { category: 'ai', desc: 'Neon text idea' }, async (sock, m, args) => {
    const text = await needText(m, args, 'Usage: .neon <text>')
    if (!text) return
    await llmReply(m, `Create 5 neon sign slogans for: ${text}`)
  }),

  cmd('pixabay', { category: 'ai', desc: 'Pixabay requires an API key' }, async (sock, m) => {
    await m.reply(missingApi('Pixabay', 'PIXABAY_API_KEY'))
  }),

  cmd('zodiac', { category: 'ai', desc: 'Zodiac blurb' }, async (sock, m, args) => {
    const sign = String(args[0] || '').toLowerCase()
    if (!zodiac[sign]) {
      await m.reply(`Usage: .zodiac leo\nSigns: ${Object.keys(zodiac).join(', ')}`)
      return
    }
    await m.reply(zodiac[sign])
  }),

  ...llmCommands.map(([name, desc, system]) =>
    cmd(name, { category: 'ai', desc }, async (sock, m, args) => {
      const text = await needText(m, args, `Usage: .${name} <text>`)
      if (!text) return
      await llmReply(m, text, system)
    })
  )
]

export default list

import axios from 'axios'
import config from '../config.js'
import { missingApi } from './functions.js'

export function requireEnv(value, label, envName) {
  if (!value) {
    const error = new Error(missingApi(label, envName))
    error.userFacing = true
    throw error
  }
  return value
}

export async function chatLLM(prompt, { system } = {}) {
  const apiKey = requireEnv(config.llm.apiKey, 'LLM provider', 'USER_LLM_API_KEY')
  const { data } = await axios.post(
    `${config.llm.baseUrl.replace(/\/$/, '')}/chat/completions`,
    {
      model: config.llm.model,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: String(prompt) }
      ],
      temperature: 0.7
    },
    {
      timeout: 45000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  )
  const text = data?.choices?.[0]?.message?.content
  if (!text) throw new Error('LLM returned an empty response.')
  return text
}

export async function downloadProvider(url, type = 'auto') {
  const endpoint = requireEnv(config.apis.download, 'Download provider', 'DOWNLOAD_API_URL')
  const { data } = await axios.get(endpoint, {
    params: { url, type },
    timeout: config.downloadTimeoutMs,
    maxContentLength: config.maxDownloadMb * 1024 * 1024
  })
  if (!data || data.error) throw new Error(data?.error || 'Download provider returned no data.')
  return data
}

export async function ephotoProvider(effect, text) {
  const endpoint = requireEnv(config.apis.ephoto, 'Ephoto360 provider', 'EPHOTO_API_URL')
  const { data } = await axios.get(endpoint, {
    params: { effect, text },
    timeout: 30000
  })
  if (!data?.url && !data?.image) throw new Error('Ephoto provider returned no image URL.')
  return data.url || data.image
}

export async function geminiChat(prompt) {
  const key = requireEnv(config.apis.gemini, 'Gemini', 'GEMINI_API_KEY')
  const { data } = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
    { contents: [{ parts: [{ text: String(prompt) }] }] },
    { timeout: 45000 }
  )
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('\n')
  if (!text) throw new Error('Gemini returned an empty response.')
  return text
}

export function apiError(error) {
  if (error?.userFacing) return error.message
  if (error?.response?.status === 401 || error?.response?.status === 403) {
    return 'API key rejected. Check your .env configuration.'
  }
  return `Request failed: ${error.message}`
}

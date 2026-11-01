import { jidNormalizedUser, isJidGroup } from '@whiskeysockets/baileys'
import config from '../config.js'
import db from '../database/database.js'

export function cleanNumber(input = '') {
  return String(input).replace(/\D/g, '')
}

export function toPnJid(input) {
  if (!input) return ''
  if (String(input).includes('@')) return jidNormalizedUser(input)
  return `${cleanNumber(input)}@s.whatsapp.net`
}

export function normalizeJid(jid = '') {
  if (!jid) return ''
  return jidNormalizedUser(jid)
}

export function extractDigits(jid = '') {
  return cleanNumber(String(jid).split('@')[0].split(':')[0])
}

export function identityKeys(jid = '', alt = '') {
  const keys = new Set()
  for (const value of [jid, alt]) {
    if (!value) continue
    keys.add(normalizeJid(value))
    keys.add(extractDigits(value))
  }
  return [...keys].filter(Boolean)
}

export function isOwner(jid, alt) {
  const keys = identityKeys(jid, alt)
  const owners = (config.owners || []).flatMap((owner) => identityKeys(toPnJid(owner), owner))
  const sudo = (db.data.sudo || []).flatMap((owner) => identityKeys(owner))
  return keys.some((key) => owners.includes(key) || sudo.includes(key))
}

export function formatUptime(ms) {
  const sec = Math.floor(ms / 1000)
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${d}d ${h}h ${m}m ${s}s`
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function chunk(list, size) {
  const out = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function parseTarget(text, m) {
  const mention = m.mentionedJid?.[0]
  if (mention) return mention
  if (m.quoted?.sender) return m.quoted.sender
  if (text) return toPnJid(text)
  return ''
}

export function isUrl(text) {
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function extractUrls(text = '') {
  return String(text).match(/https?:\/\/[^\s]+/gi) || []
}

export function runtimeBanner() {
  return `${config.botName} v${config.version}`
}

export function inGroup(jid) {
  return isJidGroup(jid)
}

export function safeEvalMath(expr) {
  const cleaned = String(expr).replace(/[^0-9+\-*/().%\s]/g, '')
  if (!cleaned.trim()) throw new Error('Empty expression')
  // eslint-disable-next-line no-new-func
  const result = Function(`"use strict"; return (${cleaned})`)()
  if (!Number.isFinite(result)) throw new Error('Invalid result')
  return result
}

export function truncate(text, max = 3500) {
  const str = String(text || '')
  if (str.length <= max) return str
  return `${str.slice(0, max)}\n...truncated`
}

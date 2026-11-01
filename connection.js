import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { existsSync, mkdirSync, readdirSync, renameSync } from 'fs'
import { join } from 'path'
import readline from 'readline'
import pino from 'pino'
import chalk from 'chalk'
import qrcode from 'qrcode-terminal'
import config from './config.js'
import { handleMessages, handleGroupEvents, handleDelete, groupCache } from './handler.js'
import { getUptimeMs } from './lib/state.js'

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' })
let sock = null
let reconnecting = false
let shuttingDown = false
let pairingRequested = false
let bootId = 0

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function question(prompt) {
  if (!process.stdin.isTTY) return Promise.resolve('')
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close()
      resolve(answer)
    })
  })
}

function statusCode(error) {
  return error instanceof Boom ? error.output?.statusCode : error?.output?.statusCode
}

function formatPairingCode(code) {
  const digits = String(code || '').replace(/\s+/g, '')
  return digits.match(/.{1,4}/g)?.join('-') || digits
}

function isSocketOpen(currentSock) {
  const ws = currentSock?.ws
  if (!ws) return false
  if (ws.isOpen === true) return true
  if (typeof ws.readyState === 'number') return ws.readyState === 1
  return false
}

function archiveInvalidSession() {
  const dir = config.paths.auth
  mkdirSync(dir, { recursive: true })
  const files = readdirSync(dir).filter((file) => file !== '.gitkeep')
  if (!files.length) return false
  const backup = join(config.paths.root, `auth_info_invalid_${Date.now()}`)
  mkdirSync(backup, { recursive: true })
  for (const file of files) {
    const from = join(dir, file)
    if (!existsSync(from)) continue
    renameSync(from, join(backup, file))
  }
  console.log(chalk.yellow(`[${config.botName}] Archived invalid session files. Starting a fresh pair.`))
  return true
}

async function resolvePairingNumber() {
  let number = String(config.pairingNumber || '').replace(/\D/g, '')
  if (!number) number = String(config.owners?.[0] || '').replace(/\D/g, '')
  if (!number && process.stdin.isTTY) {
    const raw = await question(chalk.cyan('Enter WhatsApp number (country code + digits, no + or spaces): '))
    number = String(raw).replace(/\D/g, '')
  }
  return number
}

async function requestPairing(currentSock, currentBoot) {
  if (currentBoot !== bootId) return
  if (pairingRequested) return
  if (currentSock.authState?.creds?.registered) return
  if (!isSocketOpen(currentSock)) {
    console.log(chalk.yellow(`[${config.botName}] Waiting for a live socket before pairing...`))
    return
  }

  pairingRequested = true
  const number = await resolvePairingNumber()
  if (!number) {
    pairingRequested = false
    console.log(chalk.red('Pairing number missing. Set PHONE_NUMBER or OWNER_NUMBER, then restart.'))
    return
  }

  config.pairingNumber = number
  console.log(chalk.yellow(`[${config.botName}] Requesting pairing code for ${number}...`))

  try {
    await sleep(1500)
    if (currentBoot !== bootId) return
    if (!isSocketOpen(currentSock) || currentSock.authState?.creds?.registered) {
      pairingRequested = false
      return
    }
    const code = await currentSock.requestPairingCode(number)
    const pretty = formatPairingCode(code)
    console.log(chalk.green('\n========================================'))
    console.log(chalk.bold.white(`  PAIRING CODE: ${pretty}`))
    console.log(chalk.green('========================================'))
    console.log(chalk.yellow('WhatsApp → Linked Devices → Link a Device'))
    console.log(chalk.yellow('→ Link with phone number instead'))
    console.log(chalk.yellow(`Enter ${pretty} on the phone for +${number}\n`))
  } catch (error) {
    pairingRequested = false
    console.log(chalk.red(`Pairing failed: ${error.message}`))
  }
}

export async function startConnection() {
  if (shuttingDown) return sock
  if (reconnecting) return sock
  reconnecting = true
  pairingRequested = false
  const currentBoot = ++bootId

  mkdirSync(config.paths.auth, { recursive: true })
  const { state, saveCreds } = await useMultiFileAuthState(config.paths.auth)
  const { version, isLatest } = await fetchLatestBaileysVersion()

  console.log(chalk.gray(`WA Web version ${version.join('.')} (${isLatest ? 'latest' : 'cached'})`))
  if (!state.creds.registered) {
    console.log(chalk.cyan(`[${config.botName}] No valid session. Pairing mode.`))
  }

  if (sock) {
    try {
      sock.ev.removeAllListeners()
      sock.end(undefined)
    } catch {
      /* ignore previous socket */
    }
  }

  sock = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: config.alwaysOnline,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    cachedGroupMetadata: async (jid) => groupCache.get(jid),
    getMessage: async () => undefined
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    if (currentBoot !== bootId) return
    const { connection, lastDisconnect, qr } = update

    if (qr && !sock.authState.creds.registered && process.env.USE_QR === 'true') {
      console.log(chalk.cyan('Scan this QR with WhatsApp → Linked Devices'))
      qrcode.generate(qr, { small: true })
    }

    if (qr && !sock.authState.creds.registered && process.env.USE_QR !== 'true') {
      await requestPairing(sock, currentBoot)
    }

    if (connection === 'connecting') {
      console.log(chalk.yellow(`[${config.botName}] Connecting...`))
    }

    if (connection === 'open') {
      reconnecting = false
      pairingRequested = false
      const id = sock.user?.id || sock.user?.lid || 'unknown'
      console.log(chalk.green(`[${config.botName}] Connected as ${id}`))
      console.log(chalk.green(`[${config.botName}] Prefix: ${config.prefix} | Mode: ${config.public ? 'public' : 'private'}`))
    }

    if (connection === 'close') {
      const code = statusCode(lastDisconnect?.error)
      const reason = lastDisconnect?.error?.message || 'unknown'
      console.log(chalk.red(`[${config.botName}] Disconnected (${code || 'n/a'}): ${reason}`))
      pairingRequested = false

      if (shuttingDown) {
        reconnecting = false
        return
      }

      if (code === DisconnectReason.loggedOut || code === 401) {
        console.log(chalk.yellow(`[${config.botName}] Session invalid. Resetting and pairing again...`))
        archiveInvalidSession()
        reconnecting = false
        setTimeout(() => {
          startConnection().catch((error) => console.log(chalk.red(error.message)))
        }, 1500)
        return
      }

      if (code === DisconnectReason.connectionReplaced) {
        console.log(chalk.red('Connection replaced by another session. Not reconnecting automatically.'))
        reconnecting = false
        return
      }

      reconnecting = false
      const delay = code === DisconnectReason.restartRequired ? 1000 : 4000
      setTimeout(() => {
        startConnection().catch((error) => console.log(chalk.red(error.message)))
      }, delay)
    }
  })

  sock.ev.on('messages.upsert', (event) => handleMessages(sock, event))
  sock.ev.on('group-participants.update', (event) => handleGroupEvents(sock, event))
  sock.ev.on('groups.update', async (events) => {
    for (const event of events) {
      if (!event.id) continue
      try {
        groupCache.set(event.id, await sock.groupMetadata(event.id))
      } catch {
        /* ignore */
      }
    }
  })
  sock.ev.on('messages.update', (updates) => handleDelete(sock, updates))

  reconnecting = false
  return sock
}

export function getSock() {
  return sock
}

export function getUptime() {
  return getUptimeMs()
}

export async function shutdown() {
  shuttingDown = true
  try {
    if (sock) {
      sock.end(undefined)
      sock.ws?.close()
    }
  } catch {
    /* ignore */
  }
}

process.on('SIGINT', async () => {
  console.log(chalk.yellow('\nShutting down...'))
  await shutdown()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await shutdown()
  process.exit(0)
})

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const settingsPath = join(__dirname, 'database', 'settings.json')

function loadSettings() {
  try {
    if (existsSync(settingsPath)) {
      return JSON.parse(readFileSync(settingsPath, 'utf8'))
    }
  } catch {
    /* keep defaults */
  }
  return {}
}

function parseList(value) {
  if (!value) return []
  return String(value)
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

const saved = loadSettings()

const config = {
  botName: process.env.BOT_NAME || saved.botName || 'ARCEUS XD',
  version: '1.0.0',
  prefix: process.env.PREFIX || saved.prefix || '.',
  owners: parseList(process.env.OWNER_NUMBER || saved.owners?.join(',') || ''),
  ownerName: process.env.OWNER_NAME || saved.ownerName || 'ARCEUS',
  sessionDir: process.env.SESSION_DIR || 'auth_info',
  pairingNumber: (process.env.PHONE_NUMBER || saved.pairingNumber || saved.owners?.[0] || '').replace(/\D/g, ''),
  public: String(process.env.PUBLIC_MODE ?? saved.public ?? 'true') !== 'false',
  alwaysOnline: String(process.env.ALWAYS_ONLINE ?? saved.alwaysOnline ?? 'false') === 'true',
  autoRead: String(process.env.AUTO_READ ?? saved.autoRead ?? 'false') === 'true',
  autoReact: String(process.env.AUTO_REACT ?? saved.autoReact ?? 'false') === 'true',
  autoTyping: String(process.env.AUTO_TYPING ?? saved.autoTyping ?? 'false') === 'true',
  autoSaveStatus: String(process.env.AUTO_SAVE_STATUS ?? saved.autoSaveStatus ?? 'false') === 'true',
  antiDelete: String(process.env.ANTI_DELETE ?? saved.antiDelete ?? 'false') === 'true',
  antiDeleteStatus: String(process.env.ANTI_DELETE_STATUS ?? saved.antiDeleteStatus ?? 'false') === 'true',
  menuImage: process.env.MENU_IMAGE || saved.menuImage || '',
  repo: process.env.REPO_URL || saved.repo || 'https://github.com/your-username/ARCEUS-XD',
  pairWebsite: process.env.PAIR_WEBSITE || saved.pairWebsite || 'https://arceus-xd-pair.onrender.com',
  timezone: process.env.TZ || saved.timezone || 'UTC',
  cooldownMs: Number(process.env.COOLDOWN_MS || saved.cooldownMs || 2500),
  maxDownloadMb: Number(process.env.MAX_DOWNLOAD_MB || 25),
  downloadTimeoutMs: Number(process.env.DOWNLOAD_TIMEOUT_MS || 45000),
  broadcastLimit: Number(process.env.BROADCAST_LIMIT || 20),
  kickLimit: Number(process.env.KICK_LIMIT || 10),
  packName: process.env.PACK_NAME || saved.packName || 'ARCEUS XD',
  packAuthor: process.env.PACK_AUTHOR || saved.packAuthor || 'ARCEUS',
  llm: {
    apiKey: process.env.USER_LLM_API_KEY || '',
    baseUrl: process.env.USER_LLM_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.USER_LLM_MODEL || 'deepseek-chat'
  },
  apis: {
    weather: process.env.OPENWEATHER_API_KEY || '',
    removeBg: process.env.REMOVEBG_API_KEY || '',
    ephoto: process.env.EPHOTO_API_URL || '',
    download: process.env.DOWNLOAD_API_URL || '',
    gemini: process.env.GEMINI_API_KEY || '',
    groq: process.env.GROQ_API_KEY || '',
    openai: process.env.USER_OPENAI_API_KEY || ''
  },
  paths: {
    root: __dirname,
    database: join(__dirname, 'database'),
    tmp: join(__dirname, 'tmp'),
    auth: join(__dirname, process.env.SESSION_DIR || 'auth_info')
  }
}

export function persistConfig() {
  mkdirSync(dirname(settingsPath), { recursive: true })
  const payload = {
    botName: config.botName,
    prefix: config.prefix,
    owners: config.owners,
    ownerName: config.ownerName,
    public: config.public,
    alwaysOnline: config.alwaysOnline,
    autoRead: config.autoRead,
    autoReact: config.autoReact,
    autoTyping: config.autoTyping,
    autoSaveStatus: config.autoSaveStatus,
    antiDelete: config.antiDelete,
    antiDeleteStatus: config.antiDeleteStatus,
    menuImage: config.menuImage,
    repo: config.repo,
    timezone: config.timezone,
    cooldownMs: config.cooldownMs,
    packName: config.packName,
    packAuthor: config.packAuthor,
    pairingNumber: config.pairingNumber,
    pairWebsite: config.pairWebsite
  }
  writeFileSync(settingsPath, JSON.stringify(payload, null, 2))
}

if (!existsSync(settingsPath)) persistConfig()

export default config

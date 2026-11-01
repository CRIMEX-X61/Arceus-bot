import { execFile } from 'child_process'
import { promisify } from 'util'
import { createWriteStream, existsSync, mkdirSync, unlinkSync, writeFileSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'
import axios from 'axios'
import config from '../config.js'

const execFileAsync = promisify(execFile)

export function tmpFile(ext = 'bin') {
  mkdirSync(config.paths.tmp, { recursive: true })
  return join(config.paths.tmp, `${Date.now()}-${randomBytes(4).toString('hex')}.${ext}`)
}

export async function downloadUrl(url, { maxMb = config.maxDownloadMb, timeout = config.downloadTimeoutMs } = {}) {
  if (!/^https?:\/\//i.test(url)) throw new Error('Only http(s) URLs are allowed')
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout,
    maxContentLength: maxMb * 1024 * 1024,
    maxBodyLength: maxMb * 1024 * 1024,
    headers: { 'User-Agent': 'ARCEUS-XD/1.0' }
  })
  return Buffer.from(response.data)
}

export async function downloadToFile(url, ext = 'bin') {
  const buffer = await downloadUrl(url)
  const file = tmpFile(ext)
  writeFileSync(file, buffer)
  return file
}

export async function runFfmpeg(args, timeout = 30000) {
  try {
    await execFileAsync('ffmpeg', ['-y', ...args], { timeout, maxBuffer: 10 * 1024 * 1024 })
    return true
  } catch (error) {
    const message = error?.stderr || error?.message || 'FFmpeg failed'
    throw new Error(String(message).slice(0, 400))
  }
}

export function hasFfmpeg() {
  return new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], (error) => resolve(!error))
  })
}

export async function convertAudio(input, filter, ext = 'mp3') {
  const output = tmpFile(ext)
  await runFfmpeg(['-i', input, '-af', filter, output])
  const buffer = readFileSync(output)
  cleanup(input, output)
  return buffer
}

export async function convertMedia(input, extraArgs, ext = 'mp4') {
  const output = tmpFile(ext)
  await runFfmpeg(['-i', input, ...extraArgs, output])
  const buffer = readFileSync(output)
  cleanup(input, output)
  return buffer
}

export function cleanup(...files) {
  for (const file of files) {
    try {
      if (file && existsSync(file)) unlinkSync(file)
    } catch {
      /* ignore */
    }
  }
}

export async function fetchJson(url, options = {}) {
  const { data } = await axios.get(url, {
    timeout: options.timeout || 20000,
    headers: { 'User-Agent': 'ARCEUS-XD/1.0', ...(options.headers || {}) }
  })
  return data
}

export async function postJson(url, body, options = {}) {
  const { data } = await axios.post(url, body, {
    timeout: options.timeout || 30000,
    headers: { 'User-Agent': 'ARCEUS-XD/1.0', ...(options.headers || {}) }
  })
  return data
}

export function writeBuffer(buffer, ext = 'bin') {
  const file = tmpFile(ext)
  writeFileSync(file, buffer)
  return file
}

export function streamToFile(stream, ext = 'bin') {
  return new Promise((resolve, reject) => {
    const file = join(tmpdir(), `${Date.now()}.${ext}`)
    const out = createWriteStream(file)
    stream.pipe(out)
    out.on('finish', () => resolve(file))
    out.on('error', reject)
  })
}

export function missingApi(name, envName) {
  return `*${name}* is not configured.\nSet \`${envName}\` in your .env file, then restart the bot.\nNo fake result is returned.`
}

export function llmNotReady() {
  return missingApi('LLM provider', 'USER_LLM_API_KEY')
}

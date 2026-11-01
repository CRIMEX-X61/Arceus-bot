import { cmd } from '../lib/command.js'
import { downloadProvider, apiError } from '../lib/providers.js'
import { isUrl, truncate } from '../lib/helpers.js'
import { downloadUrl, missingApi } from '../lib/functions.js'
import config from '../config.js'

async function requireUrl(m, args, usage) {
  const url = args.find((item) => isUrl(item)) || (isUrl(args[0]) ? args[0] : null) || (isUrl(m.quoted?.body) ? m.quoted.body : null)
  if (!url) {
    await m.reply(usage)
    return null
  }
  return url
}

async function viaProvider(sock, m, url, type, caption) {
  try {
    const data = await downloadProvider(url, type)
    const mediaUrl = data.url || data.media || data.result?.url
    const text = data.title || data.result?.title
    if (mediaUrl && type.includes('audio')) {
      await sock.sendMessage(m.chat, { audio: { url: mediaUrl }, mimetype: 'audio/mpeg', caption: text || caption }, { quoted: m })
      return
    }
    if (mediaUrl && (type.includes('video') || type === 'auto')) {
      await sock.sendMessage(m.chat, { video: { url: mediaUrl }, caption: text || caption }, { quoted: m })
      return
    }
    if (mediaUrl) {
      await sock.sendMessage(m.chat, { image: { url: mediaUrl }, caption: text || caption }, { quoted: m })
      return
    }
    await m.reply(truncate(JSON.stringify(data, null, 2)))
  } catch (error) {
    await m.reply(apiError(error))
  }
}

const urlCommands = [
  ['apk', 'apk', 'Usage: .apk <play-store-or-apk-url>'],
  ['capcut', 'capcut', 'Usage: .capcut <url>'],
  ['dlmovie', 'movie', 'Usage: .dlmovie <url>'],
  ['download', 'auto', 'Usage: .download <url>'],
  ['facebook', 'facebook', 'Usage: .facebook <url>'],
  ['fbaudio', 'facebook-audio', 'Usage: .fbaudio <url>'],
  ['gdrive', 'gdrive', 'Usage: .gdrive <url>'],
  ['gitclone', 'gitclone', 'Usage: .gitclone <github-repo-url>'],
  ['igaudio', 'instagram-audio', 'Usage: .igaudio <url>'],
  ['instagram', 'instagram', 'Usage: .instagram <url>'],
  ['itunes', 'itunes', 'Usage: .itunes <url-or-query>'],
  ['mediafire', 'mediafire', 'Usage: .mediafire <url>'],
  ['movie2', 'movie', 'Usage: .movie2 <url>'],
  ['pin', 'pinterest', 'Usage: .pin <url>'],
  ['spotify', 'spotify', 'Usage: .spotify <url>'],
  ['subtitle', 'subtitle', 'Usage: .subtitle <url>'],
  ['tiktok', 'tiktok', 'Usage: .tiktok <url>'],
  ['tik-img', 'tiktok-image', 'Usage: .tik-img <url>'],
  ['tiktokaudio', 'tiktok-audio', 'Usage: .tiktokaudio <url>'],
  ['twitter', 'twitter', 'Usage: .twitter <url>'],
  ['video', 'video', 'Usage: .video <url>'],
  ['videodoc', 'video', 'Usage: .videodoc <url>'],
  ['ytmp3', 'ytmp3', 'Usage: .ytmp3 <url>'],
  ['ytmp3doc', 'ytmp3', 'Usage: .ytmp3doc <url>'],
  ['song', 'ytmp3', 'Usage: .song <url-or-query>'],
  ['song2', 'ytmp3', 'Usage: .song2 <url>']
]

const list = urlCommands.map(([name, type, usage]) =>
  cmd(name, { category: 'download', desc: `${name} downloader`, cooldown: 8 }, async (sock, m, args) => {
    if (!config.apis.download) {
      await m.reply(
        `${missingApi('Media downloader', 'DOWNLOAD_API_URL')}\nExpected JSON: { url, title }\nNo unofficial downloader endpoint is hardcoded.`
      )
      return
    }
    const url = await requireUrl(m, args, usage)
    if (!url) return
    await viaProvider(sock, m, url, type, name)
  })
)

list.push(
  cmd('image', { category: 'download', desc: 'Download an image URL' }, async (sock, m, args) => {
    const url = await requireUrl(m, args, 'Usage: .image <direct-image-url>')
    if (!url) return
    try {
      const buffer = await downloadUrl(url)
      await sock.sendMessage(m.chat, { image: buffer, caption: 'Downloaded' }, { quoted: m })
    } catch (error) {
      await m.reply(`Image download failed: ${error.message}`)
    }
  }),

  cmd('savestatus', { category: 'download', desc: 'Save quoted status/media' }, async (sock, m) => {
    const target = m.quoted || m
    if (!target?.download) {
      await m.reply('Reply to status or media.')
      return
    }
    try {
      const buffer = await target.download()
      const type = target.type
      if (type === 'videoMessage') await sock.sendMessage(m.chat, { video: buffer, caption: 'Saved' }, { quoted: m })
      else if (type === 'audioMessage') await sock.sendMessage(m.chat, { audio: buffer, mimetype: 'audio/mpeg' }, { quoted: m })
      else await sock.sendMessage(m.chat, { image: buffer, caption: 'Saved' }, { quoted: m })
    } catch (error) {
      await m.reply(`Save failed: ${error.message}`)
    }
  }),

  cmd('selectmovie', { category: 'download', desc: 'Movie search placeholder' }, async (sock, m, args) => {
    if (!args[0]) {
      await m.reply('Usage: .selectmovie <title>')
      return
    }
    await m.reply(
      `${missingApi('Movie provider', 'DOWNLOAD_API_URL')}\nThis bot does not scrape piracy sites.`
    )
  })
)

export default list

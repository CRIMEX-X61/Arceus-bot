import { proto } from '@whiskeysockets/baileys'

export function textMessage(text) {
  return { text: String(text ?? '') }
}

export function imageMessage(buffer, caption = '') {
  return { image: buffer, caption }
}

export function videoMessage(buffer, caption = '', gifPlayback = false) {
  return { video: buffer, caption, gifPlayback }
}

export function audioMessage(buffer, ptt = false) {
  return { audio: buffer, mimetype: ptt ? 'audio/ogg; codecs=opus' : 'audio/mpeg', ptt }
}

export function stickerMessage(buffer) {
  return { sticker: buffer }
}

export function documentMessage(buffer, fileName, mimetype = 'application/octet-stream') {
  return { document: buffer, fileName, mimetype }
}

export function mentionText(text, jids = []) {
  return { text, mentions: jids }
}

export function pollMessage(name, values, selectableCount = 1) {
  return { poll: { name, values, selectableCount } }
}

export function protoText(text) {
  return proto.Message.create({ conversation: text })
}

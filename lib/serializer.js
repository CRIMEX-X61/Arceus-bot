import {
  downloadMediaMessage,
  extractMessageContent,
  getContentType,
  isJidGroup,
  jidNormalizedUser
} from '@whiskeysockets/baileys'

function unwrap(message) {
  if (!message) return null
  if (message.ephemeralMessage) return unwrap(message.ephemeralMessage.message)
  if (message.viewOnceMessage) return unwrap(message.viewOnceMessage.message)
  if (message.viewOnceMessageV2) return unwrap(message.viewOnceMessageV2.message)
  if (message.viewOnceMessageV2Extension) return unwrap(message.viewOnceMessageV2Extension.message)
  if (message.documentWithCaptionMessage) return unwrap(message.documentWithCaptionMessage.message)
  if (message.editedMessage) return unwrap(message.editedMessage.message)
  return extractMessageContent(message) || message
}

export function serialize(sock, raw) {
  const m = { ...raw }
  m.sock = sock
  m.key = raw.key
  m.id = raw.key?.id
  m.fromMe = Boolean(raw.key?.fromMe)
  m.chat = raw.key?.remoteJid
  m.isGroup = isJidGroup(m.chat)
  m.sender = m.fromMe
    ? jidNormalizedUser(sock.user?.id || sock.user?.lid)
    : jidNormalizedUser(m.isGroup ? raw.key?.participant || raw.participant : raw.key?.remoteJid)
  m.senderAlt = m.isGroup ? raw.key?.participantAlt : raw.key?.remoteJidAlt
  m.pushName = raw.pushName || 'Unknown'
  m.messageTimestamp = raw.messageTimestamp
  m.broadcast = raw.broadcast

  const content = unwrap(raw.message) || {}
  m.message = content
  m.type = getContentType(content) || Object.keys(content)[0]
  const inner = content[m.type] || {}
  m.body =
    content.conversation ||
    inner.text ||
    inner.caption ||
    inner.selectedId ||
    inner.selectedDisplayText ||
    inner.selectedRowId ||
    inner.selectedButtonId ||
    ''
  m.mentionedJid = inner.contextInfo?.mentionedJid || []
  m.isViewOnce = Boolean(
    raw.message?.viewOnceMessage ||
      raw.message?.viewOnceMessageV2 ||
      raw.message?.viewOnceMessageV2Extension ||
      inner.viewOnce
  )

  const quotedRaw = inner.contextInfo?.quotedMessage
  if (quotedRaw) {
    const qContent = unwrap(quotedRaw) || quotedRaw
    const qType = getContentType(qContent) || Object.keys(qContent)[0]
    const qInner = qContent[qType] || {}
    m.quoted = {
      key: {
        remoteJid: inner.contextInfo.remoteJid || m.chat,
        fromMe: inner.contextInfo.participant
          ? jidNormalizedUser(inner.contextInfo.participant) === jidNormalizedUser(sock.user?.id)
          : false,
        id: inner.contextInfo.stanzaId,
        participant: inner.contextInfo.participant
      },
      message: qContent,
      type: qType,
      sender: inner.contextInfo.participant,
      body: qContent.conversation || qInner.text || qInner.caption || '',
      download: async () =>
        downloadMediaMessage(
          { message: qContent, key: { id: inner.contextInfo.stanzaId } },
          'buffer',
          {},
          { logger: sock.logger, reuploadRequest: sock.updateMediaMessage }
        )
    }
  }

  m.download = async () =>
    downloadMediaMessage(raw, 'buffer', {}, { logger: sock.logger, reuploadRequest: sock.updateMediaMessage })

  m.reply = (text, extra = {}) => sock.sendMessage(m.chat, { text, ...extra }, { quoted: raw })
  m.react = (emoji) => sock.sendMessage(m.chat, { react: { text: emoji, key: raw.key } })

  return m
}

export default serialize

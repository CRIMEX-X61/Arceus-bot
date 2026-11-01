import { loadCommands, commands } from '../handler.js'

const required = [
  'ping', 'ping2', 'alive', 'menu', 'help', 'botinfo', 'botstatus', 'owner', 'uptime', 'time',
  'pair', 'repo', 'prefix', 'groupinfo', 'groupid', 'getpp', 'getjid', 'getid', 'invite', 'rules',
  'poll', 'qrcode', 'sticker', 'toimage', 'tovideo', 'toaudio', 'vv2', 'translate', 'calculate', 'weather',
  'add', 'kick', 'promote', 'demote', 'tagall', 'hidetag', 'tagadmin', 'mute', 'unmute', 'open', 'close',
  'link', 'resetlink', 'welcome', 'goodbye', 'setwelcome', 'setgoodbye', 'setgname', 'setdesc',
  'antilink', 'antispam', 'antibadword', 'antibot', 'antitag', 'antigroupmention', 'antisticker',
  'warn', 'resetwarn', 'kickall', 'kickinactive', 'totalmembers', 'listactive', 'listinactive',
  'delete', 'approve', 'reject', 'vcf',
  'addsudo', 'delsudo', 'block', 'unblock', 'broadcast', 'join', 'leave', 'mode', 'public', 'private',
  'setprefix', 'setbio', 'restart', 'shutdown', 'getsession', 'getsettings', 'setvar', 'getvar',
  'alwaysonline', 'autoread', 'autoreact', 'autotyping', 'antidelete', 'antideletestatus', 'autosavestatus',
  'systemstatus',
  'analyze', 'blackbox', 'cat', 'chatbot', 'dalle', 'dare', 'deepseek', 'dog', 'doppleai', 'explaincode',
  'flirt', 'gemini', 'generate', 'gpt', 'grok-ai', 'imagen', 'llama', 'metaai', 'mistral', 'neon',
  'pixabay', 'programming', 'qwen', 'recipe', 'story', 'summarize', 'teach', 'translate2', 'valentine', 'zodiac',
  'anime', 'animegif', 'animenews', 'animequote', 'animerec', 'character', 'cuddle', 'feed', 'foxgirl',
  'goose', 'hug', 'kiss', 'lizard', 'manga', 'pat', 'season', 'slap', 'smug', 'tickle',
  '8daudio', 'bassboost', 'black', 'blown', 'chipmunk', 'deep', 'earrape', 'echo', 'fast', 'fat',
  'flanger', 'nightcore', 'reverb', 'reverse', 'robot', 'slow', 'slowed', 'smooth', 'squirrel',
  'tomp3', 'toptt', 'tremolo', 'vibrato', 'volaudio',
  'apk', 'capcut', 'dlmovie', 'download', 'facebook', 'fbaudio', 'gdrive', 'gitclone', 'igaudio',
  'image', 'instagram', 'itunes', 'mediafire', 'movie2', 'pin', 'savestatus', 'selectmovie', 'song',
  'song2', 'spotify', 'subtitle', 'tiktok', 'tik-img', 'tiktokaudio', 'twitter', 'video', 'videodoc',
  'ytmp3', 'ytmp3doc',
  '1917style', 'advancedglow', 'blackpinklogo', 'blackpinkstyle', 'cartoonstyle', 'deletingtext',
  'dragonball', 'effectclouds', 'flag3dtext', 'flagtext', 'freecreate', 'galaxystyle', 'galaxywallpaper',
  'glitchtext', 'glowingtext', 'gradienttext', 'graffiti', 'incandescent', 'lighteffects', 'logomaker',
  'luxurygold', 'makingneon', 'matrix', 'multicoloredneon', 'neonglitch', 'papercutstyle', 'pixelglitch',
  'royaltext', 'sand', 'summerbeach', 'topography', 'watercolortext', 'writetext',
  '8ball', 'advice', 'avengers', 'blur', 'bully', 'coffee', 'compliment', 'couplepp', 'dadjoke',
  'dance2', 'emojiquiz', 'fact', 'funfact', 'gfx', 'hack', 'hug2', 'inspire', 'insult', 'jokes',
  'kill', 'moviequote', 'panda', 'pickupline', 'pubg', 'quotes', 'rate', 'roast', 'ship', 'simp',
  'trivia', 'truth', 'truthordare', 'wave', 'wink', 'wyr',
  'battle', 'coin', 'connect4', 'dice', 'fasttype', 'footballquiz', 'guess', 'hangman', 'luck',
  'math', 'memory', 'numbattle', 'quiz', 'riddle', 'rps', 'scramble', 'survive', 'ttt', 'whoami', 'wordle',
  'carbon', 'invert', 'jail', 'naturewlp', 'rainbow', 'remini', 'wallpaper', 'wanted', 'wasted',
  'gfx2', 'gfx3', 'gfx4', 'gfx5', 'gfx6', 'gfx7', 'gfx8', 'gfx9', 'gfx10', 'gfx11', 'gfx12',
  'book', 'define', 'element', 'imdb', 'lyrics', 'namemeaning', 'npm', 'shazam', 'songscan',
  'tiktoksearch', 'websearch', 'wiki', 'yts',
  'addnote', 'anagram', 'base64', 'bmi', 'browse', 'calculate', 'catbox', 'channelid', 'channelinfo',
  'circlestk', 'cmdsearch', 'color', 'compress', 'countdown', 'currency', 'dns', 'doc', 'emojimix',
  'fancy', 'features', 'genpass', 'genusername', 'getabout', 'getnote', 'getnotes', 'github',
  'gsmarena', 'hash', 'jsonformat', 'listcmd', 'myip', 'namegen', 'ocr', 'readqr', 'removebg',
  'roman', 'say', 'shorten', 'sitecheck', 'split', 'ssweb', 'take', 'telesticker', 'tempmail',
  'texttopdf', 'tinyurl', 'tourl', 'unit', 'whois',
  'volvideo', 'webp2mp4',
  'cryptonews', 'forex',
  'bible', 'praytime', 'quran',
  'feedback', 'helpers'
]

await loadCommands()
const missing = required.filter((name) => !commands.has(name) && ![...commands.values()].some((c) => (c.aliases || []).includes(name)))
if (missing.length) {
  console.error('Missing commands:', missing.join(', '))
  process.exit(1)
}
console.log(`OK ${commands.size} commands, all required names registered`)

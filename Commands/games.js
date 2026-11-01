import { cmd } from '../lib/command.js'
import { pick } from '../lib/helpers.js'

const riddles = [
  { q: 'What has keys but cannot open locks?', a: 'keyboard' },
  { q: 'What gets wetter as it dries?', a: 'towel' },
  { q: 'What has a neck but no head?', a: 'bottle' }
]
const words = ['arceus', 'whatsapp', 'baileys', 'javascript', 'pairing', 'sticker', 'group']
const whoami = ['Einstein', 'Luffy', 'Tesla', 'Messi', 'Ada Lovelace']

function game(db, chat, name, data) {
  if (!db.data.games[chat]) db.data.games[chat] = {}
  db.data.games[chat][name] = data
  db.save()
}

function getGame(db, chat, name) {
  return db.data.games[chat]?.[name]
}

function clearGame(db, chat, name) {
  if (db.data.games[chat]) delete db.data.games[chat][name]
  db.save()
}

function scramble(word) {
  const arr = word.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('')
}

function tttBoard(cells) {
  const show = cells.map((c, i) => c || String(i + 1))
  return `${show[0]} | ${show[1]} | ${show[2]}\n---------\n${show[3]} | ${show[4]} | ${show[5]}\n---------\n${show[6]} | ${show[7]} | ${show[8]}`
}

function winner(cells) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ]
  for (const [a, b, c] of lines) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a]
  }
  if (cells.every(Boolean)) return 'draw'
  return null
}

export default [
  cmd('battle', { category: 'games', desc: 'HP battle vs quoted user' }, async (sock, m, args) => {
    const a = m.pushName
    const b = args[0] || 'CPU'
    const ha = Math.floor(Math.random() * 100)
    const hb = Math.floor(Math.random() * 100)
    await m.reply(`*Battle*\n${a}: ${ha} HP\n${b}: ${hb} HP\nWinner: ${ha >= hb ? a : b}`)
  }),

  cmd('coin', { category: 'games', desc: 'Flip a coin' }, async (sock, m) => {
    await m.reply(pick(['Heads', 'Tails']))
  }),

  cmd('connect4', { category: 'games', desc: 'Start Connect 4' }, async (sock, m, args, ctx) => {
    const board = Array.from({ length: 6 }, () => Array(7).fill('.'))
    game(ctx.db, m.chat, 'connect4', { board, turn: m.sender })
    await m.reply('Connect4 started. Use .connect4drop <0-6>')
  }),

  cmd('connect4drop', { category: 'games', desc: 'Drop in Connect 4' }, async (sock, m, args, ctx) => {
    const g = getGame(ctx.db, m.chat, 'connect4')
    if (!g) {
      await m.reply('No Connect4 game. Use .connect4')
      return
    }
    const col = Number(args[0])
    if (Number.isNaN(col) || col < 0 || col > 6) {
      await m.reply('Column 0-6')
      return
    }
    const mark = g.turn === m.sender ? 'X' : 'O'
    let placed = false
    for (let r = 5; r >= 0; r--) {
      if (g.board[r][col] === '.') {
        g.board[r][col] = mark
        placed = true
        break
      }
    }
    if (!placed) {
      await m.reply('Column full')
      return
    }
    g.turn = m.sender
    ctx.db.save()
    await m.reply(g.board.map((row) => row.join(' ')).join('\n'))
  }),

  cmd('dice', { category: 'games', desc: 'Roll dice' }, async (sock, m, args) => {
    const n = Math.min(Math.max(Number(args[0]) || 1, 1), 10)
    const rolls = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6))
    await m.reply(`Dice: ${rolls.join(', ')}`)
  }),

  cmd('fasttype', { category: 'games', desc: 'Type the word fast' }, async (sock, m, args, ctx) => {
    const word = pick(words)
    game(ctx.db, m.chat, 'fasttype', { word, at: Date.now() })
    await m.reply(`Type this exactly with .guess ${word.split('').join('\u200b')}\nWait: use .guess ${word}`)
  }),

  cmd('footballquiz', { category: 'games', desc: 'Football quiz' }, async (sock, m, args, ctx) => {
    const q = pick([
      { q: 'How many players per football team on the pitch?', a: '11' },
      { q: 'World Cup is held every how many years?', a: '4' }
    ])
    game(ctx.db, m.chat, 'quiz', q)
    await m.reply(`*Football quiz*\n${q.q}\nAnswer with .guess`)
  }),

  cmd('guess', { category: 'games', desc: 'Answer active game' }, async (sock, m, args, ctx) => {
    const answer = args.join(' ').toLowerCase()
    if (!answer) {
      await m.reply('Usage: .guess <answer>')
      return
    }
    const chatGames = ctx.db.data.games[m.chat] || {}
    for (const [name, g] of Object.entries(chatGames)) {
      if (g?.a && answer === String(g.a).toLowerCase()) {
        clearGame(ctx.db, m.chat, name)
        await m.reply(`Correct (${name})!`)
        return
      }
      if (g?.word && answer === String(g.word).toLowerCase()) {
        clearGame(ctx.db, m.chat, name)
        await m.reply(`Correct word: ${g.word}`)
        return
      }
    }
    await m.reply('No matching active puzzle, or wrong answer.')
  }),

  cmd('hangman', { category: 'games', desc: 'Start hangman' }, async (sock, m, args, ctx) => {
    const word = pick(words)
    game(ctx.db, m.chat, 'hangman', { word, shown: '_'.repeat(word.length), lives: 6 })
    await m.reply(`Hangman: ${'_ '.repeat(word.length)}\nGuess with .guess <letter or word>`)
  }),

  cmd('luck', { category: 'games', desc: 'Luck number' }, async (sock, m) => {
    await m.reply(`Luck: ${Math.floor(Math.random() * 100) + 1}/100`)
  }),

  cmd('math', { category: 'games', desc: 'Math challenge' }, async (sock, m, args, ctx) => {
    const a = 1 + Math.floor(Math.random() * 20)
    const b = 1 + Math.floor(Math.random() * 20)
    game(ctx.db, m.chat, 'quiz', { q: `${a}+${b}`, a: String(a + b) })
    await m.reply(`Solve: ${a} + ${b}\nAnswer with .guess`)
  }),

  cmd('memory', { category: 'games', desc: 'Memory sequence' }, async (sock, m, args, ctx) => {
    const seq = Array.from({ length: 4 }, () => pick(['A', 'B', 'C', 'D'])).join('')
    game(ctx.db, m.chat, 'quiz', { a: seq.toLowerCase() })
    await m.reply(`Remember: ${seq}\nReply .guess ${seq}`)
  }),

  cmd('numbattle', { category: 'games', desc: 'Number battle' }, async (sock, m) => {
    const a = Math.floor(Math.random() * 100)
    const b = Math.floor(Math.random() * 100)
    await m.reply(`You: ${a}\nCPU: ${b}\n${a >= b ? 'You win' : 'CPU wins'}`)
  }),

  cmd('quiz', { category: 'games', desc: 'General quiz' }, async (sock, m, args, ctx) => {
    const q = pick([
      { q: 'HTTP status for OK?', a: '200' },
      { q: 'Planet known as red planet?', a: 'mars' }
    ])
    game(ctx.db, m.chat, 'quiz', q)
    await m.reply(`*Quiz*\n${q.q}\nAnswer with .guess`)
  }),

  cmd('riddle', { category: 'games', desc: 'Riddle' }, async (sock, m, args, ctx) => {
    const q = pick(riddles)
    game(ctx.db, m.chat, 'quiz', q)
    await m.reply(`*Riddle*\n${q.q}\nAnswer with .guess`)
  }),

  cmd('rps', { category: 'games', desc: 'Rock paper scissors' }, async (sock, m, args) => {
    const user = String(args[0] || '').toLowerCase()
    const opts = ['rock', 'paper', 'scissors']
    if (!opts.includes(user)) {
      await m.reply('Usage: .rps rock|paper|scissors')
      return
    }
    const cpu = pick(opts)
    const win =
      (user === 'rock' && cpu === 'scissors') ||
      (user === 'paper' && cpu === 'rock') ||
      (user === 'scissors' && cpu === 'paper')
    await m.reply(`You: ${user}\nCPU: ${cpu}\n${user === cpu ? 'Draw' : win ? 'You win' : 'You lose'}`)
  }),

  cmd('scramble', { category: 'games', desc: 'Unscramble the word' }, async (sock, m, args, ctx) => {
    const word = pick(words)
    game(ctx.db, m.chat, 'quiz', { word, a: word })
    await m.reply(`Unscramble: ${scramble(word)}\nAnswer with .guess`)
  }),

  cmd('survive', { category: 'games', desc: 'Survival roll' }, async (sock, m) => {
    await m.reply(pick(['You survived the night.', 'You found food.', 'You need shelter.', 'Game over.']))
  }),

  cmd('ttt', { category: 'games', desc: 'Tic tac toe vs CPU' }, async (sock, m, args, ctx) => {
    if (args[0] === 'new' || !getGame(ctx.db, m.chat, 'ttt')) {
      game(ctx.db, m.chat, 'ttt', { cells: Array(9).fill('') })
      await m.reply(`New game\n${tttBoard(Array(9).fill(''))}\nPlay: .ttt 1-9`)
      return
    }
    const g = getGame(ctx.db, m.chat, 'ttt')
    const pos = Number(args[0]) - 1
    if (pos < 0 || pos > 8 || g.cells[pos]) {
      await m.reply(`Invalid move.\n${tttBoard(g.cells)}`)
      return
    }
    g.cells[pos] = 'X'
    let result = winner(g.cells)
    if (!result) {
      const empty = g.cells.map((c, i) => (c ? null : i)).filter((i) => i !== null)
      g.cells[pick(empty)] = 'O'
      result = winner(g.cells)
    }
    ctx.db.save()
    if (result) {
      clearGame(ctx.db, m.chat, 'ttt')
      await m.reply(`${tttBoard(g.cells)}\n${result === 'draw' ? 'Draw' : result === 'X' ? 'You win' : 'CPU wins'}`)
      return
    }
    await m.reply(tttBoard(g.cells))
  }),

  cmd('whoami', { category: 'games', desc: 'Guess the character' }, async (sock, m, args, ctx) => {
    const name = pick(whoami)
    game(ctx.db, m.chat, 'quiz', { a: name.toLowerCase() })
    await m.reply(`I am thinking of a person.\nHint length: ${name.length}\nAnswer with .guess`)
  }),

  cmd('wordle', { category: 'games', desc: 'Mini wordle' }, async (sock, m, args, ctx) => {
    if (!getGame(ctx.db, m.chat, 'wordle') || args[0] === 'new') {
      const word = pick(words.filter((w) => w.length === 5).concat(['apple', 'crane', 'steam']))
      game(ctx.db, m.chat, 'wordle', { word, tries: 0 })
      await m.reply('Wordle started (5 letters). Guess with .wordle <word>')
      return
    }
    const g = getGame(ctx.db, m.chat, 'wordle')
    const guess = String(args[0] || '').toLowerCase()
    if (guess.length !== g.word.length) {
      await m.reply(`Need ${g.word.length} letters`)
      return
    }
    g.tries += 1
    if (guess === g.word) {
      clearGame(ctx.db, m.chat, 'wordle')
      await m.reply(`Correct in ${g.tries} tries.`)
      return
    }
    const pattern = guess
      .split('')
      .map((ch, i) => (g.word[i] === ch ? 'G' : g.word.includes(ch) ? 'Y' : 'B'))
      .join('')
    ctx.db.save()
    await m.reply(`${pattern} (G=green Y=yellow B=black)\nTries: ${g.tries}`)
  })
]

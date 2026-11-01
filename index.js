import chalk from 'chalk'
import config from './config.js'
import { loadCommands } from './handler.js'
import { startConnection } from './connection.js'

console.log(chalk.bold.magenta(`\n┏━━❐ ◈ ${config.botName} ◈`))
console.log(chalk.magenta(`┃ Version ${config.version}`))
console.log(chalk.magenta('┃ Pairing-code WhatsApp bot'))
console.log(chalk.magenta('┗━━━━━━━━━━━━━━\n'))

if (!config.owners.length) {
  console.log(chalk.yellow('Warning: OWNER_NUMBER is empty. Owner commands will be locked until you set it.'))
}

await loadCommands()
await startConnection()

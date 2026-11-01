import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataFile = join(__dirname, 'data.json')

const defaults = {
  users: {},
  groups: {},
  economy: {},
  warns: {},
  notes: {},
  sudo: [],
  blocked: [],
  cooldowns: {},
  games: {},
  welcome: {},
  goodbye: {},
  antilink: {},
  antispam: {},
  antibadword: {},
  antibot: {},
  antitag: {},
  antigroupmention: {},
  antisticker: {},
  antidelete: {},
  rules: {},
  vars: {},
  activity: {},
  afk: {},
  taught: {}
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

class JsonDatabase {
  constructor() {
    mkdirSync(__dirname, { recursive: true })
    this.data = clone(defaults)
    this.load()
  }

  load() {
    if (!existsSync(dataFile)) {
      this.save()
      return
    }
    try {
      const parsed = JSON.parse(readFileSync(dataFile, 'utf8'))
      this.data = { ...clone(defaults), ...parsed }
    } catch {
      this.data = clone(defaults)
      this.save()
    }
  }

  save() {
    writeFileSync(dataFile, JSON.stringify(this.data, null, 2))
  }

  getUser(jid) {
    if (!this.data.users[jid]) {
      this.data.users[jid] = {
        jid,
        registered: Date.now(),
        xp: 0,
        level: 1,
        lastSeen: Date.now()
      }
    }
    this.data.users[jid].lastSeen = Date.now()
    return this.data.users[jid]
  }

  getEconomy(jid) {
    if (!this.data.economy[jid]) {
      this.data.economy[jid] = {
        wallet: 1000,
        bank: 0,
        lastDaily: 0,
        lastWork: 0,
        inventory: []
      }
    }
    return this.data.economy[jid]
  }

  getGroup(jid) {
    if (!this.data.groups[jid]) {
      this.data.groups[jid] = {
        jid,
        welcome: false,
        goodbye: false,
        welcomeText: 'Welcome @user to @group',
        goodbyeText: 'Goodbye @user',
        antilink: false,
        antispam: false,
        antibadword: false,
        antibot: false,
        antitag: false,
        antigroupmention: false,
        antisticker: false,
        antidelete: false,
        badwords: ['fuck', 'nigga', 'nigger', 'bitch'],
        warnLimit: 3
      }
    }
    return this.data.groups[jid]
  }

  getWarns(group, user) {
    const key = `${group}:${user}`
    if (!this.data.warns[key]) this.data.warns[key] = 0
    return this.data.warns[key]
  }

  addWarn(group, user) {
    const key = `${group}:${user}`
    this.data.warns[key] = this.getWarns(group, user) + 1
    this.save()
    return this.data.warns[key]
  }

  resetWarn(group, user) {
    const key = `${group}:${user}`
    this.data.warns[key] = 0
    this.save()
  }

  isSudo(jid) {
    return this.data.sudo.includes(jid)
  }

  addSudo(jid) {
    if (!this.data.sudo.includes(jid)) this.data.sudo.push(jid)
    this.save()
  }

  delSudo(jid) {
    this.data.sudo = this.data.sudo.filter((item) => item !== jid)
    this.save()
  }

  isBlocked(jid) {
    return this.data.blocked.includes(jid)
  }

  block(jid) {
    if (!this.data.blocked.includes(jid)) this.data.blocked.push(jid)
    this.save()
  }

  unblock(jid) {
    this.data.blocked = this.data.blocked.filter((item) => item !== jid)
    this.save()
  }

  bumpActivity(group, user) {
    if (!this.data.activity[group]) this.data.activity[group] = {}
    if (!this.data.activity[group][user]) {
      this.data.activity[group][user] = { count: 0, last: 0 }
    }
    this.data.activity[group][user].count += 1
    this.data.activity[group][user].last = Date.now()
  }

  getVar(key) {
    return this.data.vars[key]
  }

  setVar(key, value) {
    this.data.vars[key] = value
    this.save()
  }
}

export const db = new JsonDatabase()
export default db

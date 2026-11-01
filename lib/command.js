export function cmd(name, options, exec) {
  return {
    name: String(name).toLowerCase(),
    aliases: (options.aliases || []).map((item) => String(item).toLowerCase()),
    category: options.category || 'general',
    desc: options.desc || '',
    owner: Boolean(options.owner),
    group: Boolean(options.group),
    admin: Boolean(options.admin),
    botAdmin: Boolean(options.botAdmin),
    cooldown: options.cooldown || 0,
    exec
  }
}

export function many(names, options, exec) {
  return names.map((name) => cmd(name, options, exec))
}

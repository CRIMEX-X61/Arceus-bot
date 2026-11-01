# ARCEUS XD

ARCEUS XD is a modular WhatsApp bot built with **@whiskeysockets/baileys 7.0.0-rc14** (ESM, Node.js 20+). It authenticates with a **pairing code**, stores data in JSON, and ships with working core, group, owner, economy, games, and media commands.

This project is **not affiliated with WhatsApp**. Use it on accounts you own. Do not spam, scrape, or mass-message.

## Features

- Pairing-code login (no QR required)
- Session restore after restart (`auth_info/`)
- Auto-reconnect, logout detection, connection-replaced handling
- Prefix commands (default `.`)
- Public / private mode
- Group admin tools with permission checks
- Owner tools with JID validation
- JSON database (users, economy, warns, notes, group guards)
- Optional LLM via `USER_LLM_API_KEY` (you provide the key)
- FFmpeg media conversion when installed
- Download / Ephoto / image APIs are **opt-in** — they return a config message instead of fake success

## Requirements

- Node.js 20 or later
- npm 10+
- A WhatsApp account you control
- FFmpeg (optional, for stickers and audio filters)
- Git (for GitHub upload)

## Project structure

```text
index.js            entrypoint
config.js           env + persisted settings
connection.js       Baileys v7 socket + pairing
handler.js          command loader, perms, cooldowns
database/           JSON store
lib/                helpers, serializer, providers
commands/           command packs
auth_info/          session files (never commit)
```

## Installation

```bash
git clone https://github.com/your-username/ARCEUS-XD.git
cd ARCEUS-XD
npm install
cp .env.example .env
```

Edit `.env`:

```bash
PHONE_NUMBER=15551234567
OWNER_NUMBER=15551234567
OWNER_NAME=ARCEUS
PREFIX=.
PUBLIC_MODE=true
```

`PHONE_NUMBER` and `OWNER_NUMBER` must include the country code and digits only.

## Pairing-code login

Pair website: https://arceus-xd-pair.onrender.com

1. Open the pair website or start the bot with `npm start`
2. Enter your WhatsApp number with country code
3. Copy the 8-digit pairing code
4. On your phone: **WhatsApp → Settings → Linked Devices → Link a Device → Link with phone number instead**
5. Enter the code
6. Terminal shows `Connected as ...`
7. Next starts reuse `auth_info/` — no new code unless you log out

In chat, send `.pair` to get the website link.

Never share pairing codes, `auth_info/`, or `creds.json`.

## Start

```bash
npm start
```

Development (auto-restart on file change):

```bash
npm run dev
```

Send `.menu` to the bot number from the owner account.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PHONE_NUMBER` | Number used to request a pairing code |
| `OWNER_NUMBER` | Owner JIDs, comma-separated |
| `PREFIX` | Command prefix |
| `PUBLIC_MODE` | `true` = everyone, `false` = owner/sudo only |
| `USER_LLM_API_KEY` | Your OpenAI-compatible LLM key |
| `USER_LLM_BASE_URL` | LLM base URL |
| `USER_LLM_MODEL` | Model name |
| `OPENWEATHER_API_KEY` | `.weather` |
| `REMOVEBG_API_KEY` | `.removebg` |
| `DOWNLOAD_API_URL` | Optional downloader that returns `{ url, title }` |
| `EPHOTO_API_URL` | Optional logo API that returns `{ url }` |
| `GEMINI_API_KEY` | `.gemini` |
| `MAX_DOWNLOAD_MB` | Download size cap |
| `BROADCAST_LIMIT` | Max groups per `.broadcast` |
| `KICK_LIMIT` | Max users per bulk kick |

The bot never reads platform LLM keys from the host environment. Provide your own keys.

## Railway

1. Push this repo to GitHub
2. New Railway project → Deploy from GitHub
3. Set the env vars above
4. Start command: `npm start`
5. Open the deployment logs, copy the pairing code, link the device
6. Add a volume for `/app/auth_info` if you want the session to survive rebuilds

## Render

1. New **Background Worker**
2. Build: `npm install`
3. Start: `npm start`
4. Node 20
5. Add env vars
6. Pair from the Render logs
7. Use a persistent disk for `auth_info` on paid plans

`render.yaml` is included.

## VPS

```bash
sudo apt update
sudo apt install -y git curl ffmpeg
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
git clone https://github.com/your-username/ARCEUS-XD.git
cd ARCEUS-XD
npm install
cp .env.example .env
nano .env
npm start
```

Process manager example (pm2):

```bash
npm install -g pm2
pm2 start index.js --name arceus-xd
pm2 save
```

## Pterodactyl

1. Create a Node.js 20 egg/server
2. Upload the project zip or clone with Git
3. Set startup to `npm install && npm start`
4. Put env vars in the panel
5. Open the console, copy the pairing code, link WhatsApp
6. Do not mark `auth_info` as a one-shot directory

## GitHub upload

```bash
cd ARCEUS-XD
git init
git add .
git commit -m "feat: ARCEUS XD WhatsApp bot"
git branch -M main
git remote add origin https://github.com/your-username/ARCEUS-XD.git
git push -u origin main
```

Do **not** add `.env` or `auth_info/*` (except `.gitkeep`). Confirm with `git status` before the first push.

## Core commands

`.ping` `.alive` `.menu` `.help` `.owner` `.uptime` `.pair` `.sticker` `.translate` `.weather`

Group admins: `.kick` `.promote` `.tagall` `.mute` `.link` `.antilink` `.warn`

Owner: `.addsudo` `.mode` `.setprefix` `.broadcast` `.join` `.restart`

API-backed menus (AI image, TikTok/YouTube download, Ephoto360, Remini) stay disabled until you set the matching env var. The bot will say so instead of faking a file.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Pairing fails | Digits only, country code included, wait for the QR/pairing trigger |
| Logged out | Delete `auth_info`, restart, pair again |
| Connection replaced | Only one live process per session |
| Unknown command | `.menu` or `.cmdsearch name` |
| Sticker/audio fails | Install FFmpeg |
| Owner commands locked | Set `OWNER_NUMBER` |
| LLM/download errors | Set the documented env vars; no unofficial endpoints are hardcoded |

## Security

- Owner checks use normalized JIDs plus sudo list
- No `eval` / shell `exec` command execution
- Broadcast and mass-kick are capped
- Dangerous group wipes need `.kickall confirm` from the owner
- Session files stay local
- Rate limit / cooldown on commands
- Input for math/ffmpeg is constrained (no shell strings)

## License

MIT

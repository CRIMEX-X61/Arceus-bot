# Upload ARCEUS XD to GitHub

## 1. Create an empty GitHub repository

On GitHub: New repository → name it `ARCEUS-XD` → do not add a README, license, or .gitignore.

## 2. Commit locally

```bash
cd ARCEUS-XD
git init
git add .
git status
```

Confirm `.env` and `auth_info/*.json` are not staged.

```bash
git commit -m "feat: ARCEUS XD WhatsApp bot"
git branch -M main
git remote add origin https://github.com/YOUR_USER/ARCEUS-XD.git
git push -u origin main
```

## 3. After clone on another machine

```bash
git clone https://github.com/YOUR_USER/ARCEUS-XD.git
cd ARCEUS-XD
cp .env.example .env
npm install
npm start
```

Pair WhatsApp using the code printed in the terminal.

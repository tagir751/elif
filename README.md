# Elif — school management (Next.js + Prisma + SQLite)

Private prod runs on Beget (`elif.tagir75.ru`). This repo is the dev baseline.

## Quick start for agents

```bash
npm install
cp .env.example .env   # fill dev values
npx prisma generate && npx prisma db push
npm run seed           # demo data (admin@elif.ru / admin123, etc.)
npm run dev -- --webpack
```

See `AGENTS.md` — full agent guide (stack, RBAC, commands, gotchas).
See `BEGET_DEPLOY_INSTRUCTION.md` — prod deploy (passwords never in git).

## Gates before release

```bash
npm run build
node scripts/test.mjs
```

`main` = prod baseline. Features in `feat/<name>` branches via PR.

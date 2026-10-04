# Элиф — Agent Guide

## Stack
- **Next.js 16** (App Router, webpack), React 19, TypeScript 5, Tailwind CSS 4
- **Prisma 6** + SQLite (datasource `env("DATABASE_URL")`, fallback `file:./dev.db`), `serverExternalPackages: ['prisma']`
- **Auth**: JWT via `jose`, bcryptjs, two cookies — `token` (15min) + `refreshToken` (7d), fallback to `Bearer` header
- **Path alias**: `@/*` → `./src/*`

## Commands
| Command | Action |
|---|---|
| `npm run dev` | Dev server (run with `--webpack` flag on CI/tests) |
| `npm run build` | Prod build (on Windows: set env vars first — see below) |
| `npm run start` | Run standalone (`node .next/standalone/server.js`) |
| `npm run lint` | Next.js lint |
| `npm run seed` | Seed DB via `tsx scripts/seed.ts` (2 months demo data) |
| `npm run deploy` | Create Beget deploy bundle in `./deploy/` |
| `npm run test:e2e` | Playwright E2E (auto-seeds + auto-starts dev server) |
| `npm run test:e2e:ui` | Playwright UI mode |
| `npm run test` | API integration tests via `node scripts/test.mjs` |

**Windows build**: `$env:TOKIO_WORKER_THREADS=1; $env:TASK_CONCURRENCY=1; $env:NODE_OPTIONS='--max-old-space-size=1024'; npx next build --webpack`

**Integration tests order**: `npm run seed` → `npx next build --webpack` → `npx next start -p 3000` → `node scripts/test.mjs`

**E2E prerequisites**: Chrome must be installed; playwright config auto-seeds via `webServer.command` and reuses existing server on port 3000.

## Seed accounts (created by `npm run seed`)
| Login | Password | Roles |
|---|---|---|
| admin@elif.ru | admin123 | admin |
| manager@elif.ru | manager123 | manager |
| teacher@elif.ru | teacher123 | teacher |
| anna@elif.ru | anna123 | manager + teacher |

## RBAC
Three roles enforced per-API-route via `requireRole(user, ['admin','manager'])`:
- **admin** → `/admin` (user mgmt, audit log, backup, subjects)
- **manager** → `/manager/*` (CRUD on families, students, groups, payments, tasks, alerts)
- **teacher** → `/teacher/*` (read-only students/lessons, CRUD observations and attendance)

Teachers auto-filtered to own data (by `teacher.userId`). Multi-role users switch via `PUT /api/auth/role`.

## Architecture
- **API pattern** (`src/app/api/*`): `getAuthUserFromCookie(request)` → `requireRole()` → Prisma → optional audit log. Validation via Zod schemas in `src/lib/validation.ts`.
- **Middleware** (`src/middleware.ts`): cookie-based redirect, rate-limits `/api/*` (10 req/min login, 100 general), brute-force on login (5 attempts / 15min block). Public routes: `/login`, `/api/auth/login`, `/`, static assets.
- **Auth flow**: login sets two httpOnly cookies (`token` 15min, `refreshToken` 7d) → middleware checks both → API routes re-verify via cookie or Bearer header.
- **Soft deletes**: `deletedAt` on User, Teacher, Student, Family, Group, Room.
- **UI**: mobile-first (`max-w-[480px]` mx-auto), `reactStrictMode: false`, custom Tailwind utilities in `globals.css`.
- **Rate limiting / brute force**: in-memory (no Redis), in `src/lib/rate-limit.ts` and `src/lib/brute-force.ts`.

## Key lib files
| File | Purpose |
|---|---|
| `src/lib/prisma.ts` | Prisma singleton |
| `src/lib/auth.ts` | JWT sign/verify (jose), bcrypt hash/compare |
| `src/lib/api-middleware.ts` | `getAuthUserFromCookie()`, `requireRole()`, error responses |
| `src/lib/rbac.ts` | Redirect helpers by role |
| `src/lib/validation.ts` | Zod schemas + `validateOrError()` helper |
| `src/lib/encrypt.ts` | AES-256-GCM encryption (requires `ENCRYPTION_KEY` env) |
| `src/lib/rate-limit.ts` | In-memory sliding window rate limiter |
| `src/lib/brute-force.ts` | In-memory login brute force protection |

## Gotchas
- **Cyrillic in template literals**: FORBIDDEN — causes UTF-8 crashes (`console.log(\`Ошибка: ${err}\`)`). Use concatenation: `'Ошибка: ' + err`
- **Auth tokens**: two cookies — `token` (15min, primary) and `refreshToken` (7d, fallback). Both use same JWT secret.
- **JWT secret**: defaults to `elif-dev-secret-change-in-production` if `JWT_SECRET` unset; also reads `COOKIE_SECRET` as fallback.
- **DB path**: dev = `file:./prisma/dev.db`, production = absolute path with `?_journal_mode=WAL&connection_limit=1`.
- **Roles field**: stored as JSON string in SQLite (`roles String`), always parse with `JSON.parse()`.
- **Prisma schema changes**: `npx prisma generate` then `npx prisma db push` (no migration files for SQLite).
- **`middleware.ts` is deprecated** in Next 16 — should migrate to `proxy` convention eventually.
- **Deploy (Beget)**: details in `BEGET_DEPLOY_TOOL.md`. Key: `.htaccess` = exactly 4 lines (no `SetEnv`), PHP must be disabled via support.

## Deploy bundle (`npm run deploy`)
Created by `scripts/prepare-standalone.mjs` — produces `./deploy/` with: `start.js` (wraps server.js), `.htaccess` (4 lines), `.next/` + `_next/` (Nginx static), `node_modules/`, `package.json`, `public/`, `prisma/`, `data/`, `tmp/`, `uploads/`, `logs/` dirs.

# Инструкция по деплою Элиф на Beget (для AI-агента)

## О проекте
- Next.js 16 (App Router, webpack), Prisma 6 + SQLite, JWT auth
- Два продакшен-юзера: Тагир (admin) и Диляра (manager+teacher)
- Домен: `elif.tagir75.ru`, хостинг: Beget виртуальный (shared)

## Подготовка локально (уже готово)

На Windows-машине пользователя уже есть всё:
- `.env` с ключами (`JWT_SECRET`, `ENCRYPTION_KEY`)
- `npm run build` проходит
- `npm run deploy` создаёт `./deploy/` бандл

**Если бандл не свежий — сделать:**
```powershell
$env:TOKIO_WORKER_THREADS=1; $env:TASK_CONCURRENCY=1; $env:NODE_OPTIONS='--max-old-space-size=1024'
npx next build --webpack
node scripts/prepare-standalone.mjs
```

## Шаг 1: Отключить PHP на домене

Пользователь пишет в поддержку Beget (чат в панели):
> «Переключите, пожалуйста, поддомен elif.tagir75.ru в режим без PHP, нужно для Node.js Passenger».

Без этого .htaccess с Passenger игнорируется, будет connection refused.

## Шаг 2: Загрузить бандл на сервер

Через Sprut.io (файловый менеджер Beget):
1. Зайти в `~/elif.tagir75.ru/`
2. Создать папку `public_html/` (реальная папка, НЕ symlink)
3. Загрузить всё содержимое `./deploy/` (локально) в `~/elif.tagir75.ru/public_html/`
   - Можно по одному файлу, можно упаковать в zip и распаковать на сервере

## Шаг 3: Настроить на сервере

Подключиться по SSH:
```bash
ssh tagir7ow@tagir7ow.beget.tech
```

Зайти в Docker:
```bash
ssh localhost -p 222
# ввести пароль (тот же, что от SSH)
```

### 3.1 Создать папку для БД (вне public_html, чтобы не удалялась при обновлении)
```bash
mkdir -p ~/elif.tagir75.ru/private
```

### 3.2 Перейти в папку проекта
```bash
cd ~/elif.tagir75.ru/public_html
```

### 3.3 Узнать путь к Node.js
```bash
which node
# → /home/t/tagir7ow/.local/bin/node
```
Запомнить этот путь — он нужен для .htaccess (но там уже правильный путь в prepare-standalone.mjs).

### 3.4 Создать .env на уровень выше public_html
```bash
cat > ~/elif.tagir75.ru/.env << 'ENDFILE'
DATABASE_URL="file:/home/t/tagir7ow/elif.tagir75.ru/private/elif.db?_journal_mode=WAL&connection_limit=1"
JWT_SECRET=<нужно сгенерировать>
ENCRYPTION_KEY=<нужно сгенерировать>
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
ENDFILE
```

Сгенерировать ключи (прямо в Docker):
```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(16).toString('hex'))"
```

**ВАЖНО**: после перезапуска Passenger ключи должны остаться теми же, иначе все JWT-токены станут невалидными.

### 3.5 Сгенерировать Prisma клиент под Linux
```bash
npx prisma generate
```

### 3.6 Создать таблицы БД
```bash
npx prisma db push
# Если спросит про потерю данных — нажать y
```

### 3.7 Создать служебные папки
```bash
mkdir -p data tmp uploads logs
```

### 3.8 Перезапустить Passenger
```bash
touch tmp/restart.txt
```

### 3.9 Выйти из Docker
```bash
exit
```

## Шаг 4: Создать пользователей

После того как сайт заработает (открывается в браузере), выполнить seed-запрос:
```bash
curl -X POST https://elif.tagir75.ru/api/admin/seed \
  -H "Content-Type: application/json" \
  -d '{"tagirPassword":"***","dilyaraPassword":"***"}'
```

Это создаст:
- Тагир (admin) — пароль хранится только на сервере, не в git
- Диляра (manager+teacher) — пароль хранится только на сервере, не в git

## Шаг 5: Проверить работу

1. Открыть `https://elif.tagir75.ru/` — должен показать страницу логина
2. Войти как `Тагир` — должен попасть на `/admin`
3. Войти как `Диляра` — должен попасть на `/manager`
4. Проверить таб «Задачи» у учителя

## Диагностика проблем

| Симптом | Причина | Решение |
|---------|---------|---------|
| Connection refused | PHP не отключён | Написать в поддержку |
| 502 Bad Gateway | Неверный путь Node.js | Проверить `which node` в Docker, поправить .htaccess |
| 500 Internal Server Error | Лишние строки в .htaccess | Должно быть ровно 4 строки |
| 503 Service Unavailable | Приложение не стартует | Проверить `logs/app.log` |
| Prisma engine not found | Движок под Windows | `npx prisma generate` в Docker |
| SQLITE_BUSY | Конкурентные запросы | Уже есть `connection_limit=1` в DATABASE_URL |

### Проверить логи приложения
```bash
cat ~/elif.tagir75.ru/public_html/logs/app.log
```

### Перезапустить вручную (если Passenger не стартует)
```bash
cd ~/elif.tagir75.ru/public_html
node start.js
# Запуск напрямую — если ошибок нет, проблема в Passenger
```

## Обновление (новый деплой)

1. Локально: `npm run build`, `npm run deploy`
2. На сервере: заменить файлы в `~/elif.tagir75.ru/public_html/` (НО НЕ трогать `private/elif.db`)
3. `touch ~/elif.tagir75.ru/public_html/tmp/restart.txt`
4. Если изменилась схема Prisma: `npx prisma generate && npx prisma db push`

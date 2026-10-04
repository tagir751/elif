import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

const root = resolve(import.meta.dirname, '..')
const standalone = join(root, '.next', 'standalone')

if (!existsSync(standalone)) {
  console.error('.next/standalone not found. Run `npm run build` first.')
  process.exit(1)
}

const dest = join(root, 'deploy')
if (existsSync(dest)) rmSync(dest, { recursive: true })
mkdirSync(dest)

// 1. Copy standalone output (server code)
cpSync(join(standalone, 'server.js'), join(dest, 'server.js'))
cpSync(join(root, 'node_modules'), join(dest, 'node_modules'), { recursive: true })

// 2. Copy standalone .next
cpSync(join(standalone, '.next'), join(dest, '.next'), { recursive: true })
// 2b. Copy static as _next/ (for Nginx on Beget)
const nextBuild = join(root, '.next')
if (existsSync(nextBuild)) {
  cpSync(nextBuild, join(dest, '_next'), { recursive: true })
}

// 3. Copy package.json
cpSync(join(root, 'package.json'), join(dest, 'package.json'))

// 4. Copy public folder
if (existsSync(join(root, 'public'))) {
  cpSync(join(root, 'public'), join(dest, 'public'), { recursive: true })
}

// 5. Copy Prisma schema + client
cpSync(join(root, 'prisma'), join(dest, 'prisma'), { recursive: true })

// 6. Create .htaccess
const htaccess = [
  'PassengerNodejs /home/t/tagir7ow/.local/bin/node',
  'PassengerAppRoot /home/t/tagir7ow/elif.tagir75.ru/public_html',
  'PassengerAppType node',
  'PassengerStartupFile start.js',
].join('\n') + '\n'
writeFileSync(join(dest, '.htaccess'), htaccess, 'utf8')

// 7. Create start.js wrapper
const startJs = `const path = require('path')
const fs = require('fs')

// Load .env
const findEnv = (dir) => {
  const p = path.join(dir, '.env')
  return fs.existsSync(p) ? p : null
}
const envPath = findEnv(__dirname) || findEnv(path.resolve(__dirname, '..'))
if (envPath) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const i = trimmed.indexOf('=')
      if (i > 0) {
        let val = trimmed.slice(i + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1)
        }
        process.env[trimmed.slice(0, i).trim()] = val
      }
    }
  })
}

// Set defaults (but don't override Passenger's PORT)
if (!process.env.HOSTNAME || process.env.HOSTNAME === 'center.beget.ru') {
  process.env.HOSTNAME = '127.0.0.1'
}
if (!process.env.PORT) process.env.PORT = '3000'
process.env.NODE_ENV = process.env.NODE_ENV || 'production'

if (!process.env.JWT_SECRET && !process.env.COOKIE_SECRET) {
  console.error('FATAL: JWT_SECRET or COOKIE_SECRET not set')
  process.exit(1)
}

const logFile = path.join(__dirname, 'logs', 'app.log')
const log = (m) => {
  try {
    const dir = path.dirname(logFile)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.appendFileSync(logFile, '[' + new Date().toISOString() + '] ' + m + '\\n')
  } catch(e) {}
}
log('=== APP START ===')
log('ENV: PORT=' + process.env.PORT + ', HOSTNAME=' + process.env.HOSTNAME)

const serverPath = path.join(__dirname, 'server.js')
if (!fs.existsSync(serverPath)) {
  console.error('FATAL: server.js not found at', serverPath)
  process.exit(1)
}

// Run server.js in the same process so Passenger sees a single process
require(serverPath)
`
writeFileSync(join(dest, 'start.js'), startJs, 'utf8')

// 8. Ensure directories
mkdirSync(join(dest, 'data'), { recursive: true })
mkdirSync(join(dest, 'tmp'), { recursive: true })
mkdirSync(join(dest, 'uploads'), { recursive: true })
mkdirSync(join(dest, 'logs'), { recursive: true })

console.log('✅ Deploy bundle created in ./deploy/')
console.log('📦 Upload contents of ./deploy/ to ~/elif.tagir75.ru/public_html/')

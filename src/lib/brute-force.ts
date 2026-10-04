const MAX_ATTEMPTS = 5
const BLOCK_WINDOW_MS = 15 * 60 * 1000

interface BruteForceEntry {
  attempts: number
  blockUntil: number
}

const store = new Map<string, BruteForceEntry>()

export function isBlocked(ip: string): boolean {
  const entry = store.get(ip)
  if (!entry) return false
  if (Date.now() > entry.blockUntil) {
    store.delete(ip)
    return false
  }
  return entry.attempts >= MAX_ATTEMPTS
}

export function recordFailedAttempt(ip: string): { attempts: number; blocked: boolean } {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now > entry.blockUntil) {
    const newEntry: BruteForceEntry = { attempts: 1, blockUntil: now + BLOCK_WINDOW_MS }
    store.set(ip, newEntry)
    return { attempts: 1, blocked: false }
  }

  entry.attempts++
  const blocked = entry.attempts >= MAX_ATTEMPTS
  return { attempts: entry.attempts, blocked }
}

export function resetAttempts(ip: string): void {
  store.delete(ip)
}

// Periodic cleanup
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (now > entry.blockUntil) {
      store.delete(key)
    }
  }
}, 60000)

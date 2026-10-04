import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromCookie, forbidden, requireRole } from '@/lib/api-middleware'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user || !requireRole(user, ['admin'])) return forbidden()

  const dbPath = join(process.cwd(), 'prisma', 'dev.db')

  try {
    const dbFile = readFileSync(dbPath)

    return new NextResponse(dbFile, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="elif-backup-${new Date().toISOString().split('T')[0]}.db"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Database file not found' }, { status: 404 })
  }
}

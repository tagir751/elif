import { NextRequest, NextResponse } from 'next/server'
import { getAuthUserFromCookie, forbidden, requireRole } from '@/lib/api-middleware'
import { copyFileSync, readFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user || !requireRole(user, ['admin'])) return forbidden()

  const dbPath = join(process.cwd(), 'prisma', 'dev.db')
  const backupPath = join(process.cwd(), 'prisma', `backup-${Date.now()}.db`)

  try {
    copyFileSync(dbPath, backupPath)
    const dbFile = readFileSync(backupPath)

    return new NextResponse(dbFile, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="elif-backup-${new Date().toISOString().split('T')[0]}.db"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: 'Backup failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, forbidden, requireRole } from '@/lib/api-middleware'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user || !requireRole(user, ['admin'])) return forbidden()

  const { searchParams } = new URL(request.url)
  const entity = searchParams.get('entity')
  const limit = parseInt(searchParams.get('limit') || '100')

  const where: Record<string, unknown> = {}
  if (entity) where.entity = entity

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(limit, 500),
  })

  return NextResponse.json(logs)
}

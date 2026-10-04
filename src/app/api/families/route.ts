import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { familySchema, validateOrError } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''

  const families = await prisma.family.findMany({
    where: {
      deletedAt: null,
      ...(search
        ? { OR: [{ name: { contains: search } }, { phone: { contains: search } }] }
        : {}),
    },
    include: {
      _count: { select: { students: true, payments: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(families)
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(familySchema, body)
  if (error) return error

  const family = await prisma.family.create({
    data: {
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      telegram: body.telegram || null,
      monthlyFee: body.monthlyFee || 0,
      paidUntil: body.paidUntil ? new Date(body.paidUntil) : null,
      comment: body.comment || null,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: 'create',
      entity: 'family',
      entityId: family.id,
      payloadJson: JSON.stringify(body),
    },
  })

  return NextResponse.json(family, { status: 201 })
}

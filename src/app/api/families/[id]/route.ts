import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole, notFound } from '@/lib/api-middleware'
import { familyUpdateSchema, validateOrError } from '@/lib/validation'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { id } = await params
  const family = await prisma.family.findUnique({
    where: { id },
    include: {
      students: {
        where: { deletedAt: null },
        include: {
          enrollments: {
            where: { endDate: null },
            include: { group: { select: { id: true, name: true } } },
          },
        },
      },
      payments: { orderBy: { date: 'desc' } },
    },
  })

  if (!family || family.deletedAt) return notFound()

  return NextResponse.json(family)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { id } = await params
  const existing = await prisma.family.findUnique({ where: { id } })
  if (!existing || existing.deletedAt) return notFound()

  const body = await request.json()

  const { error } = validateOrError(familyUpdateSchema, body)
  if (error) return error

  const family = await prisma.family.update({
    where: { id },
    data: {
      name: body.name,
      phone: body.phone,
      email: body.email ?? undefined,
      telegram: body.telegram ?? undefined,
      monthlyFee: body.monthlyFee ?? undefined,
      paidUntil: body.paidUntil ? new Date(body.paidUntil) : undefined,
      comment: body.comment ?? undefined,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: 'update',
      entity: 'family',
      entityId: id,
      payloadJson: JSON.stringify(body),
    },
  })

  return NextResponse.json(family)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { id } = await params
  await prisma.family.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}

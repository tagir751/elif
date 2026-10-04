import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole, notFound } from '@/lib/api-middleware'
import { studentUpdateSchema, validateOrError } from '@/lib/validation'


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()

  const { id } = await params
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      family: true,
      enrollments: {
        where: { endDate: null },
        include: { group: { select: { id: true, name: true, subject: true } } },
      },
      attendances: {
        include: { lesson: { select: { dateTime: true, status: true } } },
        where: { lesson: { dateTime: { gte: new Date(Date.now() - 60 * 86400000) } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      observations: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!student || student.deletedAt) return notFound()

  return NextResponse.json(student)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { id } = await params
  const existing = await prisma.student.findUnique({ where: { id } })
  if (!existing || existing.deletedAt) return notFound()

  const body = await request.json()

  const { error } = validateOrError(studentUpdateSchema, body)
  if (error) return error

  const student = await prisma.student.update({
    where: { id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
      familyId: body.familyId,
      phone: body.phone ?? undefined,
      status: body.status ?? undefined,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: 'update',
      entity: 'student',
      entityId: id,
      payloadJson: JSON.stringify(body),
    },
  })

  return NextResponse.json(student)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { id } = await params
  const existing = await prisma.student.findUnique({ where: { id } })
  if (!existing || existing.deletedAt) return notFound()

  const { searchParams } = new URL(request.url)
  const permanent = searchParams.get('permanent') === 'true'

  if (permanent) {
    await prisma.student.delete({ where: { id } })
  } else {
    await prisma.student.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'deleted' },
    })
  }

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: permanent ? 'hard-delete' : 'delete',
      entity: 'student',
      entityId: id,
    },
  })

  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole, notFound } from '@/lib/api-middleware'
import { groupUpdateSchema, validateOrError } from '@/lib/validation'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()

  const { id } = await params
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      teacher: true,
      room: true,
      scheduleSlots: { include: { room: { select: { id: true, name: true } } } },
      enrollments: {
        where: { endDate: null },
        include: { student: { select: { id: true, firstName: true, lastName: true, birthDate: true } } },
      },
      lessons: {
        where: { status: { in: ['planned', 'conflict'] } },
        orderBy: { dateTime: 'asc' },
      },
    },
  })

  if (!group || group.deletedAt) return notFound()

  const recentLessons = await prisma.lesson.findMany({
    where: {
      groupId: id,
      status: { in: ['completed', 'cancelled'] },
    },
    orderBy: { dateTime: 'desc' },
    take: 10,
  })

  return NextResponse.json({ ...group, recentLessons })
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { id } = await params
  const body = await request.json()

  const { error } = validateOrError(groupUpdateSchema, body)
  if (error) return error

  const group = await prisma.group.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      subject: body.subject ?? undefined,
      teacherId: body.teacherId ?? undefined,
      roomId: body.roomId ?? undefined,
      capacity: body.capacity ?? undefined,
      status: body.status ?? undefined,
    },
  })

  return NextResponse.json(group)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { id } = await params
  await prisma.group.update({ where: { id }, data: { deletedAt: new Date(), status: 'closed' } })

  return NextResponse.json({ ok: true })
}

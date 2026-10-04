import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { groupSchema, validateOrError } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()

  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get('teacherId')

  const where: Record<string, unknown> = { deletedAt: null }

  // Teacher: only their groups
  if (user.roles.includes('teacher') && !user.roles.includes('manager') && !user.roles.includes('admin')) {
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } })
    if (teacher) where.teacherId = teacher.id
  }

  if (teacherId) where.teacherId = teacherId

  const groups = await prisma.group.findMany({
    where,
    include: {
      teacher: { select: { id: true, fullName: true } },
      room: { select: { id: true, name: true } },
      scheduleSlots: true,
      _count: { select: { enrollments: { where: { endDate: null } } } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(groups)
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(groupSchema, body)
  if (error) return error

  const group = await prisma.group.create({
    data: {
      name: body.name,
      subject: body.subject,
      teacherId: body.teacherId,
      roomId: body.roomId,
      capacity: body.capacity || 8,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: 'create',
      entity: 'group',
      entityId: group.id,
      payloadJson: JSON.stringify(body),
    },
  })

  return NextResponse.json(group, { status: 201 })
}

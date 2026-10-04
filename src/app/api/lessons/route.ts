import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { lessonSchema, validateOrError } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager', 'teacher'])) return forbidden()

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const groupId = searchParams.get('groupId')
  const teacherId = searchParams.get('teacherId')
  const hasNote = searchParams.get('hasNote')
  const hasHypothesis = searchParams.get('hasHypothesis')
  const hasPersonalNote = searchParams.get('hasPersonalNote')

  const where: Record<string, unknown> = {}

  if (date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    where.dateTime = { gte: start, lt: end }
  }

  if (groupId) where.groupId = groupId
  if (teacherId) where.teacherId = teacherId
  if (hasNote === '1') where.lessonNote = { not: null }
  if (hasHypothesis === '1') where.hypothesis = { not: null }
  if (hasPersonalNote === '1') where.personalNote = { not: null }

  // Pure teacher (without manager/admin role) — force filter to own lessons
  if (user.roles.includes('teacher') && !user.roles.includes('manager') && !user.roles.includes('admin')) {
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } })
    if (teacher) where.teacherId = teacher.id
  }

  const lessons = await prisma.lesson.findMany({
    where,
    include: {
      group: { select: { id: true, name: true } },
      teacher: { select: { id: true, fullName: true } },
      room: { select: { id: true, name: true } },
      attendances: {
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
      },
      _count: { select: { attendances: true } },
    },
    orderBy: { dateTime: 'asc' },
  })

  return NextResponse.json(lessons)
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(lessonSchema, body)
  if (error) return error

  const lesson = await prisma.lesson.create({
    data: {
      groupId: body.groupId,
      teacherId: body.teacherId,
      roomId: body.roomId,
      dateTime: new Date(body.dateTime),
    },
  })

  return NextResponse.json(lesson, { status: 201 })
}

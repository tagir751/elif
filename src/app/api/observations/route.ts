import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { observationSchema, validateOrError } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()

  const { searchParams } = new URL(request.url)
  const studentId = searchParams.get('studentId')
  const groupId = searchParams.get('groupId')
  const teacherId = searchParams.get('teacherId')
  const date = searchParams.get('date')

  const where: Record<string, unknown> = {}

  if (studentId) where.studentId = studentId
  if (groupId) where.lesson = { groupId }
  if (teacherId) where.teacherId = teacherId

  if (date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)
    where.createdAt = { gte: start, lt: end }
  }

  // Teacher: only their observations
  if (user.roles.includes('teacher') && !user.roles.includes('manager') && !user.roles.includes('admin')) {
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } })
    if (teacher) where.teacherId = teacher.id
  }

  const observations = await prisma.observation.findMany({
    where,
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      teacher: { select: { id: true, fullName: true } },
      lesson: { select: { id: true, dateTime: true, group: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(observations)
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager', 'teacher'])) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(observationSchema, body)
  if (error) return error

  // Determine teacherId
  let teacherId = body.teacherId
  if (!teacherId && user.roles.includes('teacher')) {
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } })
    if (teacher) teacherId = teacher.id
  }

  if (!teacherId) return forbidden()

  const observation = await prisma.observation.create({
    data: {
      studentId: body.studentId,
      lessonId: body.lessonId,
      teacherId,
      text: body.text,
      status: body.status || 'draft',
    },
  })

  // Create initial version
  await prisma.observationVersion.create({
    data: {
      observationId: observation.id,
      text: body.text,
      version: 1,
    },
  }).catch(() => {})

  return NextResponse.json(observation, { status: 201 })
}

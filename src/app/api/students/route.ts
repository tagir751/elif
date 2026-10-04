import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { studentSchema, validateOrError } from '@/lib/validation'
import { maskPhone } from '@/lib/mask'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const groupId = searchParams.get('groupId')
  const sort = searchParams.get('sort') || 'name'

  const where: Record<string, unknown> = { deletedAt: null }

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
    ]
  }

  if (groupId) {
    where.enrollments = { some: { groupId, endDate: null } }
  }

  // Teacher: only their students
  if (user.roles.includes('teacher') && !user.roles.includes('manager') && !user.roles.includes('admin')) {
    const teacher = await prisma.teacher.findUnique({ where: { userId: user.userId } })
    if (teacher) {
      where.enrollments = {
        some: {
          group: { teacherId: teacher.id },
          endDate: null,
        },
      }
    }
  }

  const orderBy: Record<string, string> = {}
  if (sort === 'age') orderBy.birthDate = 'asc'
  else orderBy.lastName = 'asc'

  const students = await prisma.student.findMany({
    where,
    include: {
      family: { select: { id: true, name: true, phone: true } },
      enrollments: {
        where: { endDate: null },
        include: { group: { select: { id: true, name: true } } },
      },
    },
    orderBy,
  })

  // Mask phone for non-admin/manager roles
  const isTeacherOnly = user.roles.includes('teacher') && !user.roles.includes('manager') && !user.roles.includes('admin')
  if (isTeacherOnly) {
    for (const s of students) {
      if (s.family?.phone) s.family.phone = maskPhone(s.family.phone)
    }
  }

  return NextResponse.json(students)
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(studentSchema, body)
  if (error) return error

  const student = await prisma.student.create({
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      familyId: body.familyId,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: 'create',
      entity: 'student',
      entityId: student.id,
      payloadJson: JSON.stringify(body),
    },
  })

  return NextResponse.json(student, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { hashPassword } from '@/lib/auth-password'
import { teacherCreateSchema, validateOrError } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const teachers = await prisma.teacher.findMany({
    where: { deletedAt: null },
    include: {
      _count: { select: { groups: true, lessons: true } },
      user: { select: { email: true, status: true } },
    },
    orderBy: { fullName: 'asc' },
  })

  return NextResponse.json(teachers)
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(teacherCreateSchema, body)
  if (error) return error

  let userId = body.userId
  if (!userId && body.email) {
    const existing = await prisma.user.findUnique({ where: { email: body.email } })
    if (existing) {
      return NextResponse.json({ error: 'Email уже используется' }, { status: 400 })
    }
    const newUser = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash: await hashPassword(body.password || 'default123'),
        roles: JSON.stringify(['teacher']),
        status: 'active',
      },
    })
    userId = newUser.id
  }

  if (!userId) {
    return NextResponse.json({ error: 'Необходим userId или email' }, { status: 400 })
  }

  const existingTeacher = await prisma.teacher.findUnique({ where: { userId } })
  if (existingTeacher) {
    return NextResponse.json({ error: 'Пользователь уже привязан к другому педагогу' }, { status: 400 })
  }

  const teacher = await prisma.teacher.create({
    data: {
      userId,
      fullName: body.fullName,
      specialization: body.specialization,
      phone: body.phone,
    },
  })

  return NextResponse.json(teacher, { status: 201 })
}

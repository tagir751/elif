import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, forbidden, requireRole } from '@/lib/api-middleware'
import { hashPassword } from '@/lib/auth-password'
import { userCreateSchema, validateOrError, validatePassword } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user || !requireRole(user, ['admin'])) return forbidden()

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      roles: true,
      status: true,
      deletedAt: true,
      createdAt: true,
      teacher: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user || !requireRole(user, ['admin'])) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(userCreateSchema, body)
  if (error) return error

  const passwordError = validatePassword(body.password)
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: body.email } })
  if (existing) {
    return NextResponse.json({ error: 'Email уже используется' }, { status: 400 })
  }

  const newUser = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash: await hashPassword(body.password),
      roles: JSON.stringify(body.roles || ['manager']),
    },
  })

  // Create teacher profile if teacher role
  if (body.roles?.includes('teacher') && body.teacherName) {
    await prisma.teacher.create({
      data: {
        userId: newUser.id,
        fullName: body.teacherName,
        specialization: body.specialization || '',
        phone: body.phone || '',
      },
    })
  }

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: 'create',
      entity: 'user',
      entityId: newUser.id,
      payloadJson: JSON.stringify({ email: body.email, roles: body.roles }),
    },
  })

  return NextResponse.json({ id: newUser.id, email: newUser.email }, { status: 201 })
}

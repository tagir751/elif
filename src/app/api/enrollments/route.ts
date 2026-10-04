import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { enrollmentSchema, validateOrError } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(enrollmentSchema, body)
  if (error) return error

  const existing = await prisma.enrollment.findFirst({
    where: { studentId: body.studentId, groupId: body.groupId, endDate: null },
  })
  if (existing) {
    return NextResponse.json({ error: 'Ученик уже зачислен в эту группу' }, { status: 409 })
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: body.studentId,
      groupId: body.groupId,
      startDate: new Date(),
    },
  })

  return NextResponse.json(enrollment, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const body = await request.json()

  const enrollment = await prisma.enrollment.update({
    where: { id: body.id },
    data: { endDate: new Date(), status: 'ended' },
  })

  return NextResponse.json(enrollment)
}

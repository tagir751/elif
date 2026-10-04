import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole, notFound } from '@/lib/api-middleware'
import { teacherUpdateSchema, validateOrError } from '@/lib/validation'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { id } = await params
  const body = await request.json()

  const { error } = validateOrError(teacherUpdateSchema, body)
  if (error) return error

  const teacher = await prisma.teacher.update({
    where: { id },
    data: {
      fullName: body.fullName ?? undefined,
      specialization: body.specialization ?? undefined,
      phone: body.phone ?? undefined,
    },
  })

  return NextResponse.json(teacher)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { id } = await params

  // Cancel future lessons, keep past ones
  await prisma.lesson.updateMany({
    where: { teacherId: id, dateTime: { gt: new Date() } },
    data: { status: 'cancelled' },
  })

  await prisma.teacher.update({ where: { id }, data: { deletedAt: new Date(), status: 'deleted' } })

  return NextResponse.json({ ok: true })
}

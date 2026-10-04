import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole, notFound } from '@/lib/api-middleware'
import { taskUpdateSchema, validateOrError } from '@/lib/validation'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager', 'teacher'])) return forbidden()

  const { id } = await params

  // Teachers can only edit their own tasks
  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) return notFound()
  if (user.roles.includes('teacher') && existing.createdBy !== user.userId) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(taskUpdateSchema, body)
  if (error) return error

  const task = await prisma.task.update({
    where: { id },
    data: {
      title: body.title ?? undefined,
      type: body.type ?? undefined,
      bucket: body.bucket ?? undefined,
      dueDate: body.dueDate !== undefined ? (body.dueDate ? new Date(body.dueDate) : null) : undefined,
      completed: body.completed ?? undefined,
      familyId: body.familyId ?? undefined,
      studentId: body.studentId ?? undefined,
    },
  })

  return NextResponse.json(task)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager', 'teacher'])) return forbidden()

  const { id } = await params

  const existing = await prisma.task.findUnique({ where: { id } })
  if (!existing) return notFound()
  if (user.roles.includes('teacher') && existing.createdBy !== user.userId) return forbidden()

  await prisma.task.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}

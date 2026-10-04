import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { taskSchema, validateOrError } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager', 'teacher'])) return forbidden()

  const { searchParams } = new URL(request.url)
  const bucket = searchParams.get('bucket')

  const where: Record<string, unknown> = {}
  if (bucket) where.bucket = bucket
  if (user.roles.includes('teacher')) where.createdBy = user.userId

  const tasks = await prisma.task.findMany({
    where,
    include: {
      user: { select: { email: true } },
    },
    orderBy: [{ completed: 'asc' }, { dueDate: 'asc' }],
  })

  return NextResponse.json(tasks)
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager', 'teacher'])) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(taskSchema, body)
  if (error) return error

  const task = await prisma.task.create({
    data: {
      title: body.title,
      type: body.type || 'other',
      bucket: body.bucket || 'today',
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      familyId: body.familyId || null,
      studentId: body.studentId || null,
      createdBy: user.userId,
    },
  })

  return NextResponse.json(task, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole, notFound } from '@/lib/api-middleware'
import { lessonUpdateSchema, validateOrError } from '@/lib/validation'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()

  const { id } = await params
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      group: { select: { id: true, name: true } },
      teacher: { select: { id: true, fullName: true } },
      room: { select: { id: true, name: true } },
      attendances: { include: { student: { select: { id: true, firstName: true, lastName: true } } } },
      observations: { include: { student: { select: { id: true, firstName: true, lastName: true } }, teacher: { select: { fullName: true } } } },
    },
  })
  if (!lesson) return notFound()
  return NextResponse.json(lesson)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager', 'teacher'])) return forbidden()

  const { id } = await params
  const body = await request.json()

  const { error } = validateOrError(lessonUpdateSchema, body)
  if (error) return error

  const lesson = await prisma.lesson.update({
    where: { id },
    data: {
      status: body.status ?? undefined,
      topic: body.topic ?? undefined,
      homework: body.homework ?? undefined,
      lessonNote: body.lessonNote ?? undefined,
      hypothesis: body.hypothesis ?? undefined,
      personalNote: body.personalNote ?? undefined,
      teacherId: body.teacherId ?? undefined,
      roomId: body.roomId ?? undefined,
    },
  })

  return NextResponse.json(lesson)
}

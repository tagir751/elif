import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { attendanceBatchSchema, validateOrError } from '@/lib/validation'

export async function PUT(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager', 'teacher'])) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(attendanceBatchSchema, body)
  if (error) return error

  const { lessonId, attendance } = body

  const records = await Promise.all(
    attendance.map((a: { studentId: string; status: string; mark?: string }) =>
      prisma.attendance.upsert({
        where: {
          lessonId_studentId: { lessonId, studentId: a.studentId },
        },
        update: { status: a.status, mark: a.mark ?? undefined },
        create: {
          lessonId,
          studentId: a.studentId,
          status: a.status,
          mark: a.mark || null,
        },
      })
    )
  )

  return NextResponse.json({ count: records.length })
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized } from '@/lib/api-middleware'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()

  const { searchParams } = new URL(request.url)
  const teacherId = searchParams.get('teacherId')
  const studentId = searchParams.get('studentId')
  const studentIds = searchParams.get('studentIds') // comma-separated
  const lessonId = searchParams.get('lessonId')

  const where: Record<string, unknown> = {}
  if (teacherId) where.teacherId = teacherId
  if (studentId) where.studentId = studentId
  if (studentIds) where.studentId = { in: studentIds.split(',') }
  if (lessonId) where.lessonId = lessonId
  where.isArchived = false

  const recommendations = await prisma.recommendation.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(recommendations)
}

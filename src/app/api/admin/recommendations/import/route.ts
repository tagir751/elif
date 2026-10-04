import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'

export async function POST(request: Request) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin'])) return forbidden()

  const body = await request.json()
  const recommendations = body.recommendations || body

  if (!Array.isArray(recommendations)) {
    return NextResponse.json({ error: 'Ожидается массив рекомендаций' }, { status: 400 })
  }

  const valid = recommendations.every(
    (r: any) => r.text && typeof r.text === 'string'
  )
  if (!valid) {
    return NextResponse.json({ error: 'Каждая рекомендация должна содержать text' }, { status: 400 })
  }

  // Archive old recommendations instead of deleting
  await prisma.recommendation.updateMany({
    where: { isArchived: false },
    data: { isArchived: true },
  })

  const data = recommendations.map((r: any) => ({
    teacherId: r.teacherId || null,
    studentId: r.studentId || null,
    lessonId: r.lessonId || null,
    text: r.text,
    source: r.source || 'manual',
    isArchived: false,
  }))

  await prisma.recommendation.createMany({ data })

  return NextResponse.json({ created: data.length })
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { generateLessonsForGroup } from '@/lib/lessons/generator'

export async function POST(request: Request) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const groups = await prisma.group.findMany({
    where: { status: 'active', deletedAt: null },
    select: { id: true },
  })

  let totalConflicts = 0
  for (const group of groups) {
    const conflicts = await generateLessonsForGroup(group.id)
    if (conflicts) totalConflicts += conflicts.length
  }

  return NextResponse.json({ created: 'ok', conflicts: totalConflicts })
}

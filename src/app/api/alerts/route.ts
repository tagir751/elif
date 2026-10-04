import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, requireRole } from '@/lib/api-middleware'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })

  const alerts: { type: string; icon: string; text: string; studentId?: string; familyId?: string }[] = []

  // 1. Payment overdue alerts
  const families = await prisma.family.findMany({
    where: { deletedAt: null, paidUntil: { not: null } },
    select: { id: true, name: true, paidUntil: true },
  })
  const today = new Date()
  for (const f of families) {
    if (f.paidUntil && f.paidUntil < today) {
      alerts.push({ type: 'payment_overdue', icon: '🔴', text: 'Overdue payment: ' + f.name, familyId: f.id })
    }
  }

  // 2. Attendance streak alerts (3+ consecutive absences)
  const students = await prisma.student.findMany({
    where: { deletedAt: null },
    select: {
      id: true, firstName: true, lastName: true,
      attendances: {
        orderBy: { lesson: { dateTime: 'desc' } },
        take: 10,
        select: { status: true },
      },
    },
  })
  for (const s of students) {
    let streak = 0
    for (const a of s.attendances) {
      if (a.status === 'absent') streak++
      else break
    }
    if (streak >= 3) {
      alerts.push({ type: 'absent_streak', icon: '🟡', text: s.firstName + ' ' + s.lastName + ' — ' + streak + ' absences', studentId: s.id })
    }
  }

  return NextResponse.json(alerts)
}

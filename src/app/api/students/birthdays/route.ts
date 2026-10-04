import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, requireRole, forbidden } from '@/lib/api-middleware'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager', 'teacher'])) return forbidden()

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '14', 10)

  const students = await prisma.student.findMany({
    where: { deletedAt: null, birthDate: { not: null } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      birthDate: true,
      family: { select: { name: true } },
    },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result = students
    .filter((s) => {
      if (!s.birthDate) return false
      const birth = new Date(s.birthDate)
      const thisYear = today.getFullYear()

      let bdayThisYear = new Date(thisYear, birth.getMonth(), birth.getDate())
      if (bdayThisYear < today) {
        bdayThisYear = new Date(thisYear + 1, birth.getMonth(), birth.getDate())
      }

      const diffMs = bdayThisYear.getTime() - today.getTime()
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= days
    })
    .map((s) => {
      const birth = new Date(s.birthDate!)
      const thisYear = today.getFullYear()

      let nextBday = new Date(thisYear, birth.getMonth(), birth.getDate())
      if (nextBday < today) {
        nextBday = new Date(thisYear + 1, birth.getMonth(), birth.getDate())
      }

      const age = nextBday.getFullYear() - birth.getFullYear()

      return {
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        birthDate: s.birthDate,
        familyName: s.family.name,
        age,
      }
    })
    .sort((a, b) => {
      const aDay = (a.birthDate?.getMonth() || 0) * 31 + (a.birthDate?.getDate() || 0)
      const bDay = (b.birthDate?.getMonth() || 0) * 31 + (b.birthDate?.getDate() || 0)
      return aDay - bDay
    })

  return NextResponse.json(result)
}

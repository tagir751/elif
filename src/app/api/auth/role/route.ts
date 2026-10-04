import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized } from '@/lib/api-middleware'

export async function PUT(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()

  const body = await request.json()
  const { role } = body

  const allowedRoles = user.roles as string[]
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Роль недоступна' }, { status: 403 })
  }

  return NextResponse.json({ activeRole: role })
}

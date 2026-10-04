import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized } from '@/lib/api-middleware'
import { comparePassword } from '@/lib/auth-password'

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()

  const { password } = await request.json()
  if (!password) {
    return NextResponse.json({ error: 'Пароль обязателен' }, { status: 400 })
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.userId } })
  if (!dbUser) return unauthorized()

  const valid = await comparePassword(password, dbUser.passwordHash)
  if (!valid) {
    return NextResponse.json({ error: 'Неверный пароль' }, { status: 403 })
  }

  return NextResponse.json({ ok: true })
}

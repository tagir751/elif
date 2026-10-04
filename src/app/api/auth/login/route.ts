import { NextResponse } from 'next/server'
import prisma from '../../../../lib/prisma'
import { comparePassword } from '../../../../lib/auth-password'
import { signToken, signRefreshToken } from '../../../../lib/auth'
import { unauthorized } from '../../../../lib/api-middleware'
import { loginSchema, validateOrError } from '../../../../lib/validation'

export async function POST(request: Request) {
  const body = await request.json()
  const { error } = validateOrError(loginSchema, body)
  if (error) return error

  const { email, password } = body

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || user.deletedAt || user.status === 'disabled') {
    return unauthorized()
  }

  const valid = await comparePassword(password, user.passwordHash)

  if (!valid) {
    return unauthorized()
  }

  const roles: string[] = JSON.parse(user.roles)
  const payload = { userId: user.id, email: user.email, roles }
  const token = await signToken(payload)
  const refreshToken = await signRefreshToken(payload)

  const response = NextResponse.json({
    token,
    user: { id: user.id, email: user.email, roles },
  })

  response.cookies.set('token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60,
  })

  response.cookies.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })

  return response
}

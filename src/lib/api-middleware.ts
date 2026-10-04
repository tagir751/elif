import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, JwtPayload } from './auth'

export async function getAuthUser(request: NextRequest | Request): Promise<JwtPayload | null> {
  // Try Authorization header first
  const auth = (request as NextRequest).headers?.get?.('authorization') || (request as Request).headers?.get?.('authorization')
  if (auth?.startsWith('Bearer ')) {
    try {
      return await verifyToken(auth.slice(7))
    } catch {
      return null
    }
  }

  // Try cookie (for NextRequest with cookies)
  const req = request as NextRequest
  if (req.cookies) {
    const token = req.cookies.get('token')?.value
    if (token) {
      try {
        return await verifyToken(token)
      } catch {
        return null
      }
    }
  }

  return null
}

export async function getAuthUserFromCookie(request: Request): Promise<JwtPayload | null> {
  const cookieHeader = request.headers.get('cookie') || ''
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]*)/)
  if (!match) return null

  try {
    return await verifyToken(match[1])
  } catch {
    return null
  }
}

export function unauthorized() {
  return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
}

export function requireRole(user: JwtPayload | null, roles: string[]): boolean {
  if (!user) return false
  return roles.some((role) => user.roles.includes(role))
}

export function notFound(message = 'Не найдено') {
  return NextResponse.json({ error: message }, { status: 404 })
}

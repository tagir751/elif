import { NextResponse } from 'next/server'
import { signToken, verifyToken } from '../../../../lib/auth'

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie') || ''
  const match = cookieHeader.match(/(?:^|;\s*)refreshToken=([^;]*)/)
  if (!match) {
    return NextResponse.json({ error: 'Refresh token not found' }, { status: 401 })
  }

  try {
    const payload = await verifyToken(match[1])
    const token = await signToken({
      userId: payload.userId,
      email: payload.email,
      roles: payload.roles,
    })

    const response = NextResponse.json({ ok: true })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 })
  }
}

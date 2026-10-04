import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '../../../../lib/auth'
import prisma from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const token = request.cookies.get('token')?.value

  if (!token) {
    return NextResponse.json(null, { status: 401 })
  }

  try {
    const payload = await verifyToken(token)
    let teacher = null
    if (payload.roles?.includes('teacher')) {
      teacher = await prisma.teacher.findUnique({
        where: { userId: payload.userId },
        select: { id: true, fullName: true },
      })
    }
    return NextResponse.json({
      id: payload.userId,
      email: payload.email,
      roles: payload.roles,
      teacher,
    })
  } catch {
    return NextResponse.json(null, { status: 401 })
  }
}

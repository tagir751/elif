import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { hashPassword } from '@/lib/auth-password'
import { getAuthUserFromCookie, forbidden } from '@/lib/api-middleware'

export async function POST(request: NextRequest) {
  try {
    const userCount = await prisma.user.count()

    if (userCount === 0) {
      const body = await request.json().catch(() => ({}))
      const tagirPassword: string | undefined = body.tagirPassword || body.adminPassword
      const dilyaraPassword: string | undefined = body.dilyaraPassword

      if (!tagirPassword || typeof tagirPassword !== 'string' || tagirPassword.length < 8) {
        return NextResponse.json(
          { error: 'tagirPassword required (min 8 chars)' },
          { status: 400 }
        )
      }

      if (!dilyaraPassword || typeof dilyaraPassword !== 'string' || dilyaraPassword.length < 8) {
        return NextResponse.json(
          { error: 'dilyaraPassword required (min 8 chars)' },
          { status: 400 }
        )
      }

      await prisma.user.create({
        data: {
          email: 'Тагир',
          passwordHash: await hashPassword(tagirPassword),
          roles: JSON.stringify(['admin']),
        },
      })

      const dilyara = await prisma.user.create({
        data: {
          email: 'Диляра',
          passwordHash: await hashPassword(dilyaraPassword),
          roles: JSON.stringify(['manager', 'teacher']),
        },
      })

      await prisma.teacher.create({
        data: {
          userId: dilyara.id,
          fullName: 'Диляра',
          specialization: '',
          phone: '',
        },
      })

      return NextResponse.json({
        created: ['Тагир', 'Диляра'],
        users: [
          { email: 'Тагир', password: tagirPassword, roles: ['admin'] },
          { email: 'Диляра', password: dilyaraPassword, roles: ['manager', 'teacher'] },
        ],
      })
    }

    const user = await getAuthUserFromCookie(request)
    if (!user || !user.roles.includes('admin')) {
      return forbidden()
    }

    return NextResponse.json(
      { error: 'already initialized' },
      { status: 409 }
    )
  } catch (e: any) {
    console.error('Seed error:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

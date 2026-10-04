import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, forbidden, requireRole } from '@/lib/api-middleware'
import { hashPassword, comparePassword } from '@/lib/auth-password'
import { userUpdateSchema, validateOrError, validatePassword } from '@/lib/validation'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user || !requireRole(user, ['admin'])) return forbidden()

  const { id } = await params
  const body = await request.json()

  const { error } = validateOrError(userUpdateSchema, body)
  if (error) return error

  // Require password confirmation for role changes
  if (body.roles) {
    const confirmPassword = request.headers.get('x-confirm-password')
    if (!confirmPassword) {
      return NextResponse.json({ error: 'Требуется подтверждение пароля' }, { status: 403 })
    }
    const admin = await prisma.user.findUnique({ where: { id: user.userId } })
    if (!admin) return forbidden()
    const valid = await comparePassword(confirmPassword, admin.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Неверный пароль' }, { status: 403 })
    }
  }

  const data: Record<string, unknown> = {}
  if (body.email) data.email = body.email
  if (body.status) data.status = body.status
  if (body.roles) data.roles = JSON.stringify(body.roles)
  if (body.password) {
    const passwordError = validatePassword(body.password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }
    data.passwordHash = await hashPassword(body.password)
  }

  await prisma.user.update({ where: { id }, data })

  const payload: Record<string, unknown> = {}
  if (body.email) payload.email = body.email
  if (body.roles) payload.roles = body.roles
  if (body.status) payload.status = body.status
  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: 'update',
      entity: 'user',
      entityId: id,
      payloadJson: JSON.stringify(payload),
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user || !requireRole(user, ['admin'])) return forbidden()

  const { id } = await params
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), status: 'disabled' } })

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: 'delete',
      entity: 'user',
      entityId: id,
    },
  })

  return NextResponse.json({ ok: true })
}

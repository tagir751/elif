import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole, notFound } from '@/lib/api-middleware'
import { roomUpdateSchema, validateOrError } from '@/lib/validation'

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { id } = await params
  const body = await request.json()

  const { error } = validateOrError(roomUpdateSchema, body)
  if (error) return error

  const room = await prisma.room.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      address: body.address ?? undefined,
      capacity: body.capacity ?? undefined,
      equipment: body.equipment ?? undefined,
    },
  })

  return NextResponse.json(room)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { id } = await params
  await prisma.room.update({ where: { id }, data: { deletedAt: new Date() } })

  return NextResponse.json({ ok: true })
}

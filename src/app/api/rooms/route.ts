import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { roomSchema, validateOrError } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()

  const rooms = await prisma.room.findMany({
    where: { deletedAt: null },
    include: {
      groups: {
        where: { deletedAt: null },
        select: { id: true, name: true },
      },
      _count: { select: { lessons: true, scheduleSlots: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(rooms)
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(roomSchema, body)
  if (error) return error

  const room = await prisma.room.create({
    data: {
      name: body.name,
      address: body.address || null,
      capacity: body.capacity || 0,
      equipment: body.equipment || null,
    },
  })

  return NextResponse.json(room, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { scheduleSlotSchema, validateOrError } from '@/lib/validation'
import { generateLessonsForGroup } from '@/lib/lessons/generator'

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(scheduleSlotSchema, body)
  if (error) return error

  const slot = await prisma.scheduleSlot.create({
    data: {
      groupId: body.groupId,
      dayOfWeek: body.dayOfWeek,
      timeStart: body.timeStart,
      durationMinutes: body.durationMinutes || 90,
      roomId: body.roomId,
    },
  })

  const conflicts = await generateLessonsForGroup(body.groupId)

  return NextResponse.json({ slot, conflicts }, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const existing = await prisma.scheduleSlot.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

  const body = await request.json()

  const slot = await prisma.scheduleSlot.update({
    where: { id },
    data: {
      dayOfWeek: body.dayOfWeek ?? existing.dayOfWeek,
      timeStart: body.timeStart ?? existing.timeStart,
      durationMinutes: body.durationMinutes ?? existing.durationMinutes,
      roomId: body.roomId ?? existing.roomId,
    },
  })

  const conflicts = await generateLessonsForGroup(existing.groupId)

  return NextResponse.json({ slot, conflicts })
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const slot = await prisma.scheduleSlot.findUnique({ where: { id } })
  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 })

  await prisma.scheduleSlot.delete({ where: { id } })

  const conflicts = await generateLessonsForGroup(slot.groupId)

  return NextResponse.json({ ok: true, conflicts })
}

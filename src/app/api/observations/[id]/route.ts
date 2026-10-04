import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole, notFound } from '@/lib/api-middleware'
import { observationUpdateSchema, validateOrError } from '@/lib/validation'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()

  const { id } = await params
  const observation = await prisma.observation.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      lesson: { select: { id: true, dateTime: true, group: { select: { name: true } } } },
      teacher: { select: { id: true, fullName: true } },
    },
  })
  if (!observation) return notFound()
  return NextResponse.json(observation)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager', 'teacher'])) return forbidden()

  const { id } = await params
  const body = await request.json()

  const { error } = validateOrError(observationUpdateSchema, body)
  if (error) return error

  const existing = await prisma.observation.findUnique({ where: { id } })
  if (!existing) return notFound()

  // If text changed, save version before updating
  if (body.text && body.text !== existing.text) {
    const latestVersion = await prisma.observationVersion.findFirst({
      where: { observationId: id },
      orderBy: { version: 'desc' },
    })
    await prisma.observationVersion.create({
      data: { observationId: id, text: existing.text, version: (latestVersion?.version || 0) + 1 },
    })
  }

  const observation = await prisma.observation.update({
    where: { id },
    data: {
      text: body.text ?? undefined,
      status: body.status ?? undefined,
    },
  })

  return NextResponse.json(observation)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager', 'teacher'])) return forbidden()

  const { id } = await params
  await prisma.observation.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}

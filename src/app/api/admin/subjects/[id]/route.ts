import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole, notFound } from '@/lib/api-middleware'

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin'])) return forbidden()

  const { id } = await params
  const existing = await prisma.subject.findUnique({ where: { id } })
  if (!existing) return notFound()

  await prisma.subject.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

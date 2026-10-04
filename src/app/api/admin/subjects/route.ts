import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { subjectSchema, validateOrError } from '@/lib/validation'

export async function GET() {
  const subjects = await prisma.subject.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(subjects)
}

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin'])) return forbidden()

  const body = await request.json()
  const { error } = validateOrError(subjectSchema, body)
  if (error) return error

  const { name } = body

  const existing = await prisma.subject.findUnique({ where: { name: name.trim() } })
  if (existing) {
    return NextResponse.json({ error: 'Предмет уже существует' }, { status: 409 })
  }

  const subject = await prisma.subject.create({ data: { name: name.trim() } })
  return NextResponse.json(subject, { status: 201 })
}

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, unauthorized, forbidden, requireRole } from '@/lib/api-middleware'
import { paymentSchema, validateOrError } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user) return unauthorized()
  if (!requireRole(user, ['admin', 'manager'])) return forbidden()

  const body = await request.json()

  const { error } = validateOrError(paymentSchema, body)
  if (error) return error

  const payment = await prisma.payment.create({
    data: {
      familyId: body.familyId,
      amount: body.amount,
      date: new Date(body.date),
      comment: body.comment || null,
    },
  })

  // Update family paidUntil if provided
  if (body.paidUntil) {
    await prisma.family.update({
      where: { id: body.familyId },
      data: { paidUntil: new Date(body.paidUntil) },
    })
  }

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: 'create',
      entity: 'payment',
      entityId: payment.id,
      payloadJson: JSON.stringify(body),
    },
  })

  return NextResponse.json(payment, { status: 201 })
}

import prisma from '@/lib/prisma'
import { checkLessonConflicts } from '@/lib/schedule-validator'

export async function generateLessonsForGroup(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      scheduleSlots: { include: { room: true } },
    },
  })
  if (!group || group.status !== 'active') return null

  const slots = group.scheduleSlots
  if (slots.length === 0) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const conflictDetails: { slotId: string; message: string }[] = []

  // Build the list of dateTimes that will be generated per slot
  const dateTimeKeys: string[] = []
  for (const slot of slots) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      if (date.getDay() !== slot.dayOfWeek) continue
      const [h, m] = slot.timeStart.split(':').map(Number)
      date.setHours(h, m, 0, 0)
      dateTimeKeys.push(date.toISOString())
    }
  }

  // Delete regeneratable lessons inside a transaction
  await prisma.$transaction(async (tx) => {
    await tx.lesson.deleteMany({
      where: {
        groupId,
        dateTime: { in: dateTimeKeys.map((k) => new Date(k)) },
        status: { in: ['planned', 'conflict'] },
        attendances: { none: {} },
        observations: { none: {} },
      },
    })
  })

  const lessonsToCreate: {
    groupId: string
    teacherId: string
    roomId: string
    dateTime: Date
    status: string
    conflictDetails: string | null
  }[] = []

  for (const slot of slots) {
    for (let i = 0; i < 30; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      if (date.getDay() !== slot.dayOfWeek) continue

      const [h, m] = slot.timeStart.split(':').map(Number)
      date.setHours(h, m, 0, 0)

      const conflicts = await checkLessonConflicts({
        teacherId: group.teacherId,
        roomId: slot.roomId,
        dateTime: date.toISOString(),
        durationMinutes: slot.durationMinutes,
        excludeGroupId: groupId,
      })

      const hasConflict = conflicts.length > 0
      if (hasConflict) {
        conflictDetails.push({
          slotId: slot.id,
          message: conflicts.map((c) => c.description).join('; '),
        })
      }

      lessonsToCreate.push({
        groupId,
        teacherId: group.teacherId,
        roomId: slot.roomId,
        dateTime: new Date(date),
        status: hasConflict ? 'conflict' : 'planned',
        conflictDetails: hasConflict ? JSON.stringify(conflicts) : null,
      })
    }
  }

  if (lessonsToCreate.length > 0) {
    try {
      await prisma.lesson.createMany({ data: lessonsToCreate })
    } catch (e: unknown) {
      // P2002 = unique constraint violation — skip duplicates silently
      if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002') {
        // Fallback: create one by one, skip existing
        for (const lesson of lessonsToCreate) {
          try {
            await prisma.lesson.create({ data: lesson })
          } catch (inner: unknown) {
            if (typeof inner === 'object' && inner !== null && 'code' in inner && (inner as { code: string }).code !== 'P2002') throw inner
          }
        }
      } else {
        throw e
      }
    }
  }

  return conflictDetails.length > 0 ? conflictDetails : null
}

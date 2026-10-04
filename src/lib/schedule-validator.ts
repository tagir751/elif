import prisma from '@/lib/prisma'

export interface Conflict {
  type: 'TEACHER_BUSY' | 'ROOM_BUSY'
  description: string
  conflictingLessonId?: string
}

export async function checkLessonConflicts(params: {
  teacherId: string
  roomId: string
  dateTime: string
  durationMinutes: number
  excludeGroupId?: string
}): Promise<Conflict[]> {
  const conflicts: Conflict[] = []
  const start = new Date(params.dateTime)
  const end = new Date(start.getTime() + params.durationMinutes * 60 * 1000)

  const groupFilter = params.excludeGroupId
    ? { NOT: { groupId: params.excludeGroupId } }
    : {}

  const teacherLessons = await prisma.lesson.findMany({
    where: {
      teacherId: params.teacherId,
      dateTime: { gte: start, lt: end },
      status: { notIn: ['cancelled'] },
      ...groupFilter,
    },
    select: { id: true, group: { select: { name: true } } },
  })
  for (const l of teacherLessons) {
    conflicts.push({
      type: 'TEACHER_BUSY',
      description: 'Педагог уже ведёт занятие в это время (' + l.group.name + ')',
      conflictingLessonId: l.id,
    })
  }

  const roomLessons = await prisma.lesson.findMany({
    where: {
      roomId: params.roomId,
      dateTime: { gte: start, lt: end },
      status: { notIn: ['cancelled'] },
      ...groupFilter,
    },
    select: { id: true, group: { select: { name: true } } },
  })
  for (const l of roomLessons) {
    conflicts.push({
      type: 'ROOM_BUSY',
      description: 'Кабинет занят в это время (' + l.group.name + ')',
      conflictingLessonId: l.id,
    })
  }

  return conflicts
}

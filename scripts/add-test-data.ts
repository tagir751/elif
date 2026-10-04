import prisma from '../src/lib/prisma'

async function main() {
  const lessonId = '07c83ed1-e0c1-4e26-a13d-9f9d98417612'
  const groupId = 'g-math5'

  // Get existing students enrolled in this group
  const enrollments = await prisma.enrollment.findMany({
    where: { groupId },
    include: { student: true },
  })

  if (enrollments.length === 0) {
    console.log('No enrollments found for g-math5, creating...')
    // Seed students
    const studentIds = ['s-ivanov', 's-novikov', 's-petrov', 's-popov', 's-smirnov']
    for (const sid of studentIds) {
      await prisma.enrollment.create({
        data: { studentId: sid, groupId, startDate: new Date() },
      }).catch(() => {})
    }
    // Re-fetch
    const e2 = await prisma.enrollment.findMany({ where: { groupId }, include: { student: true } })
    console.log('After creation:', e2.length, 'enrollments')
  }

  // 1. Add hypothesis to the lesson
  await prisma.lesson.update({
    where: { id: lessonId },
    data: { hypothesis: 'Рекомендуется увеличить время парной работы для улучшения коммуникативных навыков.' },
  })
  console.log('hypothesis added')

  // 2. Add attendances for all students
  const allEnrollments = await prisma.enrollment.findMany({ where: { groupId }, include: { student: true } })
  for (const e of allEnrollments) {
    await prisma.attendance.create({
      data: {
        id: 'att-' + e.studentId + '-' + lessonId.slice(0, 8),
        lessonId,
        studentId: e.student.id,
        status: 'present',
      },
    }).catch(() => console.log('attendance exists for', e.student.lastName))
  }
  console.log('attendances added:', allEnrollments.length)

  // 3. Add observations for 2 students
  const allTeachers = await prisma.teacher.findMany()
  console.log('Teachers:', allTeachers.map(t => t.id + ' ' + t.fullName))

  if (allTeachers.length >= 2 && allEnrollments.length >= 2) {
    // Observation for first student
    await prisma.observation.create({
      data: {
        id: 'obs-test-1',
        studentId: allEnrollments[0].student.id,
        lessonId,
        teacherId: allTeachers[0].id,
        text: 'Отличный прогресс в решении уравнений. Рекомендую усложнить задания.',
        createdAt: new Date(),
      },
    }).catch(() => console.log('obs-test-1 exists'))
    console.log('observation 1 added for', allEnrollments[0].student.lastName)

    // Observation for second student
    await prisma.observation.create({
      data: {
        id: 'obs-test-2',
        studentId: allEnrollments[1].student.id,
        lessonId,
        teacherId: allTeachers[1]?.id || allTeachers[0].id,
        text: 'Требуется дополнительное внимание к теме. Рекомендуется повторение материала.',
        createdAt: new Date(),
      },
    }).catch(() => console.log('obs-test-2 exists'))
    console.log('observation 2 added for', allEnrollments[1].student.lastName)
  }

  console.log('Done! Lesson', lessonId, 'now has hypothesis + observations')
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })

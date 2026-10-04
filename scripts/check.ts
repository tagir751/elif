import prisma from '../src/lib/prisma'

async function main() {
  const lessons = await prisma.lesson.findMany({
    where: { groupId: 'g-math5' },
    include: { attendances: { include: { student: true } }, observations: true },
    orderBy: { dateTime: 'asc' }
  })
  console.log(JSON.stringify(lessons.map(l => ({ id: l.id, date: l.dateTime.toISOString(), atts: l.attendances.length, obs: l.observations.length, students: l.attendances.map(a => a.student.firstName + ' ' + a.student.lastName) })), null, 2))
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })

import prisma from '../src/lib/prisma'

async function main() {
  const lesson = await prisma.lesson.findUnique({
    where: { id: '07c83ed1-e0c1-4e26-a13d-9f9d98417612' },
    include: { attendances: { include: { student: true } }, observations: { include: { student: true } } }
  })
  if (!lesson) { console.log('Lesson not found'); return }
  
  console.log('ID:', lesson.id)
  console.log('Date:', lesson.dateTime.toISOString())
  console.log('Hypothesis:', lesson.hypothesis ? 'SET to: ' + lesson.hypothesis.substring(0, 50) : 'NULL')
  console.log('Attendances count:', lesson.attendances.length)
  lesson.attendances.forEach(a => console.log('  -', a.student.lastName, a.student.firstName, '(' + a.student.id + ')'))
  console.log('Observations count:', lesson.observations.length)
  lesson.observations.forEach(o => console.log('  -', o.student.lastName, o.student.firstName, ':', o.text.substring(0, 40)))
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })

import prisma from '../src/lib/prisma'
import { hashPassword } from '../src/lib/auth-password'

async function clean() {
  console.log('Clearing all test data...')

  // Delete in FK-safe order (children before parents)
  await prisma.observationVersion.deleteMany()
  await prisma.observation.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.lesson.deleteMany()
  await prisma.scheduleSlot.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.task.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.student.deleteMany()
  await prisma.group.deleteMany()
  await prisma.teacher.deleteMany()
  await prisma.family.deleteMany()
  await prisma.room.deleteMany()
  await prisma.subject.deleteMany()

  // Delete all users except admin
  const del = await prisma.user.deleteMany({
    where: { email: { not: 'admin@elif.ru' } },
  })
  console.log('Deleted ' + del.count + ' non-admin users')

  // Update admin password to "1975"
  await prisma.user.update({
    where: { email: 'admin@elif.ru' },
    data: { passwordHash: await hashPassword('1975') },
  })

  console.log('Admin password updated to 1975')
  console.log('Clean completed. Only admin@elif.ru / 1975 remains.')
}

clean().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())

import prisma from '../src/lib/prisma'
import { hashPassword } from '../src/lib/auth-password'

async function seed() {
  // ── Пользователи ──
  const admin = await prisma.user.upsert({
    where: { email: 'admin@elif.ru' },
    update: { passwordHash: await hashPassword('admin123') },
    create: { email: 'admin@elif.ru', passwordHash: await hashPassword('admin123'), roles: JSON.stringify(['admin']), status: 'active' },
  })
  await prisma.user.upsert({
    where: { email: 'manager@elif.ru' }, update: { passwordHash: await hashPassword('manager123') },
    create: { email: 'manager@elif.ru', passwordHash: await hashPassword('manager123'), roles: JSON.stringify(['manager']), status: 'active' },
  })
  const teacherUser = await prisma.user.upsert({
    where: { email: 'teacher@elif.ru' }, update: { passwordHash: await hashPassword('teacher123') },
    create: { email: 'teacher@elif.ru', passwordHash: await hashPassword('teacher123'), roles: JSON.stringify(['teacher']), status: 'active' },
  })
  const combinedUser = await prisma.user.upsert({
    where: { email: 'anna@elif.ru' }, update: { passwordHash: await hashPassword('anna123') },
    create: { email: 'anna@elif.ru', passwordHash: await hashPassword('anna123'), roles: JSON.stringify(['manager', 'teacher']), status: 'active' },
  })

  // ── Педагоги ──
  const t1 = await prisma.teacher.upsert({
    where: { userId: teacherUser.id }, update: {},
    create: { userId: teacherUser.id, fullName: 'Мария Ивановна Петрова', specialization: 'Математика', phone: '+79001112233', status: 'active' },
  })
  const t2 = await prisma.teacher.upsert({
    where: { userId: combinedUser.id }, update: {},
    create: { userId: combinedUser.id, fullName: 'Анна Сергеевна Смирнова', specialization: 'Русский язык и английский', phone: '+79001112244', status: 'active' },
  })

  // ── Кабинеты ──
  const rooms = {
    r3: await prisma.room.upsert({ where: { id: 'r3' }, update: {}, create: { id: 'r3', name: 'Кабинет 3', address: 'ул. Ленина, 5', capacity: 12, equipment: 'Проектор, доска, колонки' } }),
    r4: await prisma.room.upsert({ where: { id: 'r4' }, update: {}, create: { id: 'r4', name: 'Кабинет 4', address: 'ул. Ленина, 5', capacity: 10, equipment: 'Доска, телевизор' } }),
    r5: await prisma.room.upsert({ where: { id: 'r5' }, update: {}, create: { id: 'r5', name: 'Кабинет 5', address: 'ул. Ленина, 5', capacity: 8, equipment: 'Ноутбуки, проектор' } }),
    en: await prisma.room.upsert({ where: { id: 'en' }, update: {}, create: { id: 'en', name: 'Английский зал', address: 'ул. Русская, 10', capacity: 15, equipment: 'Проектор, аудиосистема, телевизор' } }),
  }

  // ── Группы ──
  const groups = {
    math5: await prisma.group.upsert({ where: { id: 'g-math5' }, update: {}, create: { id: 'g-math5', name: 'Математика 5А', subject: 'Математика', teacherId: t1.id, roomId: rooms.r3.id, capacity: 8, status: 'active' } }),
    math6: await prisma.group.upsert({ where: { id: 'g-math6' }, update: {}, create: { id: 'g-math6', name: 'Математика 6Б', subject: 'Математика', teacherId: t1.id, roomId: rooms.r3.id, capacity: 8, status: 'active' } }),
    rus5: await prisma.group.upsert({ where: { id: 'g-rus5' }, update: {}, create: { id: 'g-rus5', name: 'Русский язык 5А', subject: 'Русский язык', teacherId: t2.id, roomId: rooms.r4.id, capacity: 10, status: 'active' } }),
    engA1: await prisma.group.upsert({ where: { id: 'g-eng' }, update: {}, create: { id: 'g-eng', name: 'Английский A1', subject: 'Английский', teacherId: t2.id, roomId: rooms.en.id, capacity: 12, status: 'active' } }),
  }

  // ── Слоты расписания ──
  const slots = [
    { id: 'sl-math5-mon', groupId: groups.math5.id, dayOfWeek: 1, timeStart: '17:00', durationMinutes: 90, roomId: rooms.r3.id },
    { id: 'sl-math5-wed', groupId: groups.math5.id, dayOfWeek: 3, timeStart: '17:00', durationMinutes: 90, roomId: rooms.r3.id },
    { id: 'sl-math6-tue', groupId: groups.math6.id, dayOfWeek: 2, timeStart: '17:00', durationMinutes: 90, roomId: rooms.r3.id },
    { id: 'sl-math6-thu', groupId: groups.math6.id, dayOfWeek: 4, timeStart: '17:00', durationMinutes: 90, roomId: rooms.r3.id },
    { id: 'sl-rus5-mon', groupId: groups.rus5.id, dayOfWeek: 1, timeStart: '15:00', durationMinutes: 90, roomId: rooms.r4.id },
    { id: 'sl-rus5-wed', groupId: groups.rus5.id, dayOfWeek: 3, timeStart: '15:00', durationMinutes: 90, roomId: rooms.r4.id },
    { id: 'sl-eng-tue', groupId: groups.engA1.id, dayOfWeek: 2, timeStart: '16:00', durationMinutes: 90, roomId: rooms.en.id },
    { id: 'sl-eng-thu', groupId: groups.engA1.id, dayOfWeek: 4, timeStart: '16:00', durationMinutes: 90, roomId: rooms.en.id },
  ]
  for (const s of slots) {
    await prisma.scheduleSlot.upsert({ where: { id: s.id }, update: {}, create: s })
  }

  // ── Семьи ──
  const families = [
    { id: 'f-ivan', name: 'Ивановы', phone: '+79001112255', monthlyFee: 5000, paidUntil: new Date('2026-07-15') },
    { id: 'f-petr', name: 'Петровы', phone: '+79001112266', monthlyFee: 4500, paidUntil: new Date('2026-06-01') },
    { id: 'f-smir', name: 'Смирновы', phone: '+79001112277', monthlyFee: 6000, paidUntil: new Date('2026-07-10') },
    { id: 'f-kuzn', name: 'Кузнецовы', phone: '+79001112288', monthlyFee: 5500, paidUntil: new Date('2026-07-20') },
    { id: 'f-popo', name: 'Поповы', phone: '+79001112299', monthlyFee: 7000, paidUntil: new Date('2026-05-20') },
    { id: 'f-vasi', name: 'Васильевы', phone: '+79001113300', monthlyFee: 4000, paidUntil: new Date('2026-07-01') },
    { id: 'f-novi', name: 'Новиковы', phone: '+79001113311', monthlyFee: 5000, paidUntil: null },
  ]
  for (const f of families) {
    const { id, ...data } = f
    await prisma.family.upsert({ where: { id }, update: {}, create: { id, ...data } })
  }

  // ── Ученики ──
  const students = [
    { id: 's-ivan-1', firstName: 'Иван', lastName: 'Иванов', birthDate: new Date('2014-03-15'), familyId: 'f-ivan' },
    { id: 's-ivan-2', firstName: 'Ольга', lastName: 'Иванова', birthDate: new Date('2016-07-22'), familyId: 'f-ivan' },
    { id: 's-petr-1', firstName: 'Пётр', lastName: 'Петров', birthDate: new Date('2015-01-10'), familyId: 'f-petr' },
    { id: 's-smir-1', firstName: 'Артём', lastName: 'Смирнов', birthDate: new Date('2014-09-18'), familyId: 'f-smir' },
    { id: 's-smir-2', firstName: 'Дарья', lastName: 'Смирнова', birthDate: new Date('2015-11-30'), familyId: 'f-smir' },
    { id: 's-kuzn-1', firstName: 'Максим', lastName: 'Кузнецов', birthDate: new Date('2013-05-21'), familyId: 'f-kuzn' },
    { id: 's-popo-1', firstName: 'Алексей', lastName: 'Попов', birthDate: new Date('2014-02-14'), familyId: 'f-popo' },
    { id: 's-popo-2', firstName: 'Елена', lastName: 'Попова', birthDate: new Date('2016-06-08'), familyId: 'f-popo' },
    { id: 's-popo-3', firstName: 'Павел', lastName: 'Попов', birthDate: new Date('2013-08-25'), familyId: 'f-popo' },
    { id: 's-vasi-1', firstName: 'Анна', lastName: 'Васильева', birthDate: new Date('2015-04-10'), familyId: 'f-vasi' },
    { id: 's-novi-1', firstName: 'Дмитрий', lastName: 'Новиков', birthDate: new Date('2014-07-19'), familyId: 'f-novi' },
    { id: 's-novi-2', firstName: 'София', lastName: 'Новикова', birthDate: new Date('2016-12-03'), familyId: 'f-novi' },
  ]
  for (const s of students) {
    await prisma.student.upsert({ where: { id: s.id }, update: {}, create: s })
  }

  // ── Зачисления ──
  const enrollments: { studentId: string; groupId: string }[] = [
    { studentId: 's-ivan-1', groupId: groups.math5.id },
    { studentId: 's-petr-1', groupId: groups.math5.id },
    { studentId: 's-smir-1', groupId: groups.math5.id },
    { studentId: 's-popo-3', groupId: groups.math5.id },
    { studentId: 's-novi-1', groupId: groups.math5.id },
    { studentId: 's-kuzn-1', groupId: groups.math6.id },
    { studentId: 's-popo-1', groupId: groups.math6.id },
    { studentId: 's-popo-3', groupId: groups.math6.id },
    { studentId: 's-ivan-2', groupId: groups.rus5.id },
    { studentId: 's-smir-2', groupId: groups.rus5.id },
    { studentId: 's-popo-2', groupId: groups.rus5.id },
    { studentId: 's-novi-2', groupId: groups.rus5.id },
    { studentId: 's-smir-1', groupId: groups.engA1.id },
    { studentId: 's-vasi-1', groupId: groups.engA1.id },
    { studentId: 's-novi-1', groupId: groups.engA1.id },
  ]
  for (const e of enrollments) {
    const id = `enr-${e.studentId}-${e.groupId}`
    await prisma.enrollment.upsert({ where: { id }, update: {}, create: { id, studentId: e.studentId, groupId: e.groupId, startDate: new Date('2026-05-13') } })
  }

  // ── Уроки за 2 месяца ──
  const startDate = new Date('2026-05-13')
  const endDate = new Date('2026-07-13')
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

  const createdLessons: { id: string; dateTime: Date; groupId: string; students: string[] }[] = []
  let lessonIdx = 0

  for (const sl of slots) {
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dObj = new Date(d)
      const jsDay = dObj.getDay() // 0=Sun, 1=Mon...
      const slotDay = sl.dayOfWeek % 7
      if (jsDay !== slotDay) continue

      const [h, m] = sl.timeStart.split(':').map(Number)
      const dateTime = new Date(dObj)
      dateTime.setHours(h, m, 0, 0)

      const existing = await prisma.lesson.findFirst({ where: { groupId: sl.groupId, dateTime } })
      if (existing) continue

      const lid = `ls-${lessonIdx++}`
      await prisma.lesson.create({
        data: { id: lid, groupId: sl.groupId, teacherId: sl.groupId.startsWith('g-math') ? t1.id : t2.id, roomId: sl.roomId, dateTime },
      })

      const enrolled = enrollments.filter(e => e.groupId === sl.groupId).map(e => e.studentId)
      createdLessons.push({ id: lid, dateTime, groupId: sl.groupId, students: enrolled })
    }
  }

  // ── Отметки посещаемости для прошлых уроков ──
  const now = new Date()
  for (const lesson of createdLessons) {
    if (lesson.dateTime >= now) continue
    for (const studentId of lesson.students) {
      const attId = `att-${lesson.id}-${studentId}`
      const exists = await prisma.attendance.findUnique({ where: { id: attId } }).catch(() => null)
      if (exists) continue

      const r = Math.random()
      const status = r < 0.75 ? 'present' : r < 0.9 ? 'absent' : 'late'
      await prisma.attendance.create({ data: { id: attId, lessonId: lesson.id, studentId, status } }).catch(() => {})
    }
  }

  // ── Наблюдения ──
  const observationTexts = [
    'Хорошо справляется с задачами, уверенно отвечает у доски.',
    'Есть сложности с дробями — рекомендую дополнительные упражнения.',
    'Активно участвует в обсуждениях, помогает одноклассникам.',
    'Сегодня был рассеян, возможно не выспался. Рекомендую поговорить с родителями.',
    'Отлично написала контрольную работу — 5/5!',
    'Нужно больше внимания уделить домашним заданиям, стал пропускать.',
    'Проявил лидерские качества в командной работе.',
    'Заметен прогресс в произношении, молодец!',
    'Сделал интересное наблюдение по теме урока, предложил нестандартное решение.',
    'Требуется дополнительное внимание к теме «уравнения».',
    'Прекрасно работает в паре, коммуникабельный.',
    'На уроке был пассивен, рекомендую сменить вид деятельности.',
    'Отлично усвоил новую тему — быстро выполнил все задания.',
    'Пропустил две недели, нужно наверстать материал.',
    'Задаёт много вопросов — пытливый ум, это отлично!',
  ]

  const obsTeachers = [t1.id, t2.id]
  let obsIdx = 0

  for (const lesson of createdLessons) {
    if (lesson.dateTime >= now) continue
    if (Math.random() > 0.3) continue // 30% lessons have observations

    const numObs = Math.floor(Math.random() * 3) + 1
    const shuffled = [...lesson.students].sort(() => Math.random() - 0.5).slice(0, numObs)

    for (const studentId of shuffled) {
      const oid = `obs-${obsIdx++}`
      const exists = await prisma.observation.findUnique({ where: { id: oid } }).catch(() => null)
      if (exists) continue

      const text = observationTexts[Math.floor(Math.random() * observationTexts.length)]
      const teacherId = obsTeachers[Math.floor(Math.random() * obsTeachers.length)]

      await prisma.observation.create({
        data: { id: oid, studentId, lessonId: lesson.id, teacherId, text, createdAt: new Date(lesson.dateTime.getTime() + 3600000) },
      }).catch(() => {})
    }
  }

  // ── Платежи ──
  const paymentRecords = [
    { familyId: 'f-ivan', amount: 10000, date: new Date('2026-05-15'), comment: 'Май + июнь', paidUntil: new Date('2026-07-15') },
    { familyId: 'f-petr', amount: 4500, date: new Date('2026-05-10'), comment: 'Май', paidUntil: new Date('2026-06-01') },
    { familyId: 'f-smir', amount: 12000, date: new Date('2026-05-20'), comment: 'Май + июнь', paidUntil: new Date('2026-07-10') },
    { familyId: 'f-kuzn', amount: 5500, date: new Date('2026-06-01'), comment: 'Июнь', paidUntil: new Date('2026-07-20') },
    { familyId: 'f-popo', amount: 7000, date: new Date('2026-04-20'), comment: 'Апрель', paidUntil: new Date('2026-05-20') },
    { familyId: 'f-vasi', amount: 4000, date: new Date('2026-06-25'), comment: 'Июнь', paidUntil: new Date('2026-07-01') },
    { familyId: 'f-petr', amount: 4500, date: new Date('2026-06-10'), comment: 'Июнь', paidUntil: new Date('2026-07-01') },
    { familyId: 'f-popo', amount: 7000, date: new Date('2026-05-25'), comment: 'Май', paidUntil: new Date('2026-06-20') },
    { familyId: 'f-ivan', amount: 5000, date: new Date('2026-04-10'), comment: 'Апрель', paidUntil: new Date('2026-05-15') },
  ]
  for (let i = 0; i < paymentRecords.length; i++) {
    const pid = `pay-${i}`
    const exists = await prisma.payment.findUnique({ where: { id: pid } }).catch(() => null)
    if (exists) continue

    const p = paymentRecords[i]
    await prisma.payment.create({
      data: { id: pid, familyId: p.familyId, amount: p.amount, date: p.date, comment: p.comment },
    }).catch(() => {})

    // Update paidUntil on family
    await prisma.family.update({ where: { id: p.familyId }, data: { paidUntil: p.paidUntil } }).catch(() => {})
  }

  // ── Задачи ──
  const tasks = [
    { title: 'Позвонить Поповым насчёт просрочки', type: 'call', bucket: 'today', dueDate: new Date('2026-07-13'), completed: false },
    { title: 'Обновить расписание на август', type: 'schedule', bucket: 'today', dueDate: new Date('2026-07-15'), completed: false },
    { title: 'Проверить журнал посещаемости', type: 'documents', bucket: 'today', dueDate: new Date('2026-07-14'), completed: false },
    { title: 'Согласовать ставку педагогам на новый месяц', type: 'finance', bucket: 'later', dueDate: new Date('2026-07-20'), completed: false },
    { title: 'Закупить канцелярию в кабинет 5', type: 'other', bucket: 'later', dueDate: null, completed: false },
    { title: 'Обсудить с Марией Ивановной успеваемость 6Б', type: 'meeting', bucket: 'today', dueDate: new Date('2026-07-13'), completed: false },
    { title: 'Добавить новый кружок по робототехнике', type: 'schedule', bucket: 'waiting', dueDate: null, completed: false },
    { title: 'Подготовить отчёт за июнь', type: 'documents', bucket: 'later', dueDate: new Date('2026-07-25'), completed: false },
    { title: 'Проверить оплату Новиковых', type: 'finance', bucket: 'today', dueDate: new Date('2026-07-13'), completed: false },
    { title: 'Записать Анну Васильеву на пробный урок английского', type: 'student', bucket: 'waiting', dueDate: new Date('2026-07-18'), completed: false },
    { title: 'Обновить информацию о кабинетах на сайте', type: 'other', bucket: 'later', dueDate: null, completed: false },
    { title: 'Собрать обратную связь от родителей', type: 'call', bucket: 'waiting', dueDate: new Date('2026-07-30'), completed: false },
    { title: '✓ Подготовить раздаточный материал', type: 'documents', bucket: 'today', dueDate: null, completed: true },
    { title: '✓ Отправить расписание на неделю', type: 'schedule', bucket: 'today', dueDate: null, completed: true },
  ]
  for (let i = 0; i < tasks.length; i++) {
    const tid = `task-${i}`
    const exists = await prisma.task.findUnique({ where: { id: tid } }).catch(() => null)
    if (exists) continue

    const t = tasks[i]
    await prisma.task.create({
      data: { id: tid, title: t.title, type: t.type, bucket: t.bucket, dueDate: t.dueDate, completed: t.completed, createdBy: admin.id },
    }).catch(() => {})
  }

  // ── Записи аудита ──
  const auditActions = [
    { userId: admin.id, action: 'create', entity: 'family', entityId: 'f-ivan', payloadJson: '{"name":"Ивановы"}' },
    { userId: admin.id, action: 'create', entity: 'payment', entityId: 'pay-0', payloadJson: '{"amount":10000}' },
    { userId: admin.id, action: 'update', entity: 'family', entityId: 'f-ivan', payloadJson: '{"paidUntil":"2026-07-15"}' },
  ]
  for (let i = 0; i < auditActions.length; i++) {
    const aid = `aud-${i}`
    await prisma.auditLog.upsert({ where: { id: aid }, update: {}, create: { id: aid, ...auditActions[i] } }).catch(() => {})
  }

  console.log('✅ Seed completed — 2 months of data')
  console.log('  Admin:    admin@elif.ru / admin123')
  console.log('  Manager:  manager@elif.ru / manager123')
  console.log('  Teacher:  teacher@elif.ru / teacher123')
  console.log('  Combined: anna@elif.ru / anna123')
  console.log(`  Groups: ${Object.keys(groups).length}, Lessons: ${createdLessons.length}, Students: ${students.length}`)
}

seed().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())

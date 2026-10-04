// ═══════════════════════════════════════════════════════════════════════
// Элиф — Комплексный интеграционный тест
// Запуск: node scripts/test.mjs
// Предусловие: npm run seed, затем npx next dev --webpack -p 3000
// ═══════════════════════════════════════════════════════════════════════

const BASE = 'http://localhost:3000'

let passed = 0
let failed = 0
const errors = []

function assert(condition, message) {
  if (condition) {
    passed++
    process.stdout.write('  ✅ ')
  } else {
    failed++
    errors.push(message)
    process.stdout.write('  ❌ ')
  }
  console.log(message)
}

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Cookie'] = `token=${token}`
  const opts = { method, headers }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data, headers: res.headers }
}

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) return null
  const data = await res.json()
  // Get the set-cookie header
  const cookie = res.headers.get('set-cookie') || ''
  const match = cookie.match(/token=([^;]+)/)
  return { token: match ? match[1] : data.token, user: data.user }
}

let TOKEN = null
let MANAGER_TOKEN = null
let ADMIN_TOKEN = null
let ANNA_TOKEN = null

const tests = []

// ═══════════════════════════════════════════════════════════════════════
// 1. AUTH
// ═══════════════════════════════════════════════════════════════════════
tests.push(async () => {
  console.log('\n═══ 1. Аутентификация ═══')

  // 1.1 Логин менеджера
  const m = await login('manager@elif.ru', 'manager123')
  assert(m !== null && m.token, '1.1 Успешный вход менеджера')
  MANAGER_TOKEN = m.token

  // 1.2 Логин педагога
  const t = await login('teacher@elif.ru', 'teacher123')
  assert(t !== null && t.token, '1.2 Успешный вход педагога')
  TOKEN = t.token

  // 1.3 Логин администратора
  const a = await login('admin@elif.ru', 'admin123')
  assert(a !== null && a.token, '1.3 Успешный вход администратора')
  ADMIN_TOKEN = a.token

  // 1.4 ANNA (manager+teacher)
  const an = await login('anna@elif.ru', 'anna123')
  assert(an !== null && an.token, '1.4 Успешный вход ANNA (manager+teacher)')
  ANNA_TOKEN = an.token

  // 1.5 Неверный пароль
  const bad = await login('teacher@elif.ru', 'wrongpass')
  assert(bad === null, '1.5 Неверный пароль → null')

  // 1.6 GET /api/auth/me
  const me = await api('GET', '/api/auth/me', null, TOKEN)
  assert(me.status === 200 && me.data.roles.includes('teacher'), '1.6 GET /api/auth/me возвращает роли')

  // 1.7 GET /api/auth/me без токена
  const me2 = await api('GET', '/api/auth/me')
  assert(me2.status === 401, '1.7 GET /api/auth/me без токена → 401')

  // 1.8 PUT /api/auth/role (роль из списка)
  const role = await api('PUT', '/api/auth/role', { role: 'manager' }, ANNA_TOKEN)
  assert(role.status === 200 && role.data.activeRole === 'manager', '1.8 PUT /api/auth/role успешен')

  // 1.9 PUT /api/auth/role (недоступная роль)
  const role2 = await api('PUT', '/api/auth/role', { role: 'admin' }, ANNA_TOKEN)
  assert(role2.status === 403, '1.9 PUT /api/auth/role с недоступной ролью → 403')

  // 1.10 POST /api/auth/logout
  const logout = await api('POST', '/api/auth/logout')
  assert(logout.status === 200, '1.10 POST /api/auth/logout')
})

// ═══════════════════════════════════════════════════════════════════════
// 2. RBAC
// ═══════════════════════════════════════════════════════════════════════
tests.push(async () => {
  console.log('\n═══ 2. Ролевая модель ═══')

  // 2.1 Педагог не может получить семьи
  const families = await api('GET', '/api/families', null, TOKEN)
  assert(families.status === 403, '2.1 Teacher GET /api/families → 403')

  // 2.2 Менеджер может получить семьи
  const families2 = await api('GET', '/api/families', null, MANAGER_TOKEN)
  assert(families2.status === 200, '2.2 Manager GET /api/families → 200')

  // 2.3 Педагог видит только свои уроки
  const lessons = await api('GET', '/api/lessons', null, TOKEN)
  assert(lessons.status === 200, '2.3 Teacher GET /api/lessons → 200')
  // All returned lessons should have the teacher's teacherId
  // (We'll validate the count is reasonable)

  // 2.4 Педагог не может создавать семьи
  const famCreate = await api('POST', '/api/families', { name: 'Test', phone: '+7' }, TOKEN)
  assert(famCreate.status === 403, '2.4 Teacher POST /api/families → 403')

  // 2.5 Админ может получить пользователей
  const users = await api('GET', '/api/admin/users', null, ADMIN_TOKEN)
  assert(users.status === 200 && Array.isArray(users.data), '2.5 Admin GET /api/admin/users → 200')

  // 2.6 Менеджер не может получить пользователей
  const users2 = await api('GET', '/api/admin/users', null, MANAGER_TOKEN)
  assert(users2.status === 403, '2.6 Manager GET /api/admin/users → 403')

  // 2.7 Менеджер не может получить задачи
  const tasks = await api('GET', '/api/tasks', null, TOKEN)
  assert(tasks.status === 403, '2.7 Teacher GET /api/tasks → 403')
})

// ═══════════════════════════════════════════════════════════════════════
// 3. Студенты
// ═══════════════════════════════════════════════════════════════════════
tests.push(async () => {
  console.log('\n═══ 3. Студенты ═══')

  // 3.1 Получить список студентов
  const students = await api('GET', '/api/students', null, MANAGER_TOKEN)
  assert(students.status === 200 && students.data.length > 0, '3.1 GET /api/students → список')
  const totalStudents = students.data.length

  // 3.2 Создать студента с существующей семьёй
  const families = await api('GET', '/api/families', null, MANAGER_TOKEN)
  const firstFamily = families.data[0]
  const newStudent = await api('POST', '/api/students', { firstName: 'Тест', lastName: 'Тестов', birthDate: '2015-01-01', familyId: firstFamily.id }, MANAGER_TOKEN)
  assert(newStudent.status === 201 && newStudent.data.id, '3.2 POST /api/students → создан')

  // 3.3 Получить детали студента
  const detail = await api('GET', `/api/students/${newStudent.data.id}`, null, MANAGER_TOKEN)
  assert(detail.status === 200 && detail.data.firstName === 'Тест', '3.3 GET /api/students/[id] → детали')

  // 3.4 Обновить студента
  const upd = await api('PUT', `/api/students/${newStudent.data.id}`, { firstName: 'Тест2' }, MANAGER_TOKEN)
  assert(upd.status === 200 && upd.data.firstName === 'Тест2', '3.4 PUT /api/students/[id] → обновлён')

  // 3.5 Мягкое удаление студента
  const del = await api('DELETE', `/api/students/${newStudent.data.id}`, null, MANAGER_TOKEN)
  assert(del.status === 200, '3.5 DELETE /api/students/[id] → удалён')

  // 3.6 Удалённый студент не возвращается в списке
  const students2 = await api('GET', '/api/students', null, MANAGER_TOKEN)
  assert(students2.data.length === totalStudents, '3.6 Список не содержит удалённого')

  // 3.7 Поиск
  const search = await api('GET', '/api/students?search=Иван', null, MANAGER_TOKEN)
  assert(search.status === 200 && search.data.length > 0, '3.7 Поиск по имени работает')
})

// ═══════════════════════════════════════════════════════════════════════
// 4. Семьи
// ═══════════════════════════════════════════════════════════════════════
tests.push(async () => {
  console.log('\n═══ 4. Семьи ═══')

  // 4.1 Список семей
  const families = await api('GET', '/api/families', null, MANAGER_TOKEN)
  assert(families.status === 200 && families.data.length >= 7, '4.1 GET /api/families → 7+ семей')

  // 4.2 Создать семью
  const fam = await api('POST', '/api/families', { name: 'Тестовые', phone: '+79999999999', monthlyFee: 5000 }, MANAGER_TOKEN)
  assert(fam.status === 201 && fam.data.id, '4.2 POST /api/families → создана')

  // 4.3 Получить детали семьи
  const detail = await api('GET', `/api/families/${fam.data.id}`, null, MANAGER_TOKEN)
  assert(detail.status === 200 && detail.data.name === 'Тестовые', '4.3 GET /api/families/[id] → детали')

  // 4.4 Обновить семью
  const upd = await api('PUT', `/api/families/${fam.data.id}`, { phone: '+78888888888' }, MANAGER_TOKEN)
  assert(upd.status === 200, '4.4 PUT /api/families/[id] → обновлена')

  // 4.5 Платежи
  const pay = await api('POST', '/api/payments', { familyId: fam.data.id, amount: 5000, date: new Date().toISOString().split('T')[0], paidUntil: new Date(Date.now() + 30*86400000).toISOString().split('T')[0] }, MANAGER_TOKEN)
  assert(pay.status === 201, '4.5 POST /api/payments → создан')

  // 4.6 Удалить семью
  const del = await api('DELETE', `/api/families/${fam.data.id}`, null, MANAGER_TOKEN)
  assert(del.status === 200, '4.6 DELETE /api/families/[id] → удалена')
})

// ═══════════════════════════════════════════════════════════════════════
// 5. Группы и зачисления
// ═══════════════════════════════════════════════════════════════════════
tests.push(async () => {
  console.log('\n═══ 5. Группы и зачисления ═══')

  // 5.1 Список групп
  const groups = await api('GET', '/api/groups', null, MANAGER_TOKEN)
  assert(groups.status === 200 && groups.data.length >= 4, '5.1 GET /api/groups → 4+ группы')

  const firstGroup = groups.data[0]

  // 5.2 Детали группы
  const detail = await api('GET', `/api/groups/${firstGroup.id}`, null, MANAGER_TOKEN)
  assert(detail.status === 200 && detail.data.enrollments, '5.2 GET /api/groups/[id] → детали')

  // 5.3 Создать группу
  const teachers = await api('GET', '/api/teachers', null, MANAGER_TOKEN)
  const rooms = await api('GET', '/api/rooms', null, MANAGER_TOKEN)
  const newGroup = await api('POST', '/api/groups', { name: 'Тестовая группа', subject: 'Тест', teacherId: teachers.data[0].id, roomId: rooms.data[0].id, capacity: 10 }, MANAGER_TOKEN)
  assert(newGroup.status === 201, '5.3 POST /api/groups → создана')

  // 5.4 Зачислить студента
  const students = await api('GET', '/api/students', null, MANAGER_TOKEN)
  const enroll = await api('POST', '/api/enrollments', { studentId: students.data[0].id, groupId: newGroup.data.id }, MANAGER_TOKEN)
  assert(enroll.status === 201, '5.4 POST /api/enrollments → зачислен')

  // 5.5 Повторное зачисление → 409
  const enroll2 = await api('POST', '/api/enrollments', { studentId: students.data[0].id, groupId: newGroup.data.id }, MANAGER_TOKEN)
  assert(enroll2.status === 409, '5.5 Повторное зачисление → 409')

  // 5.6 Отчислить
  const unenroll = await api('PUT', '/api/enrollments', { id: enroll.data.id }, MANAGER_TOKEN)
  assert(unenroll.status === 200, '5.6 PUT /api/enrollments → отчислен')
})

// ═══════════════════════════════════════════════════════════════════════
// 6. Педагоги
// ═══════════════════════════════════════════════════════════════════════
tests.push(async () => {
  console.log('\n═══ 6. Педагоги ═══')

  // 6.1 Список педагогов
  const teachers = await api('GET', '/api/teachers', null, MANAGER_TOKEN)
  assert(teachers.status === 200 && teachers.data.length >= 2, '6.1 GET /api/teachers → 2+ педагога')

  // 6.2 Создать педагога (уникальный email)
  const ts = Date.now()
  const teacherEmail = `test-teacher-${ts}@elif.ru`
  const newTeacher = await api('POST', '/api/teachers', { fullName: 'Тестов Тест', specialization: 'Тест', phone: '+77777777777', email: teacherEmail, password: 'test123' }, MANAGER_TOKEN)
  assert(newTeacher.status === 201, '6.2 POST /api/teachers → создан')

  // 6.3 Дубликат email
  const dup = await api('POST', '/api/teachers', { fullName: 'Дубль', specialization: 'Тест', phone: '+7', email: teacherEmail, password: 'test123' }, MANAGER_TOKEN)
  assert(dup.status === 400, '6.3 POST /api/teachers с существующим email → 400')

  // 6.4 Нет userId и нет email
  const noEmail = await api('POST', '/api/teachers', { fullName: 'Ошибка', specialization: 'Тест', phone: '+7' }, MANAGER_TOKEN)
  assert(noEmail.status === 400, '6.4 POST /api/teachers без email → 400')

  // 6.5 Обновить педагога
  const upd = await api('PUT', `/api/teachers/${newTeacher.data.id}`, { fullName: 'Обновлён Тест' }, MANAGER_TOKEN)
  assert(upd.status === 200, '6.5 PUT /api/teachers/[id] → обновлён')

  // 6.6 Удалить педагога
  const del = await api('DELETE', `/api/teachers/${newTeacher.data.id}`, null, MANAGER_TOKEN)
  assert(del.status === 200, '6.6 DELETE /api/teachers/[id] → удалён')
})

// ═══════════════════════════════════════════════════════════════════════
// 7. Занятия и посещаемость
// ═══════════════════════════════════════════════════════════════════════
tests.push(async () => {
  console.log('\n═══ 7. Занятия и посещаемость ═══')

  // 7.1 Получить занятия по дате
  const today = new Date().toISOString().split('T')[0]
  const lessons = await api('GET', `/api/lessons?date=${today}`, null, MANAGER_TOKEN)
  assert(lessons.status === 200, '7.1 GET /api/lessons?date= → список')

  // 7.2 Детали занятия
  if (lessons.data.length > 0) {
    const detail = await api('GET', `/api/lessons/${lessons.data[0].id}`, null, MANAGER_TOKEN)
    assert(detail.status === 200, '7.2 GET /api/lessons/[id] → детали')

    // 7.3 Отметить посещаемость
    const students = await api('GET', '/api/students', null, TOKEN)
    if (students.data.length > 0) {
      const att = await api('PUT', '/api/attendance/batch', { lessonId: lessons.data[0].id, attendance: [{ studentId: students.data[0].id, status: 'present', mark: '5' }] }, TOKEN)
      assert(att.status === 200, '7.3 PUT /api/attendance/batch → отмечено')

      // 7.4 Обновить занятие (тема, дз)
      const upd = await api('PUT', `/api/lessons/${lessons.data[0].id}`, { topic: 'Тестовая тема', homework: 'Тестовое ДЗ' }, TOKEN)
      assert(upd.status === 200, '7.4 PUT /api/lessons/[id] → обновлено')
    }
  }

  // 7.5 Создать занятие
  const groups = await api('GET', '/api/groups', null, MANAGER_TOKEN)
  const teachers = await api('GET', '/api/teachers', null, MANAGER_TOKEN)
  const rooms = await api('GET', '/api/rooms', null, MANAGER_TOKEN)
  if (groups.data.length > 0) {
    const newLesson = await api('POST', '/api/lessons', { groupId: groups.data[0].id, teacherId: teachers.data[0].id, roomId: rooms.data[0].id, dateTime: new Date().toISOString() }, MANAGER_TOKEN)
    assert(newLesson.status === 201, '7.5 POST /api/lessons → создано')
  }
})

// ═══════════════════════════════════════════════════════════════════════
// 8. Наблюдения
// ═══════════════════════════════════════════════════════════════════════
tests.push(async () => {
  console.log('\n═══ 8. Наблюдения ═══')

  // 8.1 Список наблюдений
  const obs = await api('GET', '/api/observations', null, TOKEN)
  assert(obs.status === 200, '8.1 GET /api/observations → список')

  // 8.2 Создать наблюдение
  const students = await api('GET', '/api/students', null, TOKEN)
  const lessons = await api('GET', '/api/lessons', null, TOKEN)
  if (students.data.length > 0 && lessons.data.length > 0) {
    const newObs = await api('POST', '/api/observations', { studentId: students.data[0].id, lessonId: lessons.data[0].id, text: 'Тестовое наблюдение' }, TOKEN)
    assert(newObs.status === 201 && newObs.data.id, '8.2 POST /api/observations → создано')

    // 8.3 Прочитать наблюдение
    const detail = await api('GET', `/api/observations/${newObs.data.id}`, null, TOKEN)
    assert(detail.status === 200 && detail.data.text === 'Тестовое наблюдение', '8.3 GET /api/observations/[id] → детали')

    // 8.4 Обновить наблюдение
    const upd = await api('PUT', `/api/observations/${newObs.data.id}`, { text: 'Обновлённое наблюдение' }, TOKEN)
    assert(upd.status === 200 && upd.data.text === 'Обновлённое наблюдение', '8.4 PUT /api/observations/[id] → обновлено')

    // 8.5 Опубликовать наблюдение
    const pub = await api('PUT', `/api/observations/${newObs.data.id}`, { status: 'published' }, TOKEN)
    assert(pub.status === 200 && pub.data.status === 'published', '8.5 PUT /api/observations/[id] status=published')

    // 8.6 Удалить наблюдение
    const del = await api('DELETE', `/api/observations/${newObs.data.id}`, null, TOKEN)
    assert(del.status === 200, '8.6 DELETE /api/observations/[id] → удалено')
  }
})

// ═══════════════════════════════════════════════════════════════════════
// 9. Задачи
// ═══════════════════════════════════════════════════════════════════════
tests.push(async () => {
  console.log('\n═══ 9. Задачи ═══')

  // 9.1 Список задач
  const tasks = await api('GET', '/api/tasks', null, MANAGER_TOKEN)
  assert(tasks.status === 200, '9.1 GET /api/tasks → список')

  // 9.2 Создать задачу
  const newTask = await api('POST', '/api/tasks', { title: 'Тестовая задача', type: 'call', bucket: 'today' }, MANAGER_TOKEN)
  assert(newTask.status === 201 && newTask.data.id, '9.2 POST /api/tasks → создана')

  // 9.3 Обновить задачу
  const upd = await api('PUT', `/api/tasks/${newTask.data.id}`, { completed: true }, MANAGER_TOKEN)
  assert(upd.status === 200 && upd.data.completed === true, '9.3 PUT /api/tasks/[id] → выполнена')

  // 9.4 Фильтр по bucket
  const filtered = await api('GET', '/api/tasks?bucket=today', null, MANAGER_TOKEN)
  assert(filtered.status === 200 && Array.isArray(filtered.data), '9.4 GET /api/tasks?bucket=today')

  // 9.5 Удалить задачу
  const del = await api('DELETE', `/api/tasks/${newTask.data.id}`, null, MANAGER_TOKEN)
  assert(del.status === 200, '9.5 DELETE /api/tasks/[id] → удалена')
})

// ═══════════════════════════════════════════════════════════════════════
// 10. Алерты
// ═══════════════════════════════════════════════════════════════════════
tests.push(async () => {
  console.log('\n═══ 10. Алерты ═══')

  // 10.1 GET /api/alerts
  const alerts = await api('GET', '/api/alerts', null, MANAGER_TOKEN)
  assert(alerts.status === 200 && Array.isArray(alerts.data), '10.1 GET /api/alerts → массив')

  // 10.2 Педагог не может получить алерты
  const alerts2 = await api('GET', '/api/alerts', null, TOKEN)
  assert(alerts2.status === 403, '10.2 Teacher GET /api/alerts → 403')

  // 10.3 Алерт по просрочке оплаты (если есть)
  const paymentAlerts = alerts.data.filter(a => a.type === 'payment_overdue')
  // There should be at least one overdue family from seed data
  // This is a soft check
  console.log('     Alerts: ' + alerts.data.length + ' (overdue: ' + paymentAlerts.length + ')')
})

// ═══════════════════════════════════════════════════════════════════════
// 11. DATA INTEGRITY
// ═══════════════════════════════════════════════════════════════════════
tests.push(async () => {
  console.log('\n═══ 11. Целостность данных ═══')

  // 11.1 У всех студентов есть familyId
  const students = await api('GET', '/api/students', null, MANAGER_TOKEN)
  const allHaveFamily = students.data.every(s => s.family && s.family.id)
  assert(allHaveFamily, '11.1 Все студенты имеют family')

  // 11.2 Все enrollment ссылаются на существующие группы
  const groups = await api('GET', '/api/groups', null, MANAGER_TOKEN)
  if (groups.data.length > 0) {
    for (const g of groups.data) {
      const detail = await api('GET', `/api/groups/${g.id}`, null, MANAGER_TOKEN)
      if (detail.data.enrollments) {
        for (const e of detail.data.enrollments) {
          assert(e.student && e.student.id, '11.2 Enrollment ' + e.id + ' has student')
        }
      }
    }
  }

  // 11.3 У всех занятий есть teacher, group, room
  const lessons = await api('GET', '/api/lessons', null, MANAGER_TOKEN)
  for (const l of lessons.data.slice(0, 5)) {
    assert(l.teacher && l.group && l.room, '11.3 Lesson ' + l.id + ' has teacher/group/room')
  }

  // 11.4 Нет дублирующихся email
  const users = await api('GET', '/api/admin/users', null, ADMIN_TOKEN)
  const emails = users.data.map(u => u.email)
  const uniqueEmails = new Set(emails)
  assert(emails.length === uniqueEmails.size, '11.4 Нет дублирующихся email')
})

// ═══════════════════════════════════════════════════════════════════════
// 12. РАСШИРЕННЫЕ ТЕСТЫ
// ═══════════════════════════════════════════════════════════════════════
tests.push(async () => {
  console.log('\n═══ 12. Расширенные тесты ═══')

  // 12.1 Создание комнаты
  const room = await api('POST', '/api/rooms', { name: 'Тестовый кабинет', capacity: 10, address: 'Тест' }, MANAGER_TOKEN)
  assert(room.status === 201, '12.1 POST /api/rooms → создан')

  // 12.2 Обновление комнаты
  const upd = await api('PUT', `/api/rooms/${room.data.id}`, { name: 'Обновлённый кабинет' }, MANAGER_TOKEN)
  assert(upd.status === 200, '12.2 PUT /api/rooms → обновлён')

  // 12.3 Удаление комнаты
  const del = await api('DELETE', `/api/rooms/${room.data.id}`, null, MANAGER_TOKEN)
  assert(del.status === 200, '12.3 DELETE /api/rooms → удалён')

  // 12.4 Создание слота расписания
  const groups = await api('GET', '/api/groups', null, MANAGER_TOKEN)
  const rooms = await api('GET', '/api/rooms', null, MANAGER_TOKEN)
  if (groups.data.length > 0 && rooms.data.length > 0) {
    const slot = await api('POST', '/api/schedule-slots', { groupId: groups.data[0].id, dayOfWeek: 1, timeStart: '18:00', durationMinutes: 90, roomId: rooms.data[0].id }, MANAGER_TOKEN)
    assert(slot.status === 201, '12.4 POST /api/schedule-slots → создан')
  }

  // 12.5 Генерация занятий
  const gen = await api('POST', '/api/lessons/generate', null, MANAGER_TOKEN)
  assert(gen.status === 200, '12.5 POST /api/lessons/generate')

  // 12.6 Audit log
  const audit = await api('GET', '/api/admin/audit-log', null, ADMIN_TOKEN)
  assert(audit.status === 200 && Array.isArray(audit.data), '12.6 GET /api/admin/audit-log')

  // 12.7 Backup download
  const backup = await api('GET', '/api/admin/backup/download', null, ADMIN_TOKEN)
  assert(backup.status === 200, '12.7 GET /api/admin/backup/download')

  // 12.8 Excel export (admin)
  const xlsx = await api('GET', '/api/admin/backup/export-xlsx', null, ADMIN_TOKEN)
  assert(xlsx.status === 200, '12.8 GET /api/admin/backup/export-xlsx (admin) → 200')

  // 12.9 Excel export (manager → 403)
  const xlsx2 = await api('GET', '/api/admin/backup/export-xlsx', null, MANAGER_TOKEN)
  assert(xlsx2.status === 403, '12.9 GET /api/admin/backup/export-xlsx (manager) → 403')
})

// ═══════════════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════════════
async function main() {
  console.log('Элиф — Интеграционный тест')
  console.log('='.repeat(50))

  for (const test of tests) {
    try {
      await test()
    } catch (e) {
      failed++
      errors.push(`Unhandled error: ${e.message}`)
      console.log(`  💥 Unhandled: ${e.message}`)
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed, ' + (passed + failed) + ' total')
  if (errors.length > 0) {
    console.log('\nОшибки:')
    errors.forEach(e => console.log(`  ❌ ${e}`))
  }
  process.exit(failed > 0 ? 1 : 0)
}

main()

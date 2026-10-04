import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuthUserFromCookie, forbidden, requireRole } from '@/lib/api-middleware'
import { rateLimit } from '@/lib/rate-limit'
import * as XLSX from 'xlsx'

const DAY_NAMES = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export async function GET(request: NextRequest) {
  const user = await getAuthUserFromCookie(request)
  if (!user || !requireRole(user, ['admin'])) return forbidden()

  // Limit exports to 1 per 5 minutes per user
  const limitKey = 'export:' + user.userId
  const limit = rateLimit(limitKey, 1, 5 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Экспорт доступен раз в 5 минут' }, { status: 429 })
  }

  try {
    const [
      users, teachers, students, families, payments,
      groups, enrollments, scheduleSlots, lessons, attendances,
      observations, rooms, tasks, auditLogs, subjects,
    ] = await Promise.all([
      prisma.user.findMany({ include: { teacher: { select: { fullName: true } } } }),
      prisma.teacher.findMany(),
      prisma.student.findMany({ include: { family: { select: { name: true } } } }),
      prisma.family.findMany(),
      prisma.payment.findMany(),
      prisma.group.findMany({ include: { teacher: { select: { fullName: true } }, room: { select: { name: true } } } }),
      prisma.enrollment.findMany({ include: { student: { select: { firstName: true, lastName: true } }, group: { select: { name: true } } } }),
      prisma.scheduleSlot.findMany({ include: { group: { select: { name: true } }, room: { select: { name: true } } } }),
      prisma.lesson.findMany({ include: { group: { select: { name: true } }, teacher: { select: { fullName: true } }, room: { select: { name: true } } } }),
      prisma.attendance.findMany({ include: { student: { select: { firstName: true, lastName: true } }, lesson: { select: { dateTime: true } } } }),
      prisma.observation.findMany({ include: { student: { select: { firstName: true, lastName: true } }, teacher: { select: { fullName: true } } } }),
      prisma.room.findMany(),
      prisma.task.findMany({ include: { user: { select: { email: true } } } }),
      prisma.auditLog.findMany({ include: { user: { select: { email: true } } } }),
      prisma.subject.findMany(),
    ])

    const wb = XLSX.utils.book_new()

    const addSheet = (data: Record<string, unknown>[], name: string) => {
      const ws = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, name)
    }

    addSheet(users.map((u) => ({
      ID: u.id,
      Email: u.email,
      Роли: u.roles,
      Статус: u.status,
      Педагог: u.teacher?.fullName || '',
      Удалён: u.deletedAt ? 'да' : 'нет',
      Создан: u.createdAt.toISOString(),
    })), 'Пользователи')

    addSheet(teachers.map((t) => ({
      ID: t.id,
      'Полное имя': t.fullName,
      Специализация: t.specialization,
      Телефон: t.phone,
      Статус: t.status,
      Удалён: t.deletedAt ? 'да' : 'нет',
      Создан: t.createdAt.toISOString(),
    })), 'Педагоги')

    addSheet(students.map((s) => ({
      ID: s.id,
      Имя: s.firstName,
      Фамилия: s.lastName,
      'Дата рождения': s.birthDate ? s.birthDate.toISOString().split('T')[0] : '',
      Семья: s.family?.name || '',
      Статус: s.status,
      Удалён: s.deletedAt ? 'да' : 'нет',
      Создан: s.createdAt.toISOString(),
    })), 'Ученики')

    addSheet(families.map((f) => ({
      ID: f.id,
      Название: f.name,
      Телефон: f.phone,
      Email: f.email || '',
      Telegram: f.telegram || '',
      'Месячная плата': f.monthlyFee,
      'Оплачено до': f.paidUntil ? f.paidUntil.toISOString().split('T')[0] : '',
      Комментарий: f.comment || '',
      Удалена: f.deletedAt ? 'да' : 'нет',
      Создана: f.createdAt.toISOString(),
    })), 'Семьи')

    addSheet(payments.map((p) => ({
      ID: p.id,
      'ID семьи': p.familyId,
      Сумма: p.amount,
      Дата: p.date.toISOString().split('T')[0],
      Комментарий: p.comment || '',
      Создан: p.createdAt.toISOString(),
    })), 'Платежи')

    addSheet(groups.map((g) => ({
      ID: g.id,
      Название: g.name,
      Предмет: g.subject,
      Педагог: g.teacher.fullName,
      Кабинет: g.room.name,
      Вместимость: g.capacity,
      Статус: g.status,
      Удалена: g.deletedAt ? 'да' : 'нет',
      Создана: g.createdAt.toISOString(),
    })), 'Группы')

    addSheet(enrollments.map((e) => ({
      ID: e.id,
      Ученик: `${e.student.lastName} ${e.student.firstName}`,
      Группа: e.group.name,
      'Дата начала': e.startDate.toISOString().split('T')[0],
      'Дата окончания': e.endDate ? e.endDate.toISOString().split('T')[0] : '',
      Статус: e.status,
      Создан: e.createdAt.toISOString(),
    })), 'Зачисления')

    addSheet(scheduleSlots.map((s) => ({
      ID: s.id,
      Группа: s.group.name,
      'День недели': DAY_NAMES[s.dayOfWeek] || String(s.dayOfWeek),
      Время: s.timeStart,
      Длительность: `${s.durationMinutes} min`,
      Кабинет: s.room.name,
      Создан: s.createdAt.toISOString(),
    })), 'Расписание')

    addSheet(lessons.map((l) => ({
      ID: l.id,
      Группа: l.group.name,
      Педагог: l.teacher.fullName,
      Кабинет: l.room.name,
      'Дата и время': l.dateTime.toISOString(),
      Статус: l.status,
      Тема: l.topic || '',
      'Домашнее задание': l.homework || '',
      'Заметка к уроку': l.lessonNote || '',
      Гипотеза: l.hypothesis || '',
      'Личная заметка': l.personalNote || '',
      Создан: l.createdAt.toISOString(),
    })), 'Занятия')

    addSheet(attendances.map((a) => ({
      ID: a.id,
      Ученик: `${a.student.lastName} ${a.student.firstName}`,
      'Дата занятия': a.lesson.dateTime.toISOString().split('T')[0],
      Статус: a.status === 'present' ? 'Был' : a.status === 'absent' ? 'Не был' : 'Опоздал',
      Оценка: a.mark || '',
      Создан: a.createdAt.toISOString(),
    })), 'Посещаемость')

    addSheet(observations.map((o) => ({
      ID: o.id,
      Ученик: `${o.student.lastName} ${o.student.firstName}`,
      Педагог: o.teacher.fullName,
      Текст: o.text,
      Статус: o.status === 'published' ? 'Опубликовано' : o.status === 'draft' ? 'Черновик' : 'Архив',
      Создан: o.createdAt.toISOString(),
      Обновлён: o.updatedAt.toISOString(),
    })), 'Наблюдения')

    addSheet(rooms.map((r) => ({
      ID: r.id,
      Название: r.name,
      Адрес: r.address || '',
      Вместимость: r.capacity,
      Оборудование: r.equipment || '',
      Удалён: r.deletedAt ? 'да' : 'нет',
      Создан: r.createdAt.toISOString(),
    })), 'Кабинеты')

    addSheet(tasks.map((t) => ({
      ID: t.id,
      Заголовок: t.title,
      Тип: t.type,
      Корзина: t.bucket,
      'Дата выполнения': t.dueDate ? t.dueDate.toISOString().split('T')[0] : '',
      Выполнена: t.completed ? 'да' : 'нет',
      'ID семьи': t.familyId || '',
      'ID ученика': t.studentId || '',
      Создатель: t.user.email,
      Создана: t.createdAt.toISOString(),
    })), 'Задачи')

    addSheet(auditLogs.map((a) => ({
      ID: a.id,
      Пользователь: a.user.email,
      Действие: a.action,
      Сущность: a.entity,
      'ID сущности': a.entityId,
      Данные: a.payloadJson || '',
      Создан: a.createdAt.toISOString(),
    })), 'Журнал аудита')

    addSheet(subjects.map((s) => ({
      ID: s.id,
      Название: s.name,
    })), 'Предметы')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="elif-export-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (e) {
    console.error('Excel export failed:', e)
    return NextResponse.json({ error: 'Ошибка при экспорте' }, { status: 500 })
  }
}

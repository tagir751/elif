import { z } from 'zod'
import { NextResponse } from 'next/server'

export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return 'Пароль должен быть не менее 8 символов'
  }
  return null
}

export function validateOrError<T>(schema: z.ZodSchema<T>, data: unknown): { data?: T; error?: NextResponse } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const firstError = result.error.issues[0]
    return { error: NextResponse.json({ error: firstError.message }, { status: 400 }) }
  }
  return { data: result.data }
}

// Auth
export const loginSchema = z.object({
  email: z.string().min(1, 'Введите логин'),
  password: z.string().min(1, 'Пароль обязателен'),
})

// Users
export const userCreateSchema = z.object({
  email: z.string().min(1, 'Введите логин'),
  password: z.string().min(1, 'Пароль обязателен'),
  roles: z.array(z.string()).optional(),
  teacherName: z.string().optional(),
  specialization: z.string().optional(),
  phone: z.string().optional(),
})

export const userUpdateSchema = z.object({
  email: z.string().min(1, 'Введите логин').optional(),
  status: z.string().optional(),
  roles: z.array(z.string()).optional(),
  password: z.string().optional(),
})

// Students
export const studentSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  birthDate: z.string().optional(),
  familyId: z.string().min(1, 'Семья обязательна'),
})

export const studentUpdateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  birthDate: z.string().optional(),
  familyId: z.string().optional(),
  phone: z.string().optional(),
  status: z.string().optional(),
})

// Families
export const familySchema = z.object({
  name: z.string().min(1, 'Название семьи обязательно'),
  phone: z.string().min(1, 'Телефон обязателен'),
  email: z.string().optional().nullable(),
  telegram: z.string().optional().nullable(),
  monthlyFee: z.number().int().optional(),
  paidUntil: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
})

export const familyUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().optional().nullable(),
  telegram: z.string().optional().nullable(),
  monthlyFee: z.number().int().optional(),
  paidUntil: z.string().optional().nullable(),
  comment: z.string().optional().nullable(),
})

// Groups
export const groupSchema = z.object({
  name: z.string().min(1, 'Название группы обязательно'),
  subject: z.string().min(1, 'Предмет обязателен'),
  teacherId: z.string().min(1, 'Педагог обязателен'),
  roomId: z.string().min(1, 'Кабинет обязателен'),
  capacity: z.number().int().optional(),
})

export const groupUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  teacherId: z.string().optional(),
  roomId: z.string().optional(),
  capacity: z.number().int().optional(),
  status: z.string().optional(),
})

// Lessons
export const lessonSchema = z.object({
  groupId: z.string().min(1, 'Группа обязательна'),
  teacherId: z.string().min(1, 'Педагог обязателен'),
  roomId: z.string().min(1, 'Кабинет обязателен'),
  dateTime: z.string().min(1, 'Дата и время обязательны'),
})

export const lessonUpdateSchema = z.object({
  status: z.string().optional(),
  topic: z.string().optional().nullable(),
  homework: z.string().optional().nullable(),
  lessonNote: z.string().optional().nullable(),
  hypothesis: z.string().optional().nullable(),
  personalNote: z.string().optional().nullable(),
  teacherId: z.string().optional(),
  roomId: z.string().optional(),
})

// Observations
export const observationSchema = z.object({
  studentId: z.string().min(1, 'Ученик обязателен'),
  lessonId: z.string().min(1, 'Урок обязателен'),
  teacherId: z.string().optional(),
  text: z.string().min(1, 'Текст наблюдения обязателен'),
  status: z.string().optional(),
})

export const observationUpdateSchema = z.object({
  text: z.string().min(1).optional(),
  status: z.string().optional(),
})

// Payments
export const paymentSchema = z.object({
  familyId: z.string().min(1, 'Семья обязательна'),
  amount: z.number().int('Сумма должна быть числом'),
  date: z.string().min(1, 'Дата обязательна'),
  comment: z.string().optional().nullable(),
  paidUntil: z.string().optional().nullable(),
})

// Tasks
export const taskSchema = z.object({
  title: z.string().min(1, 'Название задачи обязательно'),
  type: z.string().optional(),
  bucket: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  familyId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
})

export const taskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  type: z.string().optional(),
  bucket: z.string().optional(),
  dueDate: z.string().optional().nullable(),
  completed: z.boolean().optional(),
  familyId: z.string().optional().nullable(),
  studentId: z.string().optional().nullable(),
})

// Rooms
export const roomSchema = z.object({
  name: z.string().min(1, 'Название кабинета обязательно'),
  address: z.string().optional().nullable(),
  capacity: z.number().int().optional(),
  equipment: z.string().optional().nullable(),
})

export const roomUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional().nullable(),
  capacity: z.number().int().optional(),
  equipment: z.string().optional().nullable(),
})

// Teachers
export const teacherCreateSchema = z.object({
  userId: z.string().optional(),
  email: z.string().optional(),
  password: z.string().optional(),
  fullName: z.string().min(1, 'Имя педагога обязательно'),
  specialization: z.string().min(1, 'Специализация обязательна'),
  phone: z.string().optional(),
})

export const teacherUpdateSchema = z.object({
  fullName: z.string().min(1).optional(),
  specialization: z.string().min(1).optional(),
  phone: z.string().optional(),
})

// Enrollments
export const enrollmentSchema = z.object({
  studentId: z.string().min(1, 'Ученик обязателен'),
  groupId: z.string().min(1, 'Группа обязательна'),
})

// Schedule slots
export const scheduleSlotSchema = z.object({
  groupId: z.string().min(1, 'Группа обязательна'),
  dayOfWeek: z.number().int().min(1).max(7, 'День недели от 1 до 7'),
  timeStart: z.string().min(1, 'Время начала обязательно'),
  durationMinutes: z.number().int().optional(),
  roomId: z.string().min(1, 'Кабинет обязателен'),
})

// Attendance batch
export const attendanceBatchSchema = z.object({
  lessonId: z.string().min(1, 'Урок обязателен'),
  attendance: z.array(
    z.object({
      studentId: z.string().min(1),
      status: z.enum(['present', 'absent', 'late']),
      mark: z.string().optional().nullable(),
    })
  ).min(1, 'Нужен хотя бы один ученик'),
})

// Subjects
export const subjectSchema = z.object({
  name: z.string().min(1, 'Название предмета обязательно'),
})

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, EmptyState } from '@/components/ui'
import { formatDate } from '@/lib/utils'

interface Alert {
  type: 'danger' | 'warning'
  icon: string
  text: string
  link?: string
}

interface TodayLesson {
  id: string
  dateTime: string
  group: { name: string }
  teacher: { fullName: string }
  room: { name: string }
  status: string
}

interface Birthday {
  id: string
  firstName: string
  lastName: string
  birthDate: string
  familyName: string
  age: number
}

export default function ManagerTodayPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [lessons, setLessons] = useState<TodayLesson[]>([])
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [userName, setUserName] = useState('')
  const router = useRouter()

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]

    // Fetch user info
    globalThis.fetch('/api/auth/me')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setUserName(data.email.split('@')[0])
      })

    // Fetch today's lessons
    globalThis.fetch(`/api/lessons?date=${today}`)
      .then((r) => r.ok ? r.json() : [])
      .then(setLessons)

    // Fetch birthdays
    globalThis.fetch('/api/students/birthdays?days=14')
      .then((r) => r.ok ? r.json() : [])
      .then(setBirthdays)

    // Generate alerts
    generateAlerts()
  }, [])

  const generateAlerts = async () => {
    const result: Alert[] = []

    // Check families with overdue payment
    const familiesRes = await globalThis.fetch('/api/families')
    if (familiesRes.ok) {
      const families = await familiesRes.json()
      const today = new Date()

      families.forEach((f: { id: string; name: string; paidUntil: string | null; monthlyFee: number }) => {
        if (!f.paidUntil) return
        const paidUntil = new Date(f.paidUntil)
        const diffDays = Math.ceil((paidUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) {
          result.push({
            type: 'danger',
            icon: '🔴',
            text: 'Просрочка оплаты: ' + f.name,
            link: `/manager/families/${f.id}`,
          })
        } else if (diffDays <= 7) {
          result.push({
            type: 'warning',
            icon: '🟡',
            text: 'Оплата заканчивается: ' + f.name + ' (осталось ' + diffDays + ' дн.)',
            link: `/manager/families/${f.id}`,
          })
        }
      })
    }

    setAlerts(result.slice(0, 10))
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-1">{greeting}{userName ? `, ${userName}` : ''}</h1>
      <p className="text-text-secondary mb-6">
        {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
      </p>

      {alerts.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-1">⚠️ Требуют внимания</h2>
          <div className="flex flex-col gap-2">
            {alerts.map((a, i) => (
              <Card key={i} onClick={() => a.link && router.push(a.link)} className={a.type === 'danger' ? 'border-l-[5px] border-red' : 'border-l-[5px] border-orange'}>
                <p className="text-[15px] flex items-center gap-2"><span>{a.icon}</span>{a.text}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {birthdays.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-1">🎂 Дни рождения</h2>
          <div className="flex flex-col gap-2">
            {birthdays.map((b) => {
              const d = new Date(b.birthDate)
              const dayMonth = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
              return (
                <Card key={b.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-[15px]">{b.lastName} {b.firstName}</p>
                      <p className="text-text-secondary text-[13px]">{dayMonth}</p>
                    </div>
                    <span className="text-blue font-semibold text-[15px]">{b.age} лет</span>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      <h2 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-1">📅 Занятия сегодня</h2>
      {lessons.length === 0 ? (
        <Card>
          <p className="text-text-secondary text-[15px]">Всё в порядке 🎉</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {lessons.map((l) => (
            <Card key={l.id} className={`border-l-[5px] ${l.status === 'completed' ? 'border-green' : 'border-blue'}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-[16px]">{l.group.name}</p>
                <span className="text-sm text-text-secondary">
                  {new Date(l.dateTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-text-secondary text-[14px]">
                👩‍🏫 {l.teacher.fullName} • 🚪 {l.room.name}
              </p>
              {l.status === 'completed' && (
                <span className="text-green font-medium text-[13px] mt-1 inline-flex items-center gap-1">✅ Проведено</span>
              )}
              {l.status === 'planned' && (
                <span className="text-orange font-medium text-[13px] mt-1 inline-flex items-center gap-1">⏳ Запланировано</span>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

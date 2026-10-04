'use client'

import { useEffect, useState } from 'react'
import { Card, Chip, EmptyState, Button } from '@/components/ui'
import { formatDate, formatTime } from '@/lib/utils'

interface Lesson {
  id: string
  dateTime: string
  status: string
  group: { name: string }
  teacher: { fullName: string }
  room: { name: string }
  _count: { attendances: number }
}

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [generating, setGenerating] = useState(false)
  const [generateMsg, setGenerateMsg] = useState('')

  const fetch = async () => {
    const res = await globalThis.fetch(`/api/lessons?date=${date}`)
    if (res.ok) setLessons(await res.json())
  }

  useEffect(() => { fetch() }, [date])

  const changeDay = (offset: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + offset)
    setDate(d.toISOString().split('T')[0])
  }

  const generateAll = async () => {
    setGenerating(true)
    setGenerateMsg('')
    const res = await globalThis.fetch('/api/lessons/generate', { method: 'POST' })
    if (res.ok) {
      const data = await res.json()
      setGenerateMsg('✅ Создано ' + data.created + ' занятий')
      fetch()
    } else {
      setGenerateMsg('❌ Ошибка генерации')
    }
    setGenerating(false)
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Занятия</h1>
        <Button onClick={generateAll} disabled={generating}>
          {generating ? 'Генерация...' : '🔄 Сгенерировать все'}
        </Button>
      </div>
      {generateMsg && (
        <p className="text-[13px] text-text-secondary mb-3">{generateMsg}</p>
      )}

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => changeDay(-1)} className="text-blue text-lg font-medium">←</button>
        <span className="font-medium">{formatDate(date)}</span>
        <button onClick={() => changeDay(1)} className="text-blue text-lg font-medium">→</button>
      </div>

      {lessons.length === 0 ? (
        <EmptyState title="Нет занятий на этот день" description="Попробуйте другой день" />
      ) : (
        <div className="flex flex-col gap-3">
          {lessons.map((l) => (
            <Card key={l.id} className={`border-l-[5px] ${l.status === 'completed' ? 'border-green' : l.status === 'cancelled' ? 'border-red' : 'border-blue'}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-[16px]">{l.group.name}</p>
                <span className="text-sm text-text-secondary">{formatTime(l.dateTime)}</span>
              </div>
              <p className="text-text-secondary text-[14px]">👩‍🏫 {l.teacher.fullName} • 🚪 {l.room.name}</p>
              <div className="flex items-center gap-3 mt-2">
                  <span className={`inline-flex items-center gap-1 text-[13px] font-medium ${l.status === 'completed' ? 'text-green' : l.status === 'cancelled' ? 'text-red' : l.status === 'conflict' ? 'text-red' : 'text-orange'}`}>
                    {l.status === 'completed' ? '✅ Завершено' : l.status === 'cancelled' ? '❌ Отменено' : l.status === 'conflict' ? '⚠ Конфликт' : '⏳ Запланировано'}
                  </span>
                <span className="text-xs text-text-secondary">👥 {l._count.attendances} отм.</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

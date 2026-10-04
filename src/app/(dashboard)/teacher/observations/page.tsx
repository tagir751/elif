'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Card, EmptyState } from '@/components/ui'

import { formatDate } from '@/lib/utils'

interface ObservationItem {
  id: string
  text: string
  createdAt: string
  student: { id: string; firstName: string; lastName: string }
  lesson: { dateTime: string; group: { name: string } }
}

interface LessonWithNote {
  id: string
  dateTime: string
  lessonNote: string | null
  personalNote: string | null
  hypothesis: string | null
  group: { id: string; name: string }
  attendances: { student: { id: string; firstName: string; lastName: string } }[]
}

const tabs = [
  { key: 'observations', label: 'Наблюдения' },
  { key: 'hypotheses', label: 'Гипотезы' },
  { key: 'lessonNotes', label: 'Заметки по уроку' },
  { key: 'personalNotes', label: 'Заметки (личные)' },
]

export default function TeacherObservationsPage() {
  const [activeTab, setActiveTab] = useState('observations')
  const [observations, setObservations] = useState<ObservationItem[]>([])
  const [lessons, setLessons] = useState<LessonWithNote[]>([])

  useEffect(() => {
    if (activeTab === 'observations') {
      globalThis.fetch('/api/observations')
        .then((r) => r.ok ? r.json() : [])
        .then(setObservations)
    } else {
      const param = activeTab === 'hypotheses' ? 'hasHypothesis' : activeTab === 'personalNotes' ? 'hasPersonalNote' : 'hasNote'
      globalThis.fetch('/api/lessons?' + param + '=1')
        .then((r) => r.ok ? r.json() : [])
        .then(setLessons)
    }
  }, [activeTab])

  const groupedByDate: Record<string, ObservationItem[]> = {}
  observations.forEach((o) => {
    const key = o.createdAt.split('T')[0]
    if (!groupedByDate[key]) groupedByDate[key] = []
    groupedByDate[key].push(o)
  })

  const groupedLessons: Record<string, LessonWithNote[]> = {}
  lessons.forEach((l) => {
    const key = l.dateTime.split('T')[0]
    if (!groupedLessons[key]) groupedLessons[key] = []
    groupedLessons[key].push(l)
  })

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Мои наблюдения</h1>

      <div className="flex bg-bg-secondary rounded-xl p-1 mb-5">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={
              'flex-1 text-center py-2 text-sm font-medium rounded-lg transition-colors ' +
              (activeTab === t.key ? 'bg-white text-text shadow-sm' : 'text-text-secondary')
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'observations' && (
        observations.length === 0 ? (
          <EmptyState title="Нет наблюдений" />
        ) : (
          Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date} className="mb-5">
              <p className="text-sm text-text-secondary font-medium mb-2">{formatDate(date)}</p>
              <div className="flex flex-col gap-2">
                {items.map((o) => (
                  <Card key={o.id} className="border-l-[5px] border-yellow">
                    <p className="font-semibold text-[15px] flex items-center gap-1">
                      👀 {o.student.lastName} {o.student.firstName}
                    </p>
                    <p className="text-[14px] mt-1 leading-relaxed">💬 {o.text}</p>
                    <p className="text-xs text-text-secondary mt-2">
                      <Image src="/logo-small.png" alt="" width={14} height={14} className="inline-block align-middle mr-0.5" /> {o.lesson.group.name} &bull; {formatDate(o.lesson.dateTime)}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )
      )}

      {activeTab === 'hypotheses' && (
        lessons.length === 0 ? (
          <EmptyState title="Нет гипотез" />
        ) : (
          Object.entries(groupedLessons).map(([date, items]) => (
            <div key={date} className="mb-5">
              <p className="text-sm text-text-secondary font-medium mb-2">{formatDate(date)}</p>
              <div className="flex flex-col gap-2">
                {items.map((l) => (
                  <Card key={l.id} className="border-l-[5px] border-purple">
                    <p className="font-semibold text-[15px]">🔬 Гипотеза</p>
                    <p className="text-[14px] mt-1 leading-relaxed">{l.hypothesis}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {l.attendances.map((a) => (
                        <span key={a.student.id} className="text-xs bg-bg-secondary rounded-full px-2 py-0.5">
                          {a.student.lastName} {a.student.firstName}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-text-secondary mt-2">
                      <Image src="/logo-small.png" alt="" width={14} height={14} className="inline-block align-middle mr-0.5" /> {l.group.name} &bull; {formatDate(l.dateTime)}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )
      )}

      {activeTab === 'lessonNotes' && (
        lessons.length === 0 ? (
          <EmptyState title="Нет заметок" />
        ) : (
          Object.entries(groupedLessons).map(([date, items]) => (
            <div key={date} className="mb-5">
              <p className="text-sm text-text-secondary font-medium mb-2">{formatDate(date)}</p>
              <div className="flex flex-col gap-2">
                {items.map((l) => (
                  <Card key={l.id} className="border-l-[5px] border-blue">
                    <p className="font-semibold text-[15px]">📝 Заметка к уроку</p>
                    <p className="text-[14px] mt-1 leading-relaxed">{l.lessonNote}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {l.attendances.map((a) => (
                        <span key={a.student.id} className="text-xs bg-bg-secondary rounded-full px-2 py-0.5">
                          {a.student.lastName} {a.student.firstName}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-text-secondary mt-2">
                      <Image src="/logo-small.png" alt="" width={14} height={14} className="inline-block align-middle mr-0.5" /> {l.group.name} &bull; {formatDate(l.dateTime)}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )
      )}

      {activeTab === 'personalNotes' && (
        lessons.length === 0 ? (
          <EmptyState title="Нет личных заметок" />
        ) : (
          Object.entries(groupedLessons).map(([date, items]) => (
            <div key={date} className="mb-5">
              <p className="text-sm text-text-secondary font-medium mb-2">{formatDate(date)}</p>
              <div className="flex flex-col gap-2">
                {items.map((l) => (
                  <Card key={l.id} className="border-l-[5px] border-green">
                    <p className="font-semibold text-[15px]">📝 Личная заметка</p>
                    <p className="text-[14px] mt-1 leading-relaxed">{l.personalNote}</p>
                    <p className="text-xs text-text-secondary mt-2">
                      <Image src="/logo-small.png" alt="" width={14} height={14} className="inline-block align-middle mr-0.5" /> {l.group.name} &bull; {formatDate(l.dateTime)}
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )
      )}
    </div>
  )
}

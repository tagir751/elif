'use client'

import { useEffect, useState } from 'react'
import { Card, EmptyState } from '@/components/ui'

import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface ObservationItem {
  id: string
  text: string
  createdAt: string
  student: { id: string; firstName: string; lastName: string }
  teacher: { fullName: string }
  lesson: { group: { name: string } }
}

interface FilterOption {
  id: string
  name?: string
  fullName?: string
  firstName?: string
  lastName?: string
}

export default function ObservationsPage() {
  const [observations, setObservations] = useState<ObservationItem[]>([])
  const [students, setStudents] = useState<FilterOption[]>([])
  const [groups, setGroups] = useState<FilterOption[]>([])
  const [teachers, setTeachers] = useState<FilterOption[]>([])
  const [studentId, setStudentId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const router = useRouter()

  const fetchObservations = async () => {
    const params = new URLSearchParams()
    if (studentId) params.set('studentId', studentId)
    if (groupId) params.set('groupId', groupId)
    if (teacherId) params.set('teacherId', teacherId)
    const res = await globalThis.fetch(`/api/observations?${params}`)
    if (res.ok) setObservations(await res.json())
  }

  useEffect(() => {
    globalThis.fetch('/api/students').then(r => r.ok && r.json()).then(setStudents)
    globalThis.fetch('/api/groups').then(r => r.ok && r.json()).then(setGroups)
    globalThis.fetch('/api/teachers').then(r => r.ok && r.json()).then(setTeachers)
  }, [])

  useEffect(() => { fetchObservations() }, [studentId, groupId, teacherId])

  const groupedByDate: Record<string, ObservationItem[]> = {}
  observations.forEach((o) => {
    const key = o.createdAt.split('T')[0]
    if (!groupedByDate[key]) groupedByDate[key] = []
    groupedByDate[key].push(o)
  })

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Наблюдения</h1>

      <div className="flex flex-col gap-2 mb-4">
        <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="input-field text-sm">
          <option value="">Все ученики</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.lastName} {s.firstName}</option>)}
        </select>
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input-field text-sm">
          <option value="">Все группы</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="input-field text-sm">
          <option value="">Все педагоги</option>
          {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName || t.name}</option>)}
        </select>
      </div>

      {observations.length === 0 ? (
        <EmptyState title="Нет наблюдений" />
      ) : (
        Object.entries(groupedByDate).map(([date, items]) => (
          <div key={date} className="mb-5">
            <p className="text-sm text-text-secondary font-medium mb-2">{formatDate(date)}</p>
            <div className="flex flex-col gap-2">
              {items.map((o) => (
                <Card key={o.id} onClick={() => router.push(`/manager/students/${o.student.id}`)} className="border-l-[5px] border-blue">
                  <p className="font-semibold text-[15px] flex items-center gap-1">👀 {o.student.lastName} {o.student.firstName}</p>
                  <p className="text-[14px] mt-1 leading-relaxed">💬 {o.text}</p>
                  <p className="text-xs text-text-secondary mt-2 flex items-center gap-2">👩‍🏫 {o.teacher.fullName} • 📚 {o.lesson.group.name}</p>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

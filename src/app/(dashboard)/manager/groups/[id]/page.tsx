'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, Button, Modal, EmptyState } from '@/components/ui'
import { formatDate, formatTime } from '@/lib/utils'


interface LessonSummary {
  id: string
  dateTime: string
  status: string
  conflictDetails: string | null
}

interface GroupDetail {
  id: string
  name: string
  subject: string
  capacity: number
  status: string
  teacher: { id: string; fullName: string; phone: string }
  room: { id: string; name: string; address: string | null }
  scheduleSlots: { id: string; dayOfWeek: number; timeStart: string; durationMinutes: number; room: { name: string } }[]
  enrollments: { id: string; student: { id: string; firstName: string; lastName: string; birthDate: string } }[]
  lessons: LessonSummary[]
  recentLessons: LessonSummary[]
}

const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function GroupDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [showSlot, setShowSlot] = useState(false)
  const [showStudent, setShowStudent] = useState(false)
  const [allStudents, setAllStudents] = useState<{ id: string; firstName: string; lastName: string }[]>([])
  const [slotForm, setSlotForm] = useState({ dayOfWeek: 1, timeStart: '17:00', durationMinutes: 90, roomId: '' })
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([])
  const [showEditTeacher, setShowEditTeacher] = useState(false)
  const [allTeachers, setAllTeachers] = useState<{ id: string; fullName: string }[]>([])
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')

  const loadGroup = async () => {
    const res = await globalThis.fetch(`/api/groups/${params.id}`)
    if (res.ok) setGroup(await res.json())
  }

  useEffect(() => { loadGroup() }, [params.id])

  const addSlot = async () => {
    const res = await fetch('/api/schedule-slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...slotForm, groupId: params.id }),
    })
    if (res.ok) { setShowSlot(false); loadGroup() }
  }

  const openAddStudent = () => {
    setShowStudent(true)
    fetch('/api/students').then((r) => { if (r.ok) r.json().then(setAllStudents) })
  }

  const changeTeacher = async (teacherId: string) => {
    const res = await fetch(`/api/groups/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId }),
    })
    if (res.ok) { setShowEditTeacher(false); loadGroup() }
  }

  const deleteGroup = async () => {
    const res = await fetch(`/api/groups/${params.id}`, { method: 'DELETE' })
    if (res.ok) { router.push('/manager/groups') }
  }

  const addStudent = async (studentId: string) => {
    const res = await fetch('/api/enrollments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, groupId: params.id }),
    })
    if (res.ok) {
      setShowStudent(false)
      loadGroup()
    }
  }

  if (!group) return <div className="p-4"><EmptyState title="Загрузка..." /></div>

  // Find conflict details for each slot
  const slotConflicts: Record<string, { lessonCount: number; details: string }> = {}
  for (const lesson of group.lessons) {
    if (lesson.status === 'conflict' && lesson.conflictDetails) {
      // Match lesson to a slot by dayOfWeek + timeStart
      const lessonDate = new Date(lesson.dateTime)
      const lessonDay = lessonDate.getDay() || 7
      const lessonTime = lessonDate.getHours().toString().padStart(2, '0') + ':' + lessonDate.getMinutes().toString().padStart(2, '0')
      const matchingSlot = group.scheduleSlots.find(
        (s) => s.dayOfWeek === lessonDay && s.timeStart === lessonTime
      )
      if (matchingSlot) {
        if (!slotConflicts[matchingSlot.id]) {
          slotConflicts[matchingSlot.id] = { lessonCount: 0, details: '' }
        }
        slotConflicts[matchingSlot.id].lessonCount++
        try {
          const parsed = JSON.parse(lesson.conflictDetails) as { description: string }[]
          slotConflicts[matchingSlot.id].details = parsed.map((c) => c.description).join(', ')
        } catch {
          slotConflicts[matchingSlot.id].details = lesson.conflictDetails
        }
      }
    }
  }

  const hasConflicts = Object.keys(slotConflicts).length > 0

  return (
    <div className="p-4 animate-slide-in">
      <button onClick={() => router.back()} className="text-blue text-sm mb-4">← Назад</button>

      <div className="flex items-center gap-2 mb-1">
        {editingName ? (
          <input
            className="input-field text-2xl font-bold flex-1"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                fetch(`/api/groups/${params.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: editName }),
                }).then((r) => { if (r.ok) { setEditingName(false); loadGroup() } })
              }
              if (e.key === 'Escape') setEditingName(false)
            }}
            onBlur={() => setEditingName(false)}
            autoFocus
          />
        ) : (
          <>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <button onClick={() => { setEditName(group.name); setEditingName(true) }} className="text-blue text-sm font-medium cursor-pointer bg-transparent border-none">✎</button>
          </>
        )}
      </div>
      <p className="text-text-secondary mb-4 flex items-center gap-2">📚 {group.subject} • 👩‍🏫 {group.teacher.fullName}</p>

      {hasConflicts && (
        <Card className="mb-3 border-l-[5px] border-red bg-red/5">
          <p className="font-semibold text-[15px] text-red mb-2">⚠ Конфликты расписания</p>
          {Object.entries(slotConflicts).map(([slotId, info]) => (
            <p key={slotId} className="text-[13px] text-text-secondary mb-1">
              <strong>{info.lessonCount}</strong> занятий: {info.details}
            </p>
          ))}
        </Card>
      )}

      <Card className="mb-3 border-l-[5px] border-blue">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary mb-1 flex items-center gap-1">👩‍🏫 Педагог</p>
          <button onClick={() => { setShowEditTeacher(true); fetch('/api/teachers').then(r => { if (r.ok) r.json().then(setAllTeachers) }) }} className="text-blue text-sm font-medium">✏️ Сменить</button>
        </div>
        <p className="font-semibold text-[16px]">{group.teacher.fullName}</p>
        <p className="text-text-secondary text-[14px]">{group.teacher.phone}</p>
      </Card>

      <Card className="mb-3 border-l-[5px] border-orange">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-text-secondary flex items-center gap-1">📅 Расписание</p>
          <button onClick={() => { setShowSlot(true); fetch('/api/rooms').then(r => { if (r.ok) r.json().then(setRooms) }) }} className="text-blue text-sm font-medium">+ Слот</button>
        </div>
        {group.scheduleSlots.map((s) => {
          const hasConflict = slotConflicts[s.id]
          return (
            <div key={s.id} className={'flex items-center justify-between py-1 border-b border-separator last:border-b-0 px-2 rounded-[8px] ' + (hasConflict ? 'bg-red/5 border border-red/30 -mx-1 px-3' : '')}>
              <span className={'rounded-[20px] px-3 py-1 text-[13px] font-semibold ' + (hasConflict ? 'bg-red/10 text-red' : 'bg-[#e8f2ff] text-blue')}>
                📅 {dayNames[s.dayOfWeek - 1]} {s.timeStart} <span className="font-normal">({s.durationMinutes} мин)</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-secondary">🚪 {s.room.name}</span>
                <button onClick={() => { fetch(`/api/schedule-slots?id=${s.id}`, { method: 'DELETE' }).then(() => loadGroup()) }} className="w-6 h-6 rounded-full bg-[#f2f2f7] flex items-center justify-center text-[11px] text-red border-none cursor-pointer">✕</button>
              </div>
            </div>
          )
        })}
      </Card>

      <Card className="mb-3 border-l-[5px] border-green">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-text-secondary flex items-center gap-1">👥 Ученики ({group.enrollments.length}/{group.capacity})</p>
          <button onClick={openAddStudent} className="text-blue text-sm font-medium">+ Добавить</button>
        </div>
        {group.enrollments.map((e) => (
          <div key={e.id} className="flex items-center justify-between py-2 border-b border-separator last:border-b-0">
            <span className="text-[15px]">{e.student.lastName} {e.student.firstName}</span>
            <button onClick={() => { fetch('/api/enrollments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: e.id }) }).then(() => loadGroup()) }} className="w-6 h-6 rounded-full bg-[#f2f2f7] flex items-center justify-center text-[11px] text-red border-none cursor-pointer" title="Отчислить">✕</button>
          </div>
        ))}
      </Card>

      <Card className="border-l-[5px] border-yellow">
        <p className="text-sm text-text-secondary mb-2 flex items-center gap-1">📋 Занятия</p>
        {(group.recentLessons || []).map((l) => (
          <div key={l.id} className="flex items-center justify-between py-2 border-b border-separator last:border-b-0">
            <span className="text-[14px]">{formatDate(l.dateTime)} {formatTime(l.dateTime)}</span>
            <span className={`text-[13px] font-medium ${l.status === 'completed' ? 'text-green' : l.status === 'cancelled' || l.status === 'conflict' ? 'text-red' : 'text-orange'}`}>
              {l.status === 'completed' ? '✅ Завершено' : l.status === 'cancelled' ? '❌ Отменено' : l.status === 'conflict' ? '⚠ Конфликт' : '⏳ Запланировано'}
            </span>
          </div>
        ))}
      </Card>

      <Modal isOpen={showSlot} onClose={() => setShowSlot(false)}>
        <h2 className="text-lg font-bold mb-4">Добавить слот</h2>
        <div className="flex flex-col gap-3">
          <select value={slotForm.dayOfWeek} onChange={(e) => setSlotForm({ ...slotForm, dayOfWeek: parseInt(e.target.value) })} className="input-field">
            {dayNames.map((d, i) => <option key={i} value={i + 1}>{d}</option>)}
          </select>
          <input type="time" value={slotForm.timeStart} onChange={(e) => setSlotForm({ ...slotForm, timeStart: e.target.value })} className="input-field" />
          <input type="number" placeholder="Длительность (мин)" value={slotForm.durationMinutes || ''} onChange={(e) => { const raw = e.target.value; if (raw === '') { setSlotForm({ ...slotForm, durationMinutes: 0 }); return }; const num = parseInt(raw); if (!isNaN(num)) setSlotForm({ ...slotForm, durationMinutes: num }) }} className="input-field" />
          <select value={slotForm.roomId} onChange={(e) => setSlotForm({ ...slotForm, roomId: e.target.value })} className="input-field">
            <option value="">Кабинет</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <Button onClick={addSlot} disabled={!slotForm.roomId}>Добавить</Button>
        </div>
      </Modal>

      <Modal isOpen={showStudent} onClose={() => setShowStudent(false)}>
        <h2 className="text-lg font-bold mb-4">Добавить ученика</h2>
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {allStudents.filter((s) => !group.enrollments.find((e) => e.student.id === s.id)).map((s) => (
            <button key={s.id} onClick={() => addStudent(s.id)} className="text-left p-3 rounded-xl hover:bg-separator/50 transition-colors">
              {s.lastName} {s.firstName}
            </button>
          ))}
        </div>
      </Modal>

      <Modal isOpen={showEditTeacher} onClose={() => setShowEditTeacher(false)}>
        <h2 className="text-lg font-bold mb-4">Сменить педагога</h2>
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {allTeachers.filter(t => t.id !== group.teacher.id).map((t) => (
            <button key={t.id} onClick={() => changeTeacher(t.id)} className="text-left p-3 rounded-xl hover:bg-separator/50 transition-colors">
              {t.fullName}
            </button>
          ))}
        </div>
      </Modal>

      <button onClick={() => setConfirmDeleteGroup(true)} className="w-full mt-4 py-3 rounded-[20px] border-2 border-red/30 text-red font-semibold text-[14px] cursor-pointer active:scale-[0.97] transition-all bg-transparent">
        🗑 Удалить группу
      </button>

      {confirmDeleteGroup && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setConfirmDeleteGroup(false)}>
          <div className="bg-white rounded-[28px] p-6 w-[90%] max-w-[320px] shadow-[0_20px_50px_rgba(0,0,0,0.25)] flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-[18px] text-center">Удалить группу?</p>
            <p className="text-[14px] text-text-secondary text-center">Группа будет скрыта. Текущие ученики сохранятся.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setConfirmDeleteGroup(false)} className="px-5 py-[10px] rounded-[20px] border-none bg-[#f2f2f7] font-semibold text-[14px] cursor-pointer active:scale-[0.95]">Отмена</button>
              <button onClick={deleteGroup} className="px-5 py-[10px] rounded-[20px] border-none bg-red text-white font-semibold text-[14px] cursor-pointer active:scale-[0.95]">Удалить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

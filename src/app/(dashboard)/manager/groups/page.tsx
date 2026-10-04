'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Modal, Button, EmptyState } from '@/components/ui'

interface GroupSummary {
  id: string
  name: string
  subject: string
  teacher: { fullName: string }
  room: { name: string }
  _count: { enrollments: number }
  scheduleSlots: { dayOfWeek: number; timeStart: string; room: { name: string } }[]
}

const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [teachers, setTeachers] = useState<{ id: string; fullName: string }[]>([])
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([])
  const [form, setForm] = useState({ name: '', subject: '', teacherId: '', roomId: '', capacity: 8 })
  const router = useRouter()

  const loadGroups = async () => {
    const res = await globalThis.fetch('/api/groups')
    if (res.ok) setGroups(await res.json())
  }

  useEffect(() => { loadGroups() }, [])

  const openAdd = () => {
    setShowAdd(true)
    Promise.all([fetch('/api/teachers'), fetch('/api/rooms')]).then(([tRes, rRes]) => {
      if (tRes.ok) tRes.json().then(setTeachers)
      if (rRes.ok) rRes.json().then(setRooms)
    })
  }

  const handleAdd = async () => {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowAdd(false)
      setForm({ name: '', subject: '', teacherId: '', roomId: '', capacity: 8 })
      loadGroups()
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Группы</h1>
        <button onClick={openAdd} className="btn-primary text-sm py-2 px-4">+ Создать</button>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="Нет групп" />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <Card key={g.id} onClick={() => router.push(`/manager/groups/${g.id}`)} className="border-l-[5px] border-blue">
              <p className="font-bold text-[17px] flex items-center gap-2">📘 {g.name}</p>
              <div className="flex items-center gap-3 mt-1 text-[14px] text-text-secondary">
                <span>👩‍🏫 {g.teacher.fullName}</span>
                <span>👥 {g._count.enrollments} уч.</span>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {g.scheduleSlots.map((s, i) => (
                  <span key={i} className="bg-[#e8f2ff] text-blue rounded-[20px] px-3 py-1.5 text-[14px] font-semibold flex items-center gap-1.5">
                    📅 {dayNames[s.dayOfWeek - 1]} {s.timeStart} <span className="font-normal text-[13px]">{s.room?.name}</span>
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)}>
        <h2 className="text-lg font-bold mb-4">Новая группа</h2>
        <div className="flex flex-col gap-3">
          <input placeholder="Название" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          <input placeholder="Предмет" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input-field" />
          <select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className="input-field">
            <option value="">Выберите педагога</option>
            {teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}
          </select>
          <select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} className="input-field">
            <option value="">Выберите кабинет</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input type="number" placeholder="Вместимость" value={form.capacity || ''} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 8 })} className="input-field" />
          <Button onClick={handleAdd} disabled={!form.name || !form.subject || !form.teacherId}>Создать</Button>
        </div>
      </Modal>
    </div>
  )
}

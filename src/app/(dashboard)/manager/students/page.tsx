'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Modal, Button, EmptyState } from '@/components/ui'


interface Student {
  id: string
  firstName: string
  lastName: string
  birthDate: string
  family: { id: string; name: string; phone: string } | null
  enrollments: { group: { id: string; name: string } }[]
}

interface Family {
  id: string
  name: string
  phone: string
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [families, setFamilies] = useState<Family[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', birthDate: '', familyId: '' })
  const [newFamily, setNewFamily] = useState({ show: false, name: '', phone: '' })
  const router = useRouter()

  const fetchStudents = async () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    const res = await fetch(`/api/students?${params}`)
    if (res.ok) setStudents(await res.json())
  }

  const fetchFamilies = async () => {
    const res = await fetch('/api/families')
    if (res.ok) setFamilies(await res.json())
  }

  useEffect(() => { fetchStudents(); fetchFamilies() }, [search])

  const handleAdd = async () => {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowAdd(false)
      setForm({ firstName: '', lastName: '', birthDate: '', familyId: '' })
      fetchStudents()
      fetchFamilies()
    }
  }

  const handleCreateFamily = async () => {
    if (!newFamily.name.trim() || !newFamily.phone.trim()) return
    const res = await fetch('/api/families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newFamily.name.trim(), phone: newFamily.phone.trim() }),
    })
    if (res.ok) {
      const created = await res.json()
      setNewFamily({ show: false, name: '', phone: '' })
      setForm({ ...form, familyId: created.id })
      fetchFamilies()
    }
  }

  const openCard = (id: string) => router.push(`/manager/students/${id}`)

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Ученики</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm py-2 px-4">
          + Добавить
        </button>
      </div>

      <input
        type="text"
        placeholder="Поиск по имени или фамилии"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input-field mb-4"
      />

      {students.length === 0 ? (
        <EmptyState title="Нет учеников" description={search ? 'Измените поиск' : 'Добавьте первого ученика'} />
      ) : (
        <div className="flex flex-col gap-3">
          {students.map((s) => (
            <Card key={s.id} onClick={() => openCard(s.id)} className="border-l-[5px] border-blue">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-blue text-white flex items-center justify-center text-sm font-semibold">
                    {s.firstName[0]}{s.lastName[0]}
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#aeaeb2] border-2 border-white shadow-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[16px] truncate">{s.lastName} {s.firstName}</p>
                  <p className="text-text-secondary text-[13px] truncate">
                    {s.family?.name ? `👨‍👩‍👧‍👦 ${s.family.name}` : 'Net semyi'} {s.enrollments.length > 0 ? `• 📚 ${s.enrollments.length} gr.` : ''}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)}>
        <h2 className="text-lg font-bold mb-4">Новый ученик</h2>
        <div className="flex flex-col gap-3">
          <input placeholder="Имя" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="input-field" />
          <input placeholder="Фамилия" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="input-field" />
          <input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} className="input-field" />
          <div>
            <select value={form.familyId} onChange={(e) => setForm({ ...form, familyId: e.target.value })} className="input-field">
              <option value="">{families.length === 0 ? 'Загрузка семей...' : 'Без семьи'}</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.phone})</option>
              ))}
            </select>
            <button
              onClick={() => setNewFamily({ show: !newFamily.show, name: '', phone: '' })}
              className="text-sm text-blue font-medium mt-1 cursor-pointer"
            >
              {newFamily.show ? '− Отмена' : '➕ Новая семья'}
            </button>
            {newFamily.show && (
              <div className="flex flex-col gap-2 mt-2 p-3 bg-[#f8f8fa] rounded-xl">
                <input placeholder="Название семьи" value={newFamily.name} onChange={(e) => setNewFamily({ ...newFamily, name: e.target.value })} className="input-field text-sm" />
                <input placeholder="Телефон" value={newFamily.phone} onChange={(e) => setNewFamily({ ...newFamily, phone: e.target.value })} className="input-field text-sm" />
                <Button onClick={handleCreateFamily} disabled={!newFamily.name.trim() || !newFamily.phone.trim()}>
                  Создать семью
                </Button>
              </div>
            )}
          </div>
          <Button onClick={handleAdd} disabled={!form.firstName || !form.lastName}>Создать</Button>
        </div>
      </Modal>
    </div>
  )
}

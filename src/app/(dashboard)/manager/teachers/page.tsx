'use client'

import { useEffect, useState } from 'react'
import { Card, Modal, Button, EmptyState } from '@/components/ui'


interface Teacher {
  id: string
  fullName: string
  specialization: string
  phone: string
  user: { email: string; status: string } | null
  _count: { groups: number; lessons: number }
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [showEdit, setShowEdit] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [editForm, setEditForm] = useState({ id: '', fullName: '', specialization: '', phone: '' })
  const [addForm, setAddForm] = useState({ fullName: '', specialization: '', phone: '', email: '', password: '' })
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  const loadTeachers = async () => {
    const res = await globalThis.fetch('/api/teachers')
    if (res.ok) setTeachers(await res.json())
  }

  useEffect(() => { loadTeachers() }, [])

  const openEdit = (t: Teacher) => {
    setEditForm({ id: t.id, fullName: t.fullName, specialization: t.specialization, phone: t.phone })
    setShowEdit(true)
  }

  const saveTeacher = async () => {
    const res = await fetch(`/api/teachers/${editForm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) { setShowEdit(false); loadTeachers() }
  }

  const deleteTeacher = async (id: string) => {
    const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' })
    if (res.ok) { setConfirmDelete(null); setShowEdit(false); loadTeachers() }
  }

  const addTeacher = async () => {
    const res = await fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    })
    if (res.ok) { setShowAdd(false); setAddForm({ fullName: '', specialization: '', phone: '', email: '', password: '' }); loadTeachers() }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Педагоги</h1>
        <button onClick={() => setShowAdd(true)} className="h-11 px-5 rounded-[22px] border-none bg-blue text-white font-semibold text-[15px] font-inherit cursor-pointer shadow-[0_4px_14px_rgba(0,122,255,0.2)] active:scale-[0.97] transition-all">+ Добавить</button>
      </div>

      {teachers.length === 0 ? (
        <EmptyState title="Нет педагогов" />
      ) : (
        <div className="flex flex-col gap-3">
          {teachers.map((t) => (
            <Card key={t.id} onClick={() => openEdit(t)} className="border-l-[5px] border-blue">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#34c759] text-white flex items-center justify-center text-sm font-bold">
                  {t.fullName.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[16px] truncate">{t.fullName}</p>
                  <p className="text-text-secondary text-[13px]">📚 {t.specialization} • 📞 {t.phone}</p>
                  <p className="text-text-secondary text-[13px]">👥 {t._count.groups} гр. • 📅 {t._count.lessons} зан.</p>
                </div>
                {t.user && (
                  <span className={`text-xs font-medium ${t.user.status === 'active' ? 'text-green' : 'text-red'}`}>
                    {t.user.status === 'active' ? '✅ Активен' : '❌ Отключён'}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)}>
        <h2 className="text-lg font-bold mb-4">Редактировать педагога</h2>
        <div className="flex flex-col gap-3">
          <input placeholder="ФИО" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="input-field" />
          <input placeholder="Специализация" value={editForm.specialization} onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })} className="input-field" />
          <input placeholder="Телефон" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input-field" />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Отмена</Button>
            <Button onClick={saveTeacher}>Сохранить</Button>
          </div>
          <button onClick={() => setConfirmDelete(editForm.id)} className="w-full mt-2 py-3 rounded-[20px] border-none bg-red text-white font-semibold text-[14px] cursor-pointer active:scale-[0.97] transition-all">
            🗑 Удалить педагога
          </button>
        </div>
      </Modal>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-[28px] p-6 w-[90%] max-w-[320px] shadow-[0_20px_50px_rgba(0,0,0,0.25)] flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-[18px] text-center">Удалить педагога?</p>
            <p className="text-[14px] text-text-secondary text-center">Прошедшие уроки останутся в истории, будущие будут отменены.</p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setConfirmDelete(null)} className="px-5 py-[10px] rounded-[20px] border-none bg-[#f2f2f7] font-semibold text-[14px] cursor-pointer active:scale-[0.95]">Отмена</button>
              <button onClick={() => deleteTeacher(confirmDelete)} className="px-5 py-[10px] rounded-[20px] border-none bg-red text-white font-semibold text-[14px] cursor-pointer active:scale-[0.95]">Удалить</button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)}>
        <h2 className="text-lg font-bold mb-4">Добавить педагога</h2>
        <div className="flex flex-col gap-3">
          <input placeholder="ФИО" value={addForm.fullName} onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })} className="input-field" />
          <input placeholder="Специализация" value={addForm.specialization} onChange={(e) => setAddForm({ ...addForm, specialization: e.target.value })} className="input-field" />
          <input placeholder="Телефон" value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} className="input-field" />
          <input placeholder="Email для входа" value={addForm.email} onChange={(e) => setAddForm({ ...addForm, email: e.target.value })} className="input-field" />
          <input type="password" placeholder="Пароль" value={addForm.password} onChange={(e) => setAddForm({ ...addForm, password: e.target.value })} className="input-field" />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Отмена</Button>
            <Button onClick={addTeacher}>Создать</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
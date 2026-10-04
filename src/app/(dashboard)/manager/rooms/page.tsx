'use client'

import { useEffect, useState } from 'react'
import { Card, Modal, Button, EmptyState } from '@/components/ui'

interface Room {
  id: string
  name: string
  address: string | null
  capacity: number
  equipment: string | null
  _count: { lessons: number; scheduleSlots: number }
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState<Room | null>(null)
  const [form, setForm] = useState({ name: '', address: '', capacity: 0, equipment: '' })

  const loadRooms = async () => {
    const res = await globalThis.fetch('/api/rooms')
    if (res.ok) setRooms(await res.json())
  }

  useEffect(() => { loadRooms() }, [])

  const save = async (id?: string) => {
    const url = id ? `/api/rooms/${id}` : '/api/rooms'
    const method = id ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      setShowAdd(false)
      setShowEdit(null)
      setForm({ name: '', address: '', capacity: 0, equipment: '' })
      loadRooms()
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Удалить кабинет?')) return
    await globalThis.fetch(`/api/rooms/${id}`, { method: 'DELETE' })
    loadRooms()
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Кабинеты</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm py-2 px-4">+ Добавить</button>
      </div>

      {rooms.length === 0 ? (
        <EmptyState title="Нет кабинетов" />
      ) : (
        <div className="flex flex-col gap-3">
          {rooms.map((r) => (
            <Card key={r.id} onClick={() => { setForm({ name: r.name, address: r.address || '', capacity: r.capacity, equipment: r.equipment || '' }); setShowEdit(r) }} className="border-l-[5px] border-orange">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[16px]">🚪 {r.name}</p>
                  <p className="text-text-secondary text-[13px] mt-0.5">📍 {r.address || 'Нет адреса'} • 👥 {r.capacity} мест</p>
                  {r.equipment && <p className="text-text-secondary text-[13px]">🛠️ {r.equipment}</p>}
                </div>
                <span className="text-xs text-text-secondary">📅 {r._count.lessons} зан.</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd || showEdit !== null} onClose={() => { setShowAdd(false); setShowEdit(null) }}>
        <h2 className="text-lg font-bold mb-4">{showEdit ? 'Редактировать' : 'Новый'} кабинет</h2>
        <div className="flex flex-col gap-3">
          <input placeholder="Название" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          <input placeholder="Адрес" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
          <input type="number" placeholder="Вместимость" value={form.capacity || ''} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 0 })} className="input-field" />
          <textarea placeholder="Оборудование" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} className="input-field min-h-[80px]" />
          <div className="flex gap-2">
            {showEdit && <Button variant="danger" onClick={() => remove(showEdit.id)}>Удалить</Button>}
            <Button onClick={() => save(showEdit?.id)} disabled={!form.name}>Сохранить</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

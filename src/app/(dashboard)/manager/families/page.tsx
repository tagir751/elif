'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Modal, Button, EmptyState } from '@/components/ui'
import { maskPhone } from '@/lib/mask'


interface FamilySummary {
  id: string
  name: string
  phone: string
  monthlyFee: number
  paidUntil: string | null
  _count: { students: number; payments: number }
}

export default function FamiliesPage() {
  const [families, setFamilies] = useState<FamilySummary[]>([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', telegram: '', monthlyFee: 0, comment: '' })
  const router = useRouter()

  const loadFamilies = async () => {
    const sp = new URLSearchParams()
    if (search) sp.set('search', search)
    const res = await globalThis.fetch(`/api/families?${sp}`)
    if (res.ok) setFamilies(await res.json())
  }

  useEffect(() => { loadFamilies() }, [search])

  const handleAdd = async () => {
    const res = await fetch('/api/families', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setShowAdd(false)
      setForm({ name: '', phone: '', email: '', telegram: '', monthlyFee: 0, comment: '' })
      loadFamilies()
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Семьи</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary text-sm py-2 px-4">+ Добавить</button>
      </div>

      <input placeholder="Поиск по имени или телефону" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field mb-4" />

      {families.length === 0 ? (
        <EmptyState title="Нет семей" />
      ) : (
        <div className="flex flex-col gap-3">
          {families.map((f) => (
            <Card key={f.id} onClick={() => router.push(`/manager/families/${f.id}`)} className={`border-l-[5px] ${f.paidUntil && new Date(f.paidUntil) < new Date() ? 'border-red' : 'border-green'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-[16px] flex items-center gap-1">👨‍👩‍👧‍👧 {f.name}</p>
                  <p className="text-text-secondary text-[13px] mt-0.5">{maskPhone(f.phone)} • 👥 {f._count.students} уч., 💳 {f._count.payments} пл.</p>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[15px]">{f.monthlyFee} ₽/мес</div>
                  {f.paidUntil && (
                    <div className={`text-[12px] ${new Date(f.paidUntil) < new Date() ? 'text-red' : 'text-green'}`}>
                      {new Date(f.paidUntil) < new Date() ? '🔴 Просрочка' : '✅ Оплачено'}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)}>
        <h2 className="text-lg font-bold mb-4">Новая семья</h2>
        <div className="flex flex-col gap-3">
          <input placeholder="Название" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
          <input placeholder="Телефон" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
          <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
          <input placeholder="Telegram" value={form.telegram} onChange={(e) => setForm({ ...form, telegram: e.target.value })} className="input-field" />
          <input type="number" placeholder="Абонентская плата" value={form.monthlyFee || ''} onChange={(e) => setForm({ ...form, monthlyFee: parseInt(e.target.value) || 0 })} className="input-field" />
          <input placeholder="Комментарий" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} className="input-field" />
          <Button onClick={handleAdd} disabled={!form.name || !form.phone}>Создать</Button>
        </div>
      </Modal>
    </div>
  )
}

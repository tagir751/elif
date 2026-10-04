'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, Button, Modal, EmptyState } from '@/components/ui'

import { formatDate } from '@/lib/utils'

interface FamilyDetail {
  id: string
  name: string
  phone: string
  email: string | null
  telegram: string | null
  monthlyFee: number
  paidUntil: string | null
  comment: string | null
  students: { id: string; firstName: string; lastName: string; enrollments: { group: { name: string } }[] }[]
  payments: { id: string; amount: number; date: string; comment: string | null }[]
}

export default function FamilyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [family, setFamily] = useState<FamilyDetail | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [payForm, setPayForm] = useState({ amount: 0, date: '', paidUntil: '', comment: '' })
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', telegram: '', monthlyFee: 0, paidUntil: '', comment: '' })

  const loadFamily = async () => {
    const res = await globalThis.fetch(`/api/families/${params.id}`)
    if (res.ok) setFamily(await res.json())
  }

  useEffect(() => { loadFamily() }, [params.id])

  const handlePayment = async () => {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payForm, familyId: params.id }),
    })
    if (res.ok) {
      setShowPayment(false)
      setPayForm({ amount: 0, date: '', paidUntil: '', comment: '' })
      loadFamily()
    }
  }

  const openEdit = () => {
    if (!family) return
    setEditForm({
      name: family.name,
      phone: family.phone,
      email: family.email || '',
      telegram: family.telegram || '',
      monthlyFee: family.monthlyFee,
      paidUntil: family.paidUntil ? family.paidUntil.split('T')[0] : '',
      comment: family.comment || '',
    })
    setShowEdit(true)
  }

  const handleEdit = async () => {
    const res = await fetch(`/api/families/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editForm,
        email: editForm.email || null,
        telegram: editForm.telegram || null,
        paidUntil: editForm.paidUntil || null,
        comment: editForm.comment || null,
      }),
    })
    if (res.ok) {
      setShowEdit(false)
      loadFamily()
    }
  }

  if (!family) return <div className="p-4"><EmptyState title="Загрузка..." /></div>

  return (
    <div className="p-4 animate-slide-in">
      <button onClick={() => router.back()} className="text-blue text-sm mb-4">← Назад</button>

      <Card className="mb-3 border-l-[5px] border-blue">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold flex items-center gap-2">👨‍👩‍👧‍👧 {family.name}</h2>
          <button onClick={openEdit} className="text-blue text-sm font-medium shrink-0">✏️ Редактировать</button>
        </div>
        <p className="text-text-secondary text-[14px]">📞 {family.phone}</p>
        {family.email && <p className="text-text-secondary text-[14px]">✉️ {family.email}</p>}
        {family.telegram && <p className="text-text-secondary text-[14px]">✈️ {family.telegram}</p>}
        <div className="flex items-center gap-3 mt-2">
          <span className="font-semibold text-[16px]">{family.monthlyFee} ₽/мес</span>
          {family.paidUntil && (
            <span className={`text-[14px] font-medium ${new Date(family.paidUntil) < new Date() ? 'text-red' : 'text-green'}`}>
              {new Date(family.paidUntil) < new Date() ? '🔴 Просрочка' : '✅ Оплачено до'} {formatDate(family.paidUntil)}
            </span>
          )}
        </div>
        {family.comment && <p className="text-text-secondary text-[13px] mt-2">📝 {family.comment}</p>}
      </Card>

      <Card className="mb-3 border-l-[5px] border-green">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-text-secondary flex items-center gap-1">👥 Ученики</p>
        </div>
        {family.students.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2 border-b border-separator last:border-b-0">
            <span className="text-[15px]">{s.lastName} {s.firstName}</span>
            <span className="text-xs text-text-secondary">{s.enrollments.map(e => e.group.name).join(', ')}</span>
          </div>
        ))}
      </Card>

      <Card className="mb-3 border-l-[5px] border-yellow">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-text-secondary flex items-center gap-1">💳 Платежи</p>
          <button onClick={() => setShowPayment(true)} className="text-blue text-sm font-medium">+ Добавить</button>
        </div>
        {family.payments.length === 0 ? (
          <p className="text-text-secondary text-sm">Нет платежей</p>
        ) : (
          family.payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2 border-b border-separator last:border-b-0">
              <span className="font-semibold text-[15px]">{p.amount} ₽</span>
              <span className="text-xs text-text-secondary">{formatDate(p.date)}{p.comment ? ` • 📝 ${p.comment}` : ''}</span>
            </div>
          ))
        )}
      </Card>

      <Modal isOpen={showPayment} onClose={() => setShowPayment(false)}>
        <h2 className="text-lg font-bold mb-4">Добавить платёж</h2>
        <div className="flex flex-col gap-3">
          <input type="number" placeholder="Сумма" value={payForm.amount || ''} onChange={(e) => setPayForm({ ...payForm, amount: parseInt(e.target.value) || 0 })} className="input-field" />
          <input type="date" value={payForm.date} onChange={(e) => setPayForm({ ...payForm, date: e.target.value })} className="input-field" />
          <input type="date" placeholder="Оплачено до" value={payForm.paidUntil} onChange={(e) => setPayForm({ ...payForm, paidUntil: e.target.value })} className="input-field" />
          <input placeholder="Комментарий" value={payForm.comment} onChange={(e) => setPayForm({ ...payForm, comment: e.target.value })} className="input-field" />
          <Button onClick={handlePayment} disabled={!payForm.amount}>Сохранить</Button>
        </div>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)}>
        <h2 className="text-lg font-bold mb-4">Редактировать семью</h2>
        <div className="flex flex-col gap-3">
          <input placeholder="Название" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="input-field" />
          <input placeholder="Телефон" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input-field" />
          <input placeholder="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="input-field" />
          <input placeholder="Telegram" value={editForm.telegram} onChange={(e) => setEditForm({ ...editForm, telegram: e.target.value })} className="input-field" />
          <input type="number" placeholder="Абонентская плата" value={editForm.monthlyFee || ''} onChange={(e) => setEditForm({ ...editForm, monthlyFee: parseInt(e.target.value) || 0 })} className="input-field" />
          <input type="date" placeholder="Оплачено до" value={editForm.paidUntil} onChange={(e) => setEditForm({ ...editForm, paidUntil: e.target.value })} className="input-field" />
          <input placeholder="Комментарий" value={editForm.comment} onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })} className="input-field" />
          <Button onClick={handleEdit} disabled={!editForm.name || !editForm.phone}>Сохранить</Button>
        </div>
      </Modal>
    </div>
  )
}
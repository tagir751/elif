'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, Button, EmptyState } from '@/components/ui'

import { formatDate } from '@/lib/utils'

interface StudentDetail {
  id: string
  firstName: string
  lastName: string
  birthDate: string
  phone: string | null
  status: string
  family: { id: string; name: string; phone: string; monthlyFee: number; paidUntil: string | null } | null
  enrollments: { group: { id: string; name: string; subject: string } }[]
  attendances: { status: string; lesson: { dateTime: string } }[]
  observations: { id: string; text: string; createdAt: string; teacherId: string }[]
}

const TABS = [
  { key: 'history', label: 'История' },
  { key: 'growth', label: 'Развитие' },
] as const

export default function StudentCardPage() {
  const params = useParams()
  const router = useRouter()
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [tab, setTab] = useState<string>('history')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', birthDate: '', phone: '' })
  const [confirmAction, setConfirmAction] = useState<'deactivate' | 'activate' | 'deleteForever' | null>(null)
  const [saving, setSaving] = useState(false)

  const loadStudent = () => {
    fetch(`/api/students/${params.id}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) {
          setStudent(data)
          setEditForm({
            firstName: data.firstName,
            lastName: data.lastName,
            birthDate: data.birthDate ? data.birthDate.slice(0, 10) : '',
            phone: data.phone || '',
          })
        }
      })
  }

  useEffect(() => { loadStudent() }, [params.id])

  const startEditing = () => {
    setEditForm({
      firstName: student!.firstName,
      lastName: student!.lastName,
      birthDate: student!.birthDate ? student!.birthDate.slice(0, 10) : '',
      phone: student!.phone || '',
    })
    setIsEditing(true)
  }

  const saveStudent = async () => {
    setSaving(true)
    const res = await fetch(`/api/students/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      setIsEditing(false)
      loadStudent()
    }
    setSaving(false)
  }

  const changeStatus = async (status: string) => {
    const res = await fetch(`/api/students/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { loadStudent(); setConfirmAction(null) }
  }

  const deleteForever = async () => {
    const res = await fetch(`/api/students/${params.id}?permanent=true`, { method: 'DELETE' })
    if (res.ok) { router.push('/manager/students') }
  }

  if (!student) return <div className="p-4"><EmptyState title="Загрузка..." /></div>

  const age = student.birthDate
    ? Math.floor((Date.now() - new Date(student.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  return (
    <div className="p-4 animate-slide-in">
      <button onClick={() => router.back()} className="text-blue text-sm mb-4">← Назад</button>

      <div className="flex items-start gap-4 mb-6">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-blue text-white flex items-center justify-center text-2xl font-bold">
            {student.firstName[0]}{student.lastName[0]}
          </div>
          {student.status === 'active' && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ffcc00] border-2 border-white shadow-[0_0_12px_4px_rgba(255,204,0,0.5)]" />
          )}
        </div>
        <div className="flex-1">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                className="input-field text-lg font-bold"
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                placeholder="Фамилия"
              />
              <input
                className="input-field text-lg font-bold"
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                placeholder="Имя"
              />
              <input
                type="date"
                className="input-field text-sm"
                value={editForm.birthDate}
                onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
              />
              <input
                className="input-field text-sm"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="Телефон ученика"
              />
              <div className="flex gap-2 mt-1">
                <Button onClick={saveStudent} disabled={saving}>💾 Сохранить</Button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-[10px] rounded-[20px] border-none bg-[#f2f2f7] font-semibold text-[14px] cursor-pointer active:scale-[0.95]"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{student.lastName} {student.firstName}</h1>
                {student.status === 'inactive' && (
                  <span className="text-xs bg-[#ffebea] text-[#ff3b30] px-2 py-[2px] rounded-full font-semibold">Неактивен</span>
                )}
                {student.status === 'deleted' && (
                  <span className="text-xs bg-[#f2f2f7] text-text-secondary px-2 py-[2px] rounded-full font-semibold">Скрыт</span>
                )}
              </div>
              <p className="text-text-secondary">{age !== null ? age + ' лет' : 'Дата не указана'}</p>
            </>
          )}
        </div>
      </div>

      {!isEditing && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={startEditing}
            className="px-4 py-[8px] rounded-[20px] border-none bg-[#e8f2ff] text-blue font-semibold text-[13px] cursor-pointer active:scale-[0.97] transition-all"
          >
            ✏️ Редактировать
          </button>
          {student.status === 'active' && (
            <button
              onClick={() => setConfirmAction('deactivate')}
              className="px-4 py-[8px] rounded-[20px] border-none bg-[#fff3e6] text-[#ff9500] font-semibold text-[13px] cursor-pointer active:scale-[0.97] transition-all"
            >
              🚫 Деактивировать
            </button>
          )}
          {student.status === 'inactive' && (
            <button
              onClick={() => changeStatus('active')}
              className="px-4 py-[8px] rounded-[20px] border-none bg-[#e8f8ed] text-[#34c759] font-semibold text-[13px] cursor-pointer active:scale-[0.97] transition-all"
            >
              ✅ Активировать
            </button>
          )}
          <button
            onClick={() => setConfirmAction('deleteForever')}
            className="px-4 py-[8px] rounded-[20px] border-2 border-red/30 text-red font-semibold text-[13px] cursor-pointer active:scale-[0.97] transition-all bg-transparent"
          >
            🗑 Удалить навсегда
          </button>
        </div>
      )}

      {student.family && (
        <Card className="mb-3 border-l-[5px] border-blue">
          <p className="text-sm text-text-secondary mb-1 flex items-center gap-1">👨‍👩‍👧‍👧 Семья</p>
          <p className="font-semibold text-[16px]">{student.family.name}</p>
          <p className="text-sm text-text-secondary">📞 {student.family.phone}</p>
          {student.family.paidUntil && (
            <p className={`text-sm mt-1 font-medium ${new Date(student.family.paidUntil) < new Date() ? 'text-red' : 'text-green'}`}>
              {new Date(student.family.paidUntil) < new Date() ? '🔴 Просрочка' : '✅ Оплачено до'} {formatDate(student.family.paidUntil)}
            </p>
          )}
        </Card>
      )}

      {student.phone && (
        <Card className="mb-3 border-l-[5px] border-purple">
          <p className="text-sm text-text-secondary mb-1 flex items-center gap-1">📱 Телефон ученика</p>
          <p className="font-semibold text-[16px]">{student.phone}</p>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex bg-[#f2f2f7] rounded-xl p-1 mb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 text-center py-2 text-sm font-medium rounded-[10px] transition-all ${
              tab === t.key ? 'bg-white text-text shadow-sm' : 'text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'history' && (
        <>
          <Card className="mb-3 border-l-[5px] border-green">
            <p className="text-sm text-text-secondary mb-2 flex items-center gap-1">📚 Группы</p>
            {student.enrollments.length === 0 ? (
              <p className="text-text-secondary text-sm">Не зачислен</p>
            ) : (
              student.enrollments.map((e) => (
                <div key={e.group.id} className="flex items-center justify-between py-2 border-b border-separator last:border-b-0">
                  <span className="text-[15px]">{e.group.name}</span>
                  <span className="text-text-secondary text-sm">{e.group.subject}</span>
                </div>
              ))
            )}
          </Card>

          <Card className="mb-3 border-l-[5px] border-orange">
            <p className="text-sm text-text-secondary mb-2 flex items-center gap-1">📋 Посещаемость ({student.attendances.length})</p>
            {student.attendances.length === 0 ? (
              <p className="text-text-secondary text-sm">Нет данных</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {student.attendances.map((a, i) => (
                  <span key={i} title={a.status} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                    a.status === 'present' ? 'bg-[#e8f8ed] text-[#34c759]' :
                    a.status === 'absent' ? 'bg-[#ffebea] text-[#ff3b30]' :
                    'bg-[#fff3e6] text-[#ff9500]'
                  }`}>
                    {a.status === 'present' ? '✅' : a.status === 'absent' ? '❌' : '⏰'}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === 'growth' && (
        <Card className="border-l-[5px] border-yellow">
          <p className="text-sm text-text-secondary mb-2 flex items-center gap-1">👀 Наблюдения</p>
          {student.observations.length === 0 ? (
            <p className="text-text-secondary text-sm">Нет наблюдений</p>
          ) : (
            student.observations.map((o) => (
              <div key={o.id} className="py-3 border-b border-separator last:border-b-0">
                <p className="text-[14px] leading-relaxed">{o.text}</p>
                <p className="text-xs text-text-secondary mt-1">{formatDate(o.createdAt)}</p>
              </div>
            ))
          )}
        </Card>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setConfirmAction(null)}>
          <div className="bg-white rounded-[28px] p-6 w-[90%] max-w-[320px] shadow-[0_20px_50px_rgba(0,0,0,0.25)] flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="font-bold text-[18px] text-center">
              {confirmAction === 'deactivate' ? 'Деактивировать ученика?' :
               confirmAction === 'activate' ? 'Активировать ученика?' :
               'Удалить навсегда?'}
            </p>
            <p className="text-[14px] text-text-secondary text-center">
              {confirmAction === 'deactivate'
                ? 'Ученик останется в системе, но будет помечен как неактивный.'
                : confirmAction === 'activate'
                ? 'Восстановить активный статус ученика.'
                : 'Ученик будет полностью удалён из базы данных. Это действие необратимо.'}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-5 py-[10px] rounded-[20px] border-none bg-[#f2f2f7] font-semibold text-[14px] cursor-pointer active:scale-[0.95]"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (confirmAction === 'deactivate') changeStatus('inactive')
                  else if (confirmAction === 'activate') changeStatus('active')
                  else deleteForever()
                }}
                className={`px-5 py-[10px] rounded-[20px] border-none font-semibold text-[14px] cursor-pointer active:scale-[0.95] text-white ${
                  confirmAction === 'deleteForever' ? 'bg-red' : 'bg-blue'
                }`}
              >
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

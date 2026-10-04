'use client'

import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui'
import { formatDate } from '@/lib/utils'


interface Task {
  id: string
  title: string
  type: string
  bucket: string
  dueDate: string | null
  completed: boolean
  familyId: string | null
}

const buckets = ['today', 'later', 'waiting'] as const
const bucketLabels: Record<string, string> = { today: 'Сегодня', later: 'Позже', waiting: 'Ожидание' }
const bucketColors: Record<string, string> = { today: '#007aff', later: '#ff9500', waiting: '#34c759' }
const typeLabels: Record<string, string> = { call: '📞 Звонок', meeting: '📅 Встреча', finance: '💰 Финансы', schedule: '📋 Расписание', student: '👨‍🎓 Ученик', documents: '📄 Документы', other: '⚠️ Другое' }

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [activeBucket, setActiveBucket] = useState<string>('today')
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState<Task | null>(null)
  const [form, setForm] = useState({ title: '', type: 'other', bucket: 'today', dueDate: '' })

  const loadTasks = async () => {
    const res = await globalThis.fetch(`/api/tasks?bucket=${activeBucket}`)
    if (res.ok) setTasks(await res.json())
  }

  useEffect(() => { loadTasks() }, [activeBucket])

  const save = async (id?: string) => {
    const url = id ? `/api/tasks/${id}` : '/api/tasks'
    const method = id ? 'PUT' : 'POST'
    const res = await globalThis.fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      setShowAdd(false)
      setShowEdit(null)
      setForm({ title: '', type: 'other', bucket: 'today', dueDate: '' })
      loadTasks()
    }
  }

  const toggleComplete = async (task: Task) => {
    await globalThis.fetch(`/api/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    })
    loadTasks()
  }

  const remove = async (id: string) => {
    await globalThis.fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    loadTasks()
  }

  const openEdit = (task: Task) => {
    setForm({ title: task.title, type: task.type, bucket: task.bucket, dueDate: task.dueDate ? task.dueDate.split('T')[0] : '' })
    setShowEdit(task)
  }

  const bucketColor = bucketColors[activeBucket]

  return (
    <div className="p-5">
      <div className="section-header">
        <h2 className="text-[26px] font-bold tracking-tight">Задачи</h2>
        <button onClick={() => setShowAdd(true)} className="btn">+ Новая</button>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-none">
        {buckets.map((b) => (
          <button
            key={b}
            onClick={() => setActiveBucket(b)}
            className={`day-chip ${activeBucket === b ? 'selected' : ''}`}
          >
            {bucketLabels[b]}
          </button>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="mt-10 text-center text-text-secondary text-sm">
          <p className="text-3xl mb-2">
            {activeBucket === 'today' ? '📋' : activeBucket === 'later' ? '📌' : '⏳'}
          </p>
          <p>Нет задач в «{bucketLabels[activeBucket]}»</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => openEdit(task)}
              className="bg-white rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] cursor-pointer active:scale-[0.98] transition-all"
              style={{ borderLeft: `5px solid ${task.completed ? '#aeaeb2' : bucketColors[task.bucket]}` }}
            >
              <div className="flex items-start gap-3">
                <div
                  onClick={(e) => { e.stopPropagation(); toggleComplete(task) }}
                  className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-colors ${
                    task.completed
                      ? 'bg-[#34c759] border-[#34c759]'
                      : 'border-[#aeaeb2]'
                  }`}
                >
                  {task.completed && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M3 7.5L5.5 10L11 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-[15px] ${task.completed ? 'line-through text-[#aeaeb2]' : ''}`}>
                    {task.familyId && <span className="inline-block mr-1 align-middle">👨‍👩‍👧‍👧</span>}
                    {task.title}
                  </p>
                  <p className="text-text-secondary text-[13px] mt-1">
                    {typeLabels[task.type] || task.type}
                    {task.dueDate && ` • ${formatDate(task.dueDate)}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showAdd || showEdit !== null} onClose={() => { setShowAdd(false); setShowEdit(null) }}>
        <h3 className="text-xl font-bold mb-2">{showEdit ? 'Редактировать' : 'Новая'} задача</h3>
        <p className="text-text-secondary text-sm mb-5">
          {showEdit ? 'Измените поля задачи' : 'Добавьте новую задачу'}
        </p>
        <div className="flex flex-col gap-3">
          <input placeholder="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
            {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={form.bucket} onChange={(e) => setForm({ ...form, bucket: e.target.value })} className="input-field">
            {buckets.map((b) => <option key={b} value={b}>{bucketLabels[b]}</option>)}
          </select>
          <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="input-field" />
          <div className="flex gap-2 mt-2">
            {showEdit && (
              <button onClick={() => remove(showEdit.id)} className="btn btn-danger flex-1">
                Удалить
              </button>
            )}
            <button onClick={() => save(showEdit?.id)} disabled={!form.title} className="btn flex-1">
              Сохранить
            </button>
          </div>
        </div>
      </Modal>

      <style jsx>{`
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .btn {
          background: #007aff;
          color: white;
          border: none;
          border-radius: 20px;
          padding: 10px 20px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .btn:active {
          transform: scale(0.97);
        }
        .btn-danger {
          background: #ffebea;
          color: #ff3b30;
        }
        .btn:disabled {
          opacity: 0.4;
        }
        .day-chip {
          padding: 8px 18px;
          border-radius: 20px;
          background: #f2f2f7;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          white-space: nowrap;
          color: #1d1d1f;
        }
        .day-chip.selected {
          background: #007aff;
          color: white;
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}

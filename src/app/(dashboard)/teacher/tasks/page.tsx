'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui'

interface Task {
  id: string
  title: string
  type: string
  bucket: string
  dueDate: string | null
  completed: boolean
}

const typeIcons: Record<string, string> = {
  call: '📞', meeting: '📅', finance: '💰', schedule: '📋',
  student: '👨‍🎓', documents: '📄', other: '📝',
}

const typeLabels: Record<string, string> = {
  call: 'Звонок', meeting: 'Встреча', finance: 'Финансы',
  schedule: 'Расписание', student: 'Ученик', documents: 'Документы', other: 'Свободная',
}

const bucketIcons: Record<string, string> = { today: '🔥', later: '📅', waiting: '⏳' }
const bucketLabels: Record<string, string> = { today: 'Сегодня', later: 'Позже', waiting: 'Ожидание' }
const bucketColors: Record<string, string> = { today: '#ff9500', later: '#f59e0b', waiting: '#3b82f6' }

const today = new Date()
const defaultDue = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0')

export default function TeacherTasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [teacherName, setTeacherName] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [form, setForm] = useState({ title: '', type: 'other', bucket: 'today', dueDate: defaultDue })
  const [saving, setSaving] = useState(false)

  const loadTasks = async () => {
    const res = await globalThis.fetch('/api/tasks')
    if (res.ok) setTasks(await res.json())
  }

  useEffect(() => {
    globalThis.fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(d => {
      if (d) setTeacherName(d.teacher?.fullName || d.email.split('@')[0])
    })
    loadTasks()
  }, [])

  const filteredTasks = tasks.filter(t => {
    if (activeFilter === 'completed') return t.completed
    if (activeFilter === 'today') return t.bucket === 'today'
    if (activeFilter === 'later') return t.bucket === 'later'
    if (activeFilter === 'waiting') return t.bucket === 'waiting'
    if (searchQuery) return t.title.toLowerCase().includes(searchQuery.toLowerCase())
    return true
  })

  const getBucketTasks = (bucket: string) =>
    filteredTasks.filter(t => t.bucket === bucket)

  const getBucketCount = (bucket: string) =>
    tasks.filter(t => t.bucket === bucket && !t.completed).length

  const todayTotal = tasks.filter(t => t.bucket === 'today').length
  const todayDone = tasks.filter(t => t.bucket === 'today' && t.completed).length
  const progress = todayTotal === 0 ? 0 : Math.round((todayDone / todayTotal) * 100)

  const toggleComplete = async (task: Task) => {
    await globalThis.fetch('/api/tasks/' + task.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    })
    loadTasks()
  }

  const saveTask = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const url = editTask ? '/api/tasks/' + editTask.id : '/api/tasks'
    const method = editTask ? 'PUT' : 'POST'
    await globalThis.fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setShowAdd(false)
    setEditTask(null)
    setForm({ title: '', type: 'other', bucket: 'today', dueDate: defaultDue })
    loadTasks()
  }

  const deleteTask = async (id: string) => {
    if (!confirm('Удалить задачу?')) return
    await globalThis.fetch('/api/tasks/' + id, { method: 'DELETE' })
    setEditTask(null)
    loadTasks()
  }

  const openEdit = (task: Task) => {
    setForm({
      title: task.title,
      type: task.type,
      bucket: task.bucket,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : defaultDue,
    })
    setEditTask(task)
  }

  const hour = today.getHours()
  const greeting = hour >= 6 && hour < 12 ? 'Доброе утро' :
    hour >= 12 && hour < 17 ? 'Добрый день' :
    hour >= 17 && hour < 22 ? 'Добрый вечер' : 'Доброй ночи'
  const dateStr = today.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-5 pb-24">
      {/* Greeting */}
      <div className="mb-6">
        <p className="text-[13px] text-text-secondary font-medium mb-1">{dateStr}</p>
        <p className="text-[20px] font-bold">{greeting},</p>
        <p className="text-[26px] font-extrabold -tracking-[0.5px] text-text">{teacherName || 'Педагог'}</p>
      </div>

      {/* Stats card */}
      <div className="bg-white/85 backdrop-blur-xl rounded-[20px] p-5 mb-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-white/50 flex items-center gap-4">
        <div className="relative w-[72px] h-[72px] shrink-0">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="31" fill="none" stroke="#f3f4f6" strokeWidth="5" />
            <circle cx="36" cy="36" r="31" fill="none" stroke="url(#progressGrad)" strokeWidth="5"
              strokeLinecap="round" strokeDasharray={2 * Math.PI * 31}
              strokeDashoffset={2 * Math.PI * 31 - (progress / 100) * 2 * Math.PI * 31}
              transform="rotate(-90 36 36)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
          </svg>
          <svg width="0" height="0" className="absolute">
            <defs>
              <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[17px] font-bold">{progress}%</span>
        </div>
        <div>
          <p className="font-semibold text-[14px]">Продуктивность</p>
          <p className="text-[13px] text-text-secondary mt-0.5">
            {todayTotal === 0 ? 'Нет задач на сегодня' :
             progress === 100 ? 'Все задачи выполнены!' :
             'Выполнено ' + todayDone + ' из ' + todayTotal}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white/85 backdrop-blur-xl rounded-[20px] p-3 px-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-white/50 flex items-center gap-2">
        <span className="text-[15px]">🔍</span>
        <input type="text" placeholder="Поиск задач..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-none bg-transparent outline-none text-[14px] w-full font-inherit text-text" />
      </div>

      {/* Quick filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto scrollbar-none">
        {[
          { key: 'all', label: 'Все' },
          { key: 'today', label: 'Сегодня' },
          { key: 'later', label: 'Позже' },
          { key: 'waiting', label: 'Ожидание' },
          { key: 'completed', label: 'Выполнено' },
        ].map(f => (
          <button key={f.key} onClick={() => setActiveFilter(f.key)}
            className={'whitespace-nowrap px-4 py-[7px] rounded-full text-[13px] font-semibold border-none cursor-pointer transition-all ' +
              (activeFilter === f.key ? 'bg-blue text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : 'bg-[#f2f2f7] text-text-secondary')}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Task sections */}
      {['today', 'later', 'waiting'].map(bucket => {
        const bucketTasks = getBucketTasks(bucket)
        const count = getBucketCount(bucket)
        const show = activeFilter === 'all' || activeFilter === bucket || (activeFilter === 'completed' && bucketTasks.length > 0)
        if (!show && activeFilter !== 'completed') return null
        if (activeFilter === 'completed' && bucketTasks.length === 0) return null

        return (
          <div key={bucket} className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[15px] font-bold flex items-center gap-2">
                <span>{bucketIcons[bucket]}</span> {bucketLabels[bucket]}
              </p>
              <span className="text-[12px] text-text-secondary bg-white/80 rounded-full px-3 py-1 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                {count}
              </span>
            </div>

            {bucketTasks.length === 0 ? (
              <div className="text-center py-8 text-text-secondary text-[14px]">
                <p className="text-3xl mb-1 opacity-50">{bucketIcons[bucket]}</p>
                <p>Нет задач в «{bucketLabels[bucket]}»</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {bucketTasks.map(task => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
                  return (
                    <div key={task.id} onClick={() => openEdit(task)}
                      className="bg-white/85 backdrop-blur-xl rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-white/50 cursor-pointer active:scale-[0.98] transition-all flex items-start gap-3"
                      style={{ borderLeft: '4px solid ' + bucketColors[bucket] }}>
                      <div onClick={(e) => { e.stopPropagation(); toggleComplete(task) }}
                        className={'mt-0.5 w-6 h-6 rounded-full border-2 shrink-0 cursor-pointer flex items-center justify-center transition-all ' +
                          (task.completed ? 'bg-[#34c759] border-[#34c759]' : 'border-[#d1d5db]')}>
                        {task.completed && <span className="text-white text-[12px]">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={'text-[15px] font-semibold ' + (task.completed ? 'line-through text-text-secondary' : '')}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold px-[8px] py-[2px] rounded-full bg-[#f3f4f6] inline-flex items-center gap-1">
                            {typeIcons[task.type] || '📝'} {typeLabels[task.type] || task.type}
                          </span>
                          {task.dueDate && (
                            <span className={'text-[11px] flex items-center gap-1 ' + (isOverdue ? 'text-red font-semibold' : 'text-text-secondary')}>
                              📅 {new Date(task.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* FAB */}
      <button onClick={() => { setEditTask(null); setForm({ title: '', type: 'other', bucket: 'today', dueDate: defaultDue }); setShowAdd(true) }}
        className="fixed bottom-[100px] left-1/2 -translate-x-1/2 z-40 w-[60px] h-[60px] rounded-full bg-gradient-to-br from-blue to-purple-500 text-white text-[30px] font-light border-none cursor-pointer shadow-[0_8px_32px_rgba(59,130,246,0.4)] active:scale-95 transition-all flex items-center justify-center">
        +
      </button>

      {/* Add/Edit modal */}
      <Modal isOpen={showAdd || editTask !== null} onClose={() => { setShowAdd(false); setEditTask(null) }}>
        <p className="text-[22px] font-bold mb-5">{editTask ? 'Редактирование' : 'Новая задача'}</p>

        <label className="text-[13px] font-semibold text-text-secondary block mb-1">Название</label>
        <input placeholder="Что нужно сделать?" value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="input-field mb-4" />

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-[13px] font-semibold text-text-secondary block mb-1">Тип</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field mb-4">
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{typeIcons[k]} {v}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[13px] font-semibold text-text-secondary block mb-1">Срок</label>
            <input type="date" value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="input-field mb-4" />
          </div>
        </div>

        <label className="text-[13px] font-semibold text-text-secondary block mb-1">Корзина</label>
        <select value={form.bucket} onChange={(e) => setForm({ ...form, bucket: e.target.value })} className="input-field mb-4">
          {Object.entries(bucketLabels).map(([k, v]) => <option key={k} value={k}>{bucketIcons[k]} {v}</option>)}
        </select>

        {editTask && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-[#f3f4f6] rounded-[14px]">
            <input type="checkbox" checked={editTask.completed}
              onChange={() => setEditTask({ ...editTask, completed: !editTask.completed })}
              className="w-5 h-5 accent-[#34c759] cursor-pointer" />
            <label className="text-[14px] font-medium cursor-pointer">Выполнено</label>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          {editTask && (
            <button onClick={() => deleteTask(editTask.id)}
              className="flex-1 py-3 rounded-[16px] border-none bg-red/10 text-red font-semibold text-[14px] cursor-pointer active:scale-[0.97]">
              🗑 Удалить
            </button>
          )}
          <button onClick={saveTask} disabled={!form.title.trim() || saving}
            className="flex-1 py-3 rounded-[16px] border-none bg-gradient-to-r from-blue to-purple-500 text-white font-semibold text-[14px] cursor-pointer active:scale-[0.97] disabled:opacity-40 transition-all">
            {saving ? 'Сохранение...' : '💾 Сохранить'}
          </button>
        </div>
      </Modal>

      <style jsx>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}

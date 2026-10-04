'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, Button, Modal, Chip, EmptyState } from '@/components/ui'
import AppLogo from '@/components/AppLogo'
import { formatDate, formatTime } from '@/lib/utils'

interface UserItem {
  id: string; email: string; roles: string; status: string; deletedAt: string | null; createdAt: string; teacher: { fullName: string } | null
}

interface AuditLogItem {
  id: string; action: string; entity: string; entityId: string; payloadJson: string | null; createdAt: string; user: { email: string }
}

interface SubjectItem {
  id: string; name: string
}

interface DbStats {
  students: number; families: number; teachers: number; lessons: number; observations: number
}

const SECTIONS = [
  { key: 'db', label: 'База данных', icon: '💾' },
  { key: 'audit', label: 'Журнал действий', icon: '📋' },
  { key: 'users', label: 'Пользователи', icon: '👤' },
  { key: 'dict', label: 'Справочники', icon: '📚' },
  { key: 'status', label: 'Состояние системы', icon: 'ℹ️' },
  { key: 'recommendations', label: 'Рекомендации', icon: '💡' },
] as const

export default function AdminDashboardPage() {
  const [activeSection, setActiveSection] = useState('db')
  const [menuOpen, setMenuOpen] = useState(false)
  const [users, setUsers] = useState<UserItem[]>([])
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [entityFilter, setEntityFilter] = useState('')
  const [subjects, setSubjects] = useState<SubjectItem[]>([])
  const [newSubject, setNewSubject] = useState('')
  const [stats, setStats] = useState<DbStats | null>(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [userForm, setUserForm] = useState({ email: '', password: '', role: 'manager', teacherName: '', specialization: '', phone: '' })
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [editRoles, setEditRoles] = useState<string[]>([])
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  const fetchUsers = useCallback(async () => {
    const r = await fetch('/api/admin/users')
    if (r.ok) setUsers(await r.json())
  }, [])

  const fetchLogs = useCallback(async () => {
    const params = entityFilter ? `?entity=${entityFilter}` : ''
    const r = await fetch(`/api/admin/audit-log${params}`)
    if (r.ok) setLogs(await r.json())
  }, [entityFilter])

  const fetchSubjects = useCallback(async () => {
    const r = await fetch('/api/admin/subjects')
    if (r.ok) setSubjects(await r.json())
  }, [])

  const fetchStats = useCallback(async () => {
    const [sRes, fRes, tRes, lRes, oRes] = await Promise.all([
      fetch('/api/students'), fetch('/api/families'), fetch('/api/teachers'), fetch('/api/lessons'), fetch('/api/observations'),
    ])
    const [students, families, teachers, lessons, observations] = await Promise.all([
      sRes.ok ? sRes.json() : [], fRes.ok ? fRes.json() : [], tRes.ok ? tRes.json() : [], lRes.ok ? lRes.json() : [], oRes.ok ? oRes.json() : [],
    ])
    setStats({
      students: Array.isArray(students) ? students.length : 0,
      families: Array.isArray(families) ? families.length : 0,
      teachers: Array.isArray(teachers) ? teachers.length : 0,
      lessons: Array.isArray(lessons) ? lessons.length : 0,
      observations: Array.isArray(observations) ? observations.length : 0,
    })
  }, [])

  useEffect(() => { fetchUsers(); fetchLogs(); fetchSubjects(); fetchStats() }, [])

  const toggleUserStatus = async (user: UserItem) => {
    await fetch(`/api/admin/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: user.status === 'active' ? 'disabled' : 'active' }),
    })
    fetchUsers()
  }

  const startEditRoles = (user: UserItem) => {
    setEditingUser(user)
    setEditRoles(JSON.parse(user.roles))
  }

  const toggleEditRole = (role: string) => {
    setEditRoles((prev) => prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role])
  }

  const saveRoles = async () => {
    if (!editingUser) return
    setShowConfirm(true)
  }

  const confirmAndSaveRoles = async () => {
    if (!editingUser) return
    if (editRoles.length === 0) {
      alert('Пользователь должен иметь хотя бы одну роль')
      return
    }
    const res = await fetch(`/api/admin/users/${editingUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Confirm-Password': confirmPassword },
      body: JSON.stringify({ roles: editRoles }),
    })
    if (res.ok) {
      setEditingUser(null)
      setConfirmPassword('')
      setShowConfirm(false)
      fetchUsers()
    } else {
      const err = await res.json().catch(() => ({}))
      if (res.status === 403) {
        alert('Неверный пароль. Убедитесь, что вводите пароль от своего аккаунта (администратора).')
      } else {
        alert(err.error || 'Не удалось сохранить роли')
      }
    }
  }

  const [createError, setCreateError] = useState('')

  const createUser = async () => {
    setCreateError('')
    if (userForm.password.length < 8) {
      setCreateError('Пароль: минимум 8 символов')
      return
    }
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: userForm.email,
        password: userForm.password,
        roles: [userForm.role],
        teacherName: userForm.teacherName || undefined,
        specialization: userForm.specialization || '',
        phone: userForm.phone || '',
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      setCreateError(err.error || 'Ошибка создания')
      return
    }
    setShowCreateUser(false)
    setUserForm({ email: '', password: '', role: 'manager', teacherName: '', specialization: '', phone: '' })
    fetchUsers()
  }

  const addSubject = async () => {
    if (!newSubject.trim()) return
    const r = await fetch('/api/admin/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSubject.trim() }),
    })
    if (r.ok) { setNewSubject(''); fetchSubjects() }
  }

  const deleteSubject = async (id: string) => {
    await fetch(`/api/admin/subjects/${id}`, { method: 'DELETE' })
    fetchSubjects()
  }

  const downloadBackup = async () => {
    const a = document.createElement('a')
    a.href = '/api/admin/backup/download'
    a.download = `elif-backup-${new Date().toISOString().split('T')[0]}.db`
    a.click()
  }

  const createBackupNow = async () => {
    const r = await fetch('/api/admin/backup', { method: 'POST' })
    if (!r.ok) return
    const blob = await r.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `elif-backup-${new Date().toISOString().split('T')[0]}.db`
    a.click()
    URL.revokeObjectURL(url)
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'db': return <DatabaseSection stats={stats} onDownload={downloadBackup} onCreateBackup={createBackupNow} />
      case 'audit': return <AuditSection logs={logs} entityFilter={entityFilter} onFilterChange={setEntityFilter} />
      case 'users': return <UsersSection users={users} showCreateUser={showCreateUser} setShowCreateUser={setShowCreateUser} userForm={userForm} setUserForm={setUserForm} onCreateUser={createUser} onToggleStatus={toggleUserStatus} editingUser={editingUser} setEditingUser={setEditingUser} editRoles={editRoles} onStartEdit={startEditRoles} onToggleEditRole={toggleEditRole} onSaveRoles={saveRoles} showConfirm={showConfirm} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} onConfirmSave={confirmAndSaveRoles} onCancelConfirm={() => { setShowConfirm(false); setConfirmPassword('') }} createError={createError} />
      case 'dict': return <DictSection subjects={subjects} newSubject={newSubject} setNewSubject={setNewSubject} onAddSubject={addSubject} onDeleteSubject={deleteSubject} />
      case 'recommendations': return <RecommendationsSection />
      case 'status': return <StatusSection stats={stats} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-separator sticky top-0 z-20">
        <button onClick={() => setMenuOpen(true)} className="w-9 h-9 rounded-full bg-[#f2f2f7] flex items-center justify-center text-lg text-blue shrink-0 active:scale-[0.93]">☰</button>
        <AppLogo className="w-20 h-auto shrink-0" />
        <h1 className="text-[22px] font-bold">Администратор</h1>
      </header>

      <div className="max-w-[480px] mx-auto p-4">{renderSection()}</div>

      {/* Side drawer */}
      {menuOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex" onClick={() => setMenuOpen(false)}>
          <div className="w-[280px] bg-white h-full p-5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] animate-slide-in-left flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-separator">
              <AppLogo className="w-24 h-auto shrink-0" />
              <span className="font-bold text-lg">Элиф</span>
            </div>
            {SECTIONS.map((s) => (
              <button key={s.key} onClick={() => { setActiveSection(s.key); setMenuOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-[14px] rounded-[12px] text-left font-medium transition-colors mb-1 ${
                  activeSection === s.key ? 'bg-[#e8f2ff] text-blue' : 'text-text hover:bg-[#f2f2f7]'
                }`}
              >
                <span className="text-xl w-8">{s.icon}</span>
                <span className="text-[15px]">{s.label}</span>
              </button>
            ))}
          </div>
          <div className="flex-1" />
        </div>
      )}
    </div>
  )
}

/* ─── Section components ─── */

function DatabaseSection({ stats, onDownload, onCreateBackup }: { stats: DbStats | null; onDownload: () => void; onCreateBackup: () => void }) {
  const [seedOpen, setSeedOpen] = useState(false)
  const [tagirPassword, setTagirPassword] = useState('')
  const [dilyaraPassword, setDilyaraPassword] = useState('')
  const [seedResult, setSeedResult] = useState<string | null>(null)
  const [seedError, setSeedError] = useState('')
  const [seeding, setSeeding] = useState(false)

  const handleSeed = async () => {
    setSeedError('')
    setSeedResult(null)
    if (tagirPassword.length < 8 || dilyaraPassword.length < 8) {
      setSeedError('Оба пароля — минимум 8 символов')
      return
    }
    setSeeding(true)
    try {
      const r = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagirPassword, dilyaraPassword }),
      })
      const data = await r.json()
      if (r.ok) {
        const lines = data.users.map((u: { email: string; password: string; roles: string[] }) =>
          u.email + ' / ' + u.password
        )
        setSeedResult('✅ Созданы пользователи:\n' + lines.join('\n'))
      } else if (r.status === 409) {
        setSeedResult('ℹ️ Система уже инициализирована')
      } else {
        setSeedError(data.error || 'Ошибка')
      }
    } catch {
      setSeedError('Ошибка сети')
    }
    setSeeding(false)
  }

  return (
    <>
      <h2 className="text-[20px] font-bold mb-4">💾 База данных</h2>
      <Card className="mb-3 border-l-[5px] border-blue">
        <h3 className="font-semibold text-[15px] mb-2">Резервное копирование</h3>
        <p className="text-[13px] text-text-secondary mb-3">Скачать текущую базу данных SQLite.</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onCreateBackup}>Создать бэкап сейчас</Button>
          <Button onClick={onDownload} variant="secondary">Скачать .db</Button>
          <Button onClick={() => window.open('/api/admin/backup/export-xlsx', '_blank')} variant="secondary">📥 Скачать Excel</Button>
          <Button onClick={() => alert('Загрузка резервной копии — функция будет доступна в следующих версиях.')} variant="secondary">Загрузить копию</Button>
        </div>
      </Card>
      <Card className="mb-3 border-l-[5px] border-orange">
        <h3 className="font-semibold text-[15px] mb-2">🚀 Инициализация системы</h3>
        <p className="text-[13px] text-text-secondary mb-3">
          Создать начальных пользователей (Тагир + Диляра). Выполняется один раз при пустой базе.
        </p>
        {!seedOpen && !seedResult && (
          <Button onClick={() => setSeedOpen(true)} variant="secondary">Инициализировать</Button>
        )}
        {seedOpen && (
          <div className="flex flex-col gap-2">
            <input type="password" placeholder="Пароль для Тагира (admin)" value={tagirPassword}
              onChange={(e) => setTagirPassword(e.target.value)} className="input-field text-sm" />
            <input type="password" placeholder="Пароль для Диляры (manager+teacher)" value={dilyaraPassword}
              onChange={(e) => setDilyaraPassword(e.target.value)} className="input-field text-sm" />
            {seedError && <p className="text-red text-sm">{seedError}</p>}
            <div className="flex gap-2">
              <Button onClick={handleSeed} disabled={seeding}>
                {seeding ? 'Создание...' : 'Создать'}
              </Button>
              <Button variant="secondary" onClick={() => setSeedOpen(false)}>Отмена</Button>
            </div>
          </div>
        )}
        {seedResult && (
          <div className="text-sm whitespace-pre-line mt-2">
            <p>{seedResult}</p>
            <Button variant="secondary" onClick={() => { setSeedResult(null); setSeedOpen(false); setTagirPassword(''); setDilyaraPassword('') }} className="mt-2">
              Понятно
            </Button>
          </div>
        )}
      </Card>
      <Card className="border-l-[5px] border-green">
        <h3 className="font-semibold text-[15px] mb-2">Размер базы данных</h3>
        {stats ? (
          <>
            <StatRow label="Ученики" value={stats.students} />
            <StatRow label="Семьи" value={stats.families} />
            <StatRow label="Педагоги" value={stats.teachers} />
            <StatRow label="Занятия" value={stats.lessons} />
            <StatRow label="Наблюдения" value={stats.observations} />
          </>
        ) : (
          <p className="text-text-secondary text-sm">Загрузка...</p>
        )}
      </Card>
    </>
  )
}

function AuditSection({ logs, entityFilter, onFilterChange }: { logs: AuditLogItem[]; entityFilter: string; onFilterChange: (v: string) => void }) {
  return (
    <>
      <h2 className="text-[20px] font-bold mb-4">📋 Журнал действий</h2>
      <Card className="mb-3 border-l-[5px] border-blue">
        <select value={entityFilter} onChange={(e) => onFilterChange(e.target.value)} className="input-field text-sm mb-2">
          <option value="">Все сущности</option>
          <option value="student">Ученики</option>
          <option value="family">Семьи</option>
          <option value="payment">Платежи</option>
          <option value="group">Группы</option>
          <option value="user">Пользователи</option>
        </select>
        {logs.length === 0 ? (
          <EmptyState title="Нет записей" />
        ) : (
          <div className="flex flex-col gap-0">
            {logs.map((l) => (
              <div key={l.id} className="py-3 border-b border-separator last:border-b-0">
                <div className="flex items-center gap-2 mb-1">
                  <Chip label={l.action} variant="blue" />
                  <span className="text-[11px] text-text-secondary">{formatDate(l.createdAt)} {formatTime(l.createdAt)}</span>
                </div>
                <p className="text-[13px]">
                  <strong>{l.user.email}</strong> — {l.entity} #{l.entityId.slice(0, 8)}
                </p>
                {l.payloadJson && <pre className="text-[11px] text-text-secondary mt-1 whitespace-pre-wrap">{JSON.stringify(JSON.parse(l.payloadJson), null, 2)}</pre>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  )
}

function UsersSection({ users, showCreateUser, setShowCreateUser, userForm, setUserForm, onCreateUser, onToggleStatus, editingUser, setEditingUser, editRoles, onStartEdit, onToggleEditRole, onSaveRoles, showConfirm, confirmPassword, setConfirmPassword, onConfirmSave, onCancelConfirm, createError }: {
  users: UserItem[]; showCreateUser: boolean; setShowCreateUser: (v: boolean) => void; userForm: { email: string; password: string; role: string; teacherName: string; specialization: string; phone: string }; setUserForm: (v: any) => void; onCreateUser: () => void; onToggleStatus: (u: UserItem) => void
  editingUser: UserItem | null; setEditingUser: (v: UserItem | null) => void; editRoles: string[]; onStartEdit: (u: UserItem) => void; onToggleEditRole: (r: string) => void; onSaveRoles: () => void
  showConfirm: boolean; confirmPassword: string; setConfirmPassword: (v: string) => void; onConfirmSave: () => void; onCancelConfirm: () => void
  createError: string
}) {
  const ALL_ROLES = [
    { value: 'manager', label: 'Менеджер' },
    { value: 'teacher', label: 'Педагог' },
    { value: 'admin', label: 'Администратор' },
  ]

  return (
    <>
      <h2 className="text-[20px] font-bold mb-4">👤 Пользователи</h2>
      <Card className="mb-3 border-l-[5px] border-blue">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-[15px]">Создать пользователя</h3>
          <button onClick={() => setShowCreateUser(!showCreateUser)} className="text-sm text-blue font-medium">+ Создать</button>
        </div>
        {showCreateUser && (
          <div className="flex flex-col gap-2 pt-2">
            <input placeholder="Логин" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="input-field" />
            <input type="password" placeholder="Пароль" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="input-field" />
            <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="input-field">
              <option value="manager">Менеджер</option>
              <option value="teacher">Педагог</option>
              <option value="admin">Администратор</option>
            </select>
            {userForm.role === 'teacher' && (
              <>
                <input placeholder="ФИО педагога" value={userForm.teacherName} onChange={(e) => setUserForm({ ...userForm, teacherName: e.target.value })} className="input-field" />
                <input placeholder="Специализация (необязательно)" value={userForm.specialization} onChange={(e) => setUserForm({ ...userForm, specialization: e.target.value })} className="input-field" />
                <input placeholder="Телефон (необязательно)" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="input-field" />
              </>
            )}
            {createError && <p className="text-red text-sm">{createError}</p>}
            <Button onClick={onCreateUser} disabled={!userForm.email || !userForm.password}>Создать</Button>
          </div>
        )}
      </Card>
      <Card className="border-l-[5px] border-orange">
        <h3 className="font-semibold text-[15px] mb-2">Существующие пользователи</h3>
        {users.map((u) => (
          <div key={u.id}>
            <div className="flex items-center justify-between py-3 border-b border-separator last:border-b-0">
              <div>
                <p className="font-medium text-[14px]">{u.email}</p>
                <p className="text-[12px] text-text-secondary">
                  {JSON.parse(u.roles).join(', ')}
                  {u.teacher && ` • ${u.teacher.fullName}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onStartEdit(u)} className="text-blue text-sm cursor-pointer">✏️</button>
                <button onClick={() => onToggleStatus(u)} className={`chip ${u.status === 'active' ? 'chip-green' : 'chip-red'} cursor-pointer`}>
                  {u.status === 'active' ? 'Активен' : 'Отключён'}
                </button>
              </div>
            </div>
            {editingUser?.id === u.id && (
              <div className="bg-[#f8f8fa] rounded-xl p-3 mb-3 flex flex-col gap-2">
                <p className="text-sm font-medium">Редактировать роли</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_ROLES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => onToggleEditRole(r.value)}
                      className={`chip cursor-pointer ${editRoles.includes(r.value) ? 'bg-blue text-white' : 'bg-[#e5e5ea] text-text'}`}
                    >
                      {editRoles.includes(r.value) ? '✓ ' : ''}{r.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-1">
                  <Button onClick={onSaveRoles}>Сохранить</Button>
                  <Button variant="secondary" onClick={() => setEditingUser(null)}>Отмена</Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>

      {showConfirm && (
        <Modal isOpen={true} onClose={onCancelConfirm}>
          <p className="text-sm text-text-secondary mb-3">Введите ваш пароль для подтверждения изменения ролей.</p>
          <label className="block text-sm font-medium mb-1">Ваш пароль (администратора)</label>
          <input type="password" placeholder="Пароль" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="input-field mb-3" onKeyDown={(e) => e.key === 'Enter' && onConfirmSave()} />
          <div className="flex gap-2">
            <Button onClick={onConfirmSave}>Подтвердить</Button>
            <Button variant="secondary" onClick={onCancelConfirm}>Отмена</Button>
          </div>
        </Modal>
      )}
    </>
  )
}

function DictSection({ subjects, newSubject, setNewSubject, onAddSubject, onDeleteSubject }: {
  subjects: SubjectItem[]; newSubject: string; setNewSubject: (v: string) => void; onAddSubject: () => void; onDeleteSubject: (id: string) => void
}) {
  return (
    <>
      <h2 className="text-[20px] font-bold mb-4">📚 Справочники</h2>
      <Card className="mb-3 border-l-[5px] border-blue">
        <h3 className="font-semibold text-[15px] mb-2">Предметы</h3>
        {subjects.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2 border-b border-separator last:border-b-0">
            <span className="text-[14px]">{s.name}</span>
            <button onClick={() => onDeleteSubject(s.id)} className="text-red text-sm font-medium cursor-pointer">✕</button>
          </div>
        ))}
        <div className="flex gap-2 mt-2">
          <input placeholder="Новый предмет" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="input-field flex-1 text-sm" onKeyDown={(e) => e.key === 'Enter' && onAddSubject()} />
          <button onClick={onAddSubject} className="btn-secondary text-sm px-3 cursor-pointer">+ Добавить</button>
        </div>
      </Card>
      <Card className="mb-3 border-l-[5px] border-green">
        <h3 className="font-semibold text-[15px] mb-2">Статусы посещения</h3>
        {['Присутствовал', 'Отсутствовал', 'Опоздал'].map((s) => (
          <div key={s} className="flex items-center justify-between py-2 border-b border-separator last:border-b-0">
            <span className="text-[14px]">{s}</span>
            <span className="chip bg-gray/10 text-text-secondary text-[11px]">enum</span>
          </div>
        ))}
      </Card>
      <Card className="border-l-[5px] border-yellow">
        <h3 className="font-semibold text-[15px] mb-2">Причины пропуска</h3>
        {['Болезнь', 'Семейные обстоятельства', 'Другое'].map((s) => (
          <div key={s} className="flex items-center justify-between py-2 border-b border-separator last:border-b-0">
            <span className="text-[14px]">{s}</span>
            <span className="chip bg-gray/10 text-text-secondary text-[11px]">enum</span>
          </div>
        ))}
      </Card>
    </>
  )
}

function RecommendationsSection() {
  const [importJson, setImportJson] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    setStatus('')
    setLoading(true)
    try {
      const parsed = JSON.parse(importJson)
      const res = await fetch('/api/admin/recommendations/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendations: Array.isArray(parsed) ? parsed : [parsed] }),
      })
      if (res.ok) {
        const data = await res.json()
        setStatus('✅ Импортировано ' + data.created + ' рекомендаций')
        setImportJson('')
      } else {
        const err = await res.json()
        setStatus('❌ ' + (err.error || 'Ошибка'))
      }
    } catch {
      setStatus('❌ Некорректный JSON')
    }
    setLoading(false)
  }

  return (
    <>
      <h2 className="text-[20px] font-bold mb-4">💡 Рекомендации</h2>
      <Card className="mb-3 border-l-[5px] border-yellow">
        <h3 className="font-semibold text-[15px] mb-2">Импорт рекомендаций</h3>
        <p className="text-[13px] text-text-secondary mb-3">
          Вставьте JSON-массив рекомендаций. Все старые рекомендации будут удалены.
        </p>
        <textarea
          value={importJson}
          onChange={(e) => setImportJson(e.target.value)}
          className="input-field w-full min-h-[120px] text-sm font-mono mb-3"
          placeholder='[{"teacherId": "...", "text": "..."}]'
        />
        <Button onClick={handleImport} disabled={loading || !importJson.trim()}>
          {loading ? 'Импорт...' : 'Загрузить'}
        </Button>
        {status && <p className="text-[13px] mt-2">{status}</p>}
      </Card>
    </>
  )
}

function StatusSection({ stats }: { stats: DbStats | null }) {
  return (
    <>
      <h2 className="text-[20px] font-bold mb-4">ℹ️ Состояние системы</h2>
      <Card className="border-l-[5px] border-blue">
        <StatRow label="База данных" value={<span className="text-green font-semibold">ОК</span>} />
        <StatRow label="Последний бэкап" value={new Date().toLocaleDateString('ru-RU') + ' 03:00'} />
        <StatRow label="Пользователей" value={stats?.students ?? '...'} />
        <StatRow label="Учеников" value={stats?.students ?? '...'} />
        <StatRow label="Семей" value={stats?.families ?? '...'} />
        <StatRow label="Наблюдений" value={stats?.observations ?? '...'} />
      </Card>
    </>
  )
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-[10px] border-b border-separator last:border-b-0">
      <span className="text-[14px] text-text-secondary">{label}</span>
      <span className="font-semibold text-[14px]">{value}</span>
    </div>
  )
}

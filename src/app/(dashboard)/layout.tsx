'use client'

import { ReactNode, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { TabBar } from '@/components/ui'
import AppLogo from '@/components/AppLogo'

interface UserInfo {
  id: string
  email: string
  roles: string[]
  teacher?: { id: string; fullName: string } | null
}

const managerTabs = [
  { key: '/manager/today', label: 'Сегодня', icon: '🏠' },
  { key: '/manager/tasks', label: 'Задачи', icon: '✅' },
  { key: '/manager/students', label: 'Ученики', icon: '👤' },
  { key: '/manager/lessons', label: 'Занятия', icon: '📅' },
  { key: '/manager/more', label: 'Ещё', icon: '⚙️' },
]

const teacherTabs = [
  { key: '/teacher/today', label: 'Сегодня', icon: '🏠' },
  { key: '/teacher/tasks', label: 'Задачи', icon: '✅' },
  { key: '/teacher/students', label: 'Ученики', icon: '👤' },
  { key: '/teacher/observations', label: 'Наблюдения', icon: <span className="text-xl">👀</span> },
]

function ProfileMenu({ user, onLogout }: { user: UserInfo; onLogout: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-blue text-white text-sm font-semibold flex items-center justify-center"
      >
        {(user.teacher?.fullName?.[0] || user.email[0]).toUpperCase()}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-12 z-50 bg-white rounded-2xl shadow-lg p-4 w-64 animate-slide-in">
            {user.teacher?.fullName && <p className="font-semibold text-sm">{user.teacher.fullName}</p>}
            <p className="font-medium text-sm truncate">{user.email}</p>
            <p className="text-text-secondary text-xs mt-1">
              {user.roles.join(', ')}
            </p>
            <hr className="my-3 border-separator" />
            <button
              onClick={onLogout}
              className="text-red text-sm font-medium w-full text-left"
            >
              Выйти
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<UserInfo | null>(null)

  useEffect(() => {
    const init = async () => {
      // Refresh token first, then load user
      try { await fetch('/api/auth/refresh', { method: 'POST' }) } catch {}
      const res = await fetch('/api/auth/me')
      if (res.ok) setUser(await res.json())
    }
    init()

    const interval = setInterval(async () => {
      try { await fetch('/api/auth/refresh', { method: 'POST' }) } catch {}
    }, 10 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  const isTeacher = pathname.startsWith('/teacher')
  const isManager = pathname.startsWith('/manager')
  const isAdmin = pathname.startsWith('/admin')
  const role = isTeacher ? 'teacher' : 'manager'

  const tabs = role === 'teacher' ? teacherTabs : managerTabs

  const handleTabChange = (key: string) => {
    router.push(key)
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const otherRole = user?.roles.includes('teacher') && isManager
    ? 'teacher'
    : user?.roles.includes('manager') && isTeacher
      ? 'manager'
      : null

  return (
    <div className={`min-h-screen bg-bg ${isAdmin ? '' : 'pb-20'}`}>
      <div className="max-w-[480px] mx-auto">
        <header className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <AppLogo className="w-48 h-auto shrink-0" />
            {otherRole && (
              <button
                onClick={() => router.push(`/${otherRole}/today`)}
                className="text-xs text-blue font-medium"
              >
                Переключиться на {otherRole === 'teacher' ? 'педагога' : 'менеджера'}
              </button>
            )}
          </div>
          {user && <ProfileMenu user={user} onLogout={handleLogout} />}
        </header>
        {children}
      </div>
      {!isAdmin && <TabBar tabs={tabs} active={pathname} onTabChange={handleTabChange} />}
    </div>
  )
}

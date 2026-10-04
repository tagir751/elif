'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    fetch('/api/auth/me', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('not authenticated')
        return res.json()
      })
      .then((data) => {
        const roles: string[] = data.roles
        if (roles.includes('admin')) router.push('/admin')
        else if (roles.includes('manager')) router.push('/manager/today')
        else if (roles.includes('teacher')) router.push('/teacher/today')
        else router.push('/login')
      })
      .catch(() => {
        setChecking(false)
      })
      .finally(() => clearTimeout(timeout))

    return () => { clearTimeout(timeout); controller.abort() }
  }, [router])

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <h1 className="text-3xl font-bold mb-2">Элиф</h1>
        <p className="text-text-secondary">Загрузка...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-2">Элиф</h1>
      <p className="text-text-secondary mb-8">Управление образовательным центром</p>
      <a href="/login" className="btn-primary w-full text-center max-w-xs">
        Войти
      </a>
    </div>
  )
}

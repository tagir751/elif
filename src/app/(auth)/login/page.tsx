'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLogo from '@/components/AppLogo'

const rolePriority = ['admin', 'manager', 'teacher'] as const
const roleRedirect: Record<string, string> = {
  admin: '/admin',
  manager: '/manager/today',
  teacher: '/teacher/today',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 20000)

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Ошибка входа')
        setLoading(false)
        return
      }

      const data = await res.json()
      const roles: string[] = data.user.roles

      for (const role of rolePriority) {
        if (roles.includes(role)) {
          const dest = roleRedirect[role]
          if (dest) {
            setLoading(false)
            router.push(dest)
            return
          }
        }
      }

      setLoading(false)
      router.push('/')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Сервер не отвечает. Попробуйте позже.')
      } else {
        setError('Ошибка сети. Проверьте подключение.')
      }
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen p-6">
      <AppLogo className="w-full h-auto max-h-48 mb-4" />
      <div className="flex flex-col items-center justify-center flex-1">
      <p className="text-text-secondary mb-8">Вход в систему</p>

      <form onSubmit={handleSubmit} className="w-full max-w-xs flex flex-col gap-4">
        <input
          type="text"
          placeholder="Логин"
          autoComplete="off"
          name="email-login"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-field"
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          autoComplete="new-password"
          name="password-login"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-field"
          required
        />

        {error && <p className="text-red text-sm text-center">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Вход...' : 'Войти'}
        </button>
      </form>
      </div>
    </div>
  )
}

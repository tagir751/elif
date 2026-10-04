import { redirect } from 'next/navigation'

export function getRoleRedirect(roles: string[]): string {
  if (roles.includes('admin')) return '/admin'
  if (roles.includes('manager')) return '/manager/today'
  if (roles.includes('teacher')) return '/teacher/today'
  return '/login'
}

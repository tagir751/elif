'use client'

import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui'


const links: { label: string; path: string; icon: React.ReactNode }[] = [
  { label: 'Группы', path: '/manager/groups', icon: <span className="text-2xl">👥</span> },
  { label: 'Семьи', path: '/manager/families', icon: <span className="text-2xl">👨‍👩‍👧‍👧</span> },
  { label: 'Педагоги', path: '/manager/teachers', icon: <span className="text-2xl">👨‍🏫</span> },
  { label: 'Кабинеты', path: '/manager/rooms', icon: <span className="text-2xl">🚪</span> },
  { label: 'Наблюдения', path: '/manager/observations', icon: <span className="text-2xl">👀</span> },
]

export default function MorePage() {
  const router = useRouter()

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Ещё</h1>
      <div className="flex flex-col gap-3">
        {links.map((l) => (
          <Card key={l.path} onClick={() => router.push(l.path)} className="border-l-[5px] border-blue">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8">{l.icon}</span>
              <span className="font-semibold text-[16px]">{l.label}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

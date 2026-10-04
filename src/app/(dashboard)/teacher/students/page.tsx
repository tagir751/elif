'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, EmptyState } from '@/components/ui'

interface Student {
  id: string
  firstName: string
  lastName: string
  birthDate: string
  enrollments: { group: { name: string } }[]
}

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const router = useRouter()

  useEffect(() => {
    globalThis.fetch('/api/students')
      .then((r) => r.ok ? r.json() : [])
      .then(setStudents)
  }, [])

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Мои ученики</h1>

      {students.length === 0 ? (
        <EmptyState title="Нет учеников" />
      ) : (
        <div className="flex flex-col gap-3">
          {students.map((s) => (
            <Card key={s.id} onClick={() => router.push(`/manager/students/${s.id}`)} className="border-l-[5px] border-blue">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-blue text-white flex items-center justify-center text-sm font-semibold">
                    {s.firstName[0]}{s.lastName[0]}
                  </div>
                  <div className="absolute -top-0.5 -right-0.5 w-[14px] h-[14px] rounded-full bg-[#aeaeb2] border-2 border-white shadow-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[16px] truncate">{s.lastName} {s.firstName}</p>
                  <p className="text-text-secondary text-[13px]">📚 {s.enrollments.map((e) => e.group.name).join(', ')}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

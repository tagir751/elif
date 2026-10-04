'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { formatDate, formatTime } from '@/lib/utils'

interface LessonSummary {
  id: string
  dateTime: string
  status: string
  group: { id: string; name: string }
  teacher: { id: string; fullName: string }
  room: { name: string }
  topic: string | null
}

interface StudentWithAtt {
  id: string
  firstName: string
  lastName: string
  status: string
  mark: string | null
}

interface LessonDetail {
  id: string
  dateTime: string
  status: string
  topic: string | null
  homework: string | null
  lessonNote: string | null
  hypothesis: string | null
  personalNote: string | null
  group: { id: string; name: string }
  teacher: { id: string; fullName: string }
  room: { name: string }
  attendances: {
    id: string
    status: string
    mark: string | null
    student: { id: string; firstName: string; lastName: string }
  }[]
  observations: {
    id: string
    text: string
    student: { id: string; firstName: string; lastName: string }
    teacher: { fullName: string }
  }[]
}

export default function TeacherTodayPage() {
  const router = useRouter()
  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [teacherName, setTeacherName] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [selectedLesson, setSelectedLesson] = useState<LessonDetail | null>(null)
  const [enrolledStudents, setEnrolledStudents] = useState<{ id: string; firstName: string; lastName: string }[]>([])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, string>>({})
  const [markMap, setMarkMap] = useState<Record<string, string>>({})
  const [topic, setTopic] = useState('')
  const [homework, setHomework] = useState('')
  const [lessonNote, setLessonNote] = useState('')
  const [hypothesis, setHypothesis] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [notePopup, setNotePopup] = useState<{ type: string; title: string; text: string; studentId?: string } | null>(null)
  const [aiPopup, setAiPopup] = useState<{ title: string; text: string } | null>(null)
  const [teacherRecs, setTeacherRecs] = useState<{ id: string; text: string }[]>([])
  const [studentRecs, setStudentRecs] = useState<Record<string, { id: string; text: string }[]>>({})

  const loadLessons = async () => {
    const today = new Date().toISOString().split('T')[0]
    const meRes = await globalThis.fetch('/api/auth/me')
    let tid = ''
    if (meRes.ok) {
      const me = await meRes.json()
      if (!me.roles?.includes('teacher')) {
        router.push('/manager/today')
        return
      }
      setTeacherName(me.teacher?.fullName || me.email.split('@')[0])
      tid = me.teacher?.id || ''
      setTeacherId(tid)
    }

    const res = await globalThis.fetch(`/api/lessons?date=${today}${tid ? `&teacherId=${tid}` : ''}`)
    if (res.ok) {
      const data = await res.json()
      setLessons(data)
    }
  }

  useEffect(() => { loadLessons() }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setNotePopup(null); setAiPopup(null) }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const openLesson = async (lessonId: string) => {
    const res = await globalThis.fetch(`/api/lessons/${lessonId}`)
    if (!res.ok) return
    const data: LessonDetail = await res.json()
    setSelectedLesson(data)
    setTopic(data.topic || '')
    setHomework(data.homework || '')
    setLessonNote(data.lessonNote || '')
    setHypothesis(data.hypothesis || '')
    setPersonalNote(data.personalNote || '')

    const attMap: Record<string, string> = {}
    const mMap: Record<string, string> = {}
    data.attendances.forEach((a) => {
      attMap[a.student.id] = a.status
      if (a.mark) mMap[a.student.id] = a.mark
    })

    // Fetch enrolled students from the group
    const gRes = await globalThis.fetch(`/api/groups/${data.group.id}`)
    let enrolled: { id: string; firstName: string; lastName: string }[] = []
    if (gRes.ok) {
      const group = await gRes.json()
      enrolled = (group.enrollments || []).map((e: { student: { id: string; firstName: string; lastName: string } }) => e.student)
    } else {
      enrolled = data.attendances.map(a => a.student)
    }
    setEnrolledStudents(enrolled)

    // Default all enrolled students to 'present'
    enrolled.forEach(s => {
      if (!attMap[s.id]) attMap[s.id] = 'present'
    })
    setAttendanceMap(attMap)
    setMarkMap(mMap)

    // Fetch recommendations
    if (teacherId) {
      globalThis.fetch(`/api/recommendations?teacherId=${teacherId}`)
        .then(r => r.ok ? r.json() : [])
        .then(setTeacherRecs)
    }
    const sids = data.attendances.map(a => a.student.id)
    if (sids.length > 0) {
      globalThis.fetch(`/api/recommendations?studentIds=${sids.join(',')}`)
        .then(r => r.ok ? r.json() : [])
        .then((recs: { studentId: string; id: string; text: string }[]) => {
          const map: Record<string, { id: string; text: string }[]> = {}
          recs.forEach(r => {
            if (!map[r.studentId]) map[r.studentId] = []
            map[r.studentId].push({ id: r.id, text: r.text })
          })
          setStudentRecs(map)
        })
    }
  }

  const finishLesson = async () => {
    if (!selectedLesson) return
    setSaving(true)

    // Build attendance data: students with status or mark, default status to 'present'
    const seen = new Set<string>()
    const attData: { studentId: string; status: string; mark?: string }[] = []
    for (const [studentId, status] of Object.entries(attendanceMap)) {
      if (status) {
        seen.add(studentId)
        attData.push({ studentId, status, mark: markMap[studentId] || undefined })
      }
    }
    for (const [studentId, mark] of Object.entries(markMap)) {
      if (mark && !seen.has(studentId)) {
        attData.push({ studentId, status: 'present', mark })
      }
    }

    if (attData.length > 0) {
      await globalThis.fetch('/api/attendance/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: selectedLesson.id, attendance: attData }),
      })
    }

    // Save lesson fields
    await globalThis.fetch(`/api/lessons/${selectedLesson.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'completed',
        topic,
        homework,
        lessonNote,
        hypothesis,
        personalNote,
      }),
    })

    setSaving(false)
    setSelectedLesson(null)
    loadLessons()
  }

  const saveNote = async () => {
    if (!notePopup || !selectedLesson) return
    const text = notePopup.text
    if (notePopup.type === 'student' && notePopup.studentId) {
      if (text.trim()) {
        await globalThis.fetch('/api/observations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: notePopup.studentId, lessonId: selectedLesson.id, text }),
        })
        const res = await globalThis.fetch(`/api/lessons/${selectedLesson.id}`)
        if (res.ok) setSelectedLesson(await res.json())
      }
    } else if (notePopup.type === 'groupNote') {
      setLessonNote(text)
    } else if (notePopup.type === 'groupHypothesis') {
      setHypothesis(text)
    } else if (notePopup.type === 'personalNote') {
      setPersonalNote(text)
    }
    setNotePopup(null)
  }

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour >= 6 && hour < 12
    ? 'Доброе утро'
    : hour >= 12 && hour < 17
    ? 'Добрый день'
    : hour >= 17 && hour < 22
    ? 'Добрый вечер'
    : 'Доброй ночи'
  const dateStr = now.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  // Main screen
  if (!selectedLesson) {
    const currentLesson = lessons.find(l => l.status === 'planned')
    return (
      <div className="p-5">
        <div className="mb-5">
          <p className="text-[14px] text-text-secondary font-medium mb-1">{dateStr}</p>
          <p className="text-[22px] font-medium text-text-secondary">{greeting},</p>
          <p className="text-[32px] font-bold -tracking-[0.5px] mt-0.5">{teacherName || 'Педагог'}</p>
        </div>

        <p className="text-[13px] font-semibold text-text-secondary uppercase tracking-[0.5px] mb-3">Сегодня</p>

        {lessons.length === 0 ? (
          <div className="text-center mt-10 text-text-secondary text-[15px]">Нет уроков на сегодня 🎉</div>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {lessons.map((l) => {
              const isCurrent = l.status === 'planned' && currentLesson?.id === l.id
              return (
                <div
                  key={l.id}
                  onClick={() => openLesson(l.id)}
                  className="bg-white rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all"
                  style={isCurrent ? { border: '1.5px solid #34c759', background: '#f9fdf9' } : { border: '1.5px solid transparent' }}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 ${
                    isCurrent ? 'bg-[#e8f8ed] text-[#34c759]' :
                    l.status === 'completed' ? 'bg-[#e8f8ed] text-[#34c759]' :
                    l.status === 'conflict' ? 'bg-[#fff3e6] text-[#cc7a00]' :
                    'bg-[#f2f2f7] text-[#aeaeb2]'
                  }`}>
                    {isCurrent ? '▶' : l.status === 'completed' ? '✔' : l.status === 'conflict' ? '⚠' : '⚪'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px]">{l.group.name}</p>
                    <p className="text-[12px] text-text-secondary font-medium">
                      {l.room.name} · {formatTime(l.dateTime)}
                    </p>
                    {l.topic && <p className="text-[12px] text-text-secondary mt-0.5">📖 {l.topic}</p>}
                  </div>
                  <span className="text-[#aeaeb2] text-base shrink-0">›</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Lesson detail screen: show enrolled students (from group), merged with attendance data
  const lessonStudents = enrolledStudents.length > 0
    ? enrolledStudents
    : selectedLesson.attendances.map(a => a.student)
  const hasTeacherInsight = teacherRecs.length > 0

  return (
    <div className="p-5 animate-slide-in">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => setSelectedLesson(null)} className="w-9 h-9 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center justify-center text-blue text-xl shrink-0 active:scale-[0.93] transition-transform">‹</button>
        <div>
          <p className="text-[24px] font-bold -tracking-[0.4px]">{selectedLesson.group.name}</p>
          <p className="text-[13px] text-text-secondary">{formatDate(selectedLesson.dateTime)} · {formatTime(selectedLesson.dateTime)}</p>
        </div>
      </div>

      {/* Top info bar */}
      <div className="bg-white rounded-[20px] p-[14px_18px] mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center gap-3">
        <Image src="/logo-small.png" alt="Элиф" width={28} height={28} className="shrink-0" />
        <div className="flex-1">
          <p className="font-semibold text-[15px]">{selectedLesson.group.name} · {selectedLesson.room.name}</p>
          <p className="text-[12px] text-text-secondary">🚪 {selectedLesson.room.name} · {formatTime(selectedLesson.dateTime)}</p>
        </div>
        <button
          className={'w-10 h-10 rounded-full flex items-center justify-center text-xl cursor-pointer border-none transition-all shrink-0 ' + (hasTeacherInsight ? 'bg-[#fff9e6] animate-pulse-glow' : 'bg-[#f2f2f7]')}
          style={hasTeacherInsight ? { boxShadow: '0 0 12px 4px rgba(255,204,0,0.5)' } : {}}
          title={hasTeacherInsight ? 'Рекомендации' : 'Нет данных'}
          onClick={() => {
            if (hasTeacherInsight) {
              const text = teacherRecs.map(r => r.text).join('\n\n')
              setAiPopup({ title: '💡 Рекомендации', text })
            }
          }}
        >💡</button>
      </div>

      {/* Topic + Homework */}
      <div className="flex flex-col gap-2 mb-3">
        <input type="text" placeholder="Тема урока" value={topic} onChange={(e) => setTopic(e.target.value)}
          className="w-full bg-white rounded-[16px] px-[14px] py-[10px] border border-[#e5e5ea] text-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] outline-none focus:border-blue transition-colors font-inherit" />
        <input type="text" placeholder="Домашнее задание" value={homework} onChange={(e) => setHomework(e.target.value)}
          className="w-full bg-white rounded-[16px] px-[14px] py-[10px] border border-[#e5e5ea] text-[14px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] outline-none focus:border-blue transition-colors font-inherit" />
      </div>

      {/* Student list */}
      <div className="flex flex-col gap-[6px] mb-2">
        {lessonStudents.map((s, idx) => (
          <div key={s.id} className="bg-white rounded-[16px] p-[12px_14px] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex items-center gap-2 border-l-[5px] border-blue">
            <span className="font-semibold text-[15px] flex-1 min-w-0">{s.lastName} {s.firstName}</span>
            <select
              value={markMap[s.id] || ''}
              onChange={(e) => {
                const val = e.target.value
                setMarkMap({ ...markMap, [s.id]: val })
                if (val === 'Н') setAttendanceMap({ ...attendanceMap, [s.id]: 'absent' })
                else if (val === '') setAttendanceMap({ ...attendanceMap, [s.id]: 'present' })
                else setAttendanceMap({ ...attendanceMap, [s.id]: 'present' })
              }}
              className={`appearance-none border-none rounded-[20px] px-[14px] py-[8px] text-[14px] font-semibold font-inherit cursor-pointer text-center min-w-[60px] transition-colors ${
                !markMap[s.id] ? 'bg-[#e8f8ed] text-[#34c759]' :
                markMap[s.id] === '5' ? 'bg-[#e8f8ed] text-[#1a7a30]' :
                markMap[s.id] === '4' ? 'bg-[#e6f9ed] text-[#2d8c3e]' :
                markMap[s.id] === '3' ? 'bg-[#fff9e6] text-[#b38a00]' :
                markMap[s.id] === '2' ? 'bg-[#fff3e6] text-[#cc7a00]' :
                'bg-[#ffebea] text-[#ff3b30]'
              }`}
            >
              <option value="">✓</option>
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="Н">Н</option>
            </select>
            <button onClick={() => {
              const obs = selectedLesson.observations.find(o => o.student.id === s.id)
              setNotePopup({ type: 'student', title: `🎤 Наблюдение: ${s.firstName}`, text: obs?.text || '', studentId: s.id })
            }} className="w-[38px] h-[38px] rounded-full border-none bg-transparent cursor-pointer flex items-center justify-center text-xl active:scale-[0.9] shrink-0">🎤</button>
            <button onClick={() => {
              const recs = studentRecs[s.id]
              if (recs && recs.length > 0) setAiPopup({ title: `💡 ${s.firstName} ${s.lastName}`, text: recs.map(r => r.text).join('\n\n') })
            }} className={'w-[38px] h-[38px] rounded-full border-none bg-transparent flex items-center justify-center text-xl shrink-0 active:scale-[0.9] ' + ((studentRecs[s.id]?.length || 0) > 0 ? 'bg-[#fff9e6] animate-pulse-glow' : '')}
            style={(studentRecs[s.id]?.length || 0) > 0 ? { boxShadow: '0 0 12px 4px rgba(255,204,0,0.5)' } : {}}
            title={(studentRecs[s.id]?.length || 0) > 0 ? 'Есть рекомендация' : 'Нет рекомендаций'}>💡</button>
          </div>
        ))}
      </div>

      {/* Group notes section */}
      <div className="bg-white rounded-[20px] p-[14px_16px] my-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <p className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.6px] mb-[6px]">Группа</p>
        <button onClick={() => setNotePopup({ type: 'groupNote', title: '🎤 Заметка по уроку', text: lessonNote })} className="w-full flex items-center gap-[10px] p-[10px_14px] rounded-[12px] bg-[#f2f2f7] border-none cursor-pointer font-inherit text-[14px] font-medium text-left mb-[4px] active:bg-[#e8e8ed] transition-colors">
          🎤 Заметка по уроку
        </button>
        <button onClick={() => setNotePopup({ type: 'groupHypothesis', title: '🧠 Гипотеза на следующее занятие', text: hypothesis })} className="w-full flex items-center gap-[10px] p-[10px_14px] rounded-[12px] bg-[#f2f2f7] border-none cursor-pointer font-inherit text-[14px] font-medium text-left mb-[4px] active:bg-[#e8e8ed] transition-colors">
          🧠 Гипотеза на следующее занятие
        </button>
        <button onClick={() => setNotePopup({ type: 'personalNote', title: '📝 Личная заметка', text: personalNote })} className="w-full flex items-center gap-[10px] p-[10px_14px] rounded-[12px] bg-[#f2f2f7] border-none cursor-pointer font-inherit text-[14px] font-medium text-left active:bg-[#e8e8ed] transition-colors">
          📝 Личная заметка
        </button>
      </div>

      <button onClick={finishLesson} disabled={saving}
        className="w-full py-[14px] rounded-[24px] border-none bg-blue text-white font-semibold text-[16px] font-inherit cursor-pointer shadow-[0_4px_14px_rgba(0,122,255,0.25)] mt-2 active:scale-[0.97] transition-all disabled:opacity-50">
        {saving ? 'Сохранение...' : '✔ Завершить урок'}
      </button>

      {/* Note popup */}
      {notePopup && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setNotePopup(null)}>
          <div className="bg-white rounded-[28px] p-6 w-[90%] max-w-[360px] shadow-[0_20px_50px_rgba(0,0,0,0.25)] max-h-[80vh] overflow-y-auto flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-[18px]">{notePopup.title}</p>
              <button onClick={() => setNotePopup(null)} className="w-7 h-7 rounded-full bg-[#f2f2f7] flex items-center justify-center text-[13px] text-text-secondary border-none cursor-pointer shrink-0">✕</button>
            </div>
            <textarea
              value={notePopup.text}
              onChange={(e) => setNotePopup({ ...notePopup, text: e.target.value })}
              className="w-full min-h-[120px] rounded-[16px] border border-[#e5e5ea] p-3 font-inherit text-[14px] bg-[#f9f9fb] outline-none focus:border-blue resize-y"
              placeholder="Введите текст или надиктуйте..."
            />
            <div className="flex items-center gap-2">
              <button className="bg-none border-none text-2xl cursor-pointer text-text-secondary">🎙️</button>
              <span className="text-[12px] text-text-secondary">Нажмите и говорите</span>
            </div>
            <div className="flex gap-2 justify-end flex-wrap">
              <button onClick={() => setNotePopup(null)} className="px-5 py-[10px] rounded-[20px] border-none bg-[#f2f2f7] font-semibold text-[14px] cursor-pointer active:scale-[0.95]">Отмена</button>
              <button onClick={saveNote} className="px-5 py-[10px] rounded-[20px] border-none bg-blue text-white font-semibold text-[14px] cursor-pointer active:scale-[0.95]">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* AI popup */}
      {aiPopup && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setAiPopup(null)}>
          <div className="bg-white rounded-[28px] p-6 w-[90%] max-w-[360px] shadow-[0_20px_50px_rgba(0,0,0,0.25)] flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="font-bold text-[18px]">{aiPopup.title}</p>
              <button onClick={() => setAiPopup(null)} className="w-7 h-7 rounded-full bg-[#f2f2f7] flex items-center justify-center text-[13px] text-text-secondary border-none cursor-pointer shrink-0">✕</button>
            </div>
            <div className="bg-[#fff9e6] rounded-[16px] p-[14px] text-[14px] leading-relaxed max-h-[200px] overflow-y-auto border-l-4 border-[#ffcc00]">
              {aiPopup.text}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setAiPopup(null)} className="px-5 py-[10px] rounded-[20px] border-none bg-blue text-white font-semibold text-[14px] cursor-pointer active:scale-[0.95]">Понятно</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
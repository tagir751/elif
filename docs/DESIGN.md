# DESIGN.md — контракт дизайна Элиф

Источник правды: `docs/mockups/*.html` (эталонные скриншоты в коде).

## Токены (из мокапов, перенесены в `globals.css` + `tailwind.config.ts`)

| Название | Значение | Где используется |
|----------|----------|------------------|
| `--bg` | `#f5f5f7` | фон body, app-container |
| `--card-bg` | `#ffffff` | карточки уроков, строки учеников, плашки |
| `--text` | `#1d1d1f` | основной текст |
| `--text-secondary` | `#86868b` | мета-информация, подписи |
| `--text-tertiary` | `#aeaeb2` | плейсхолдеры, иконки неактивные |
| `--green` | `#34c759` | активное/завершённое, оценка 5 |
| `--green-light` | `#e8f8ed` | фон активных элементов |
| `--yellow` | `#ffcc00` | лампочка ИИ, оценка 3 |
| `--yellow-light` | `#fff9e6` | фон активной лампочки |
| `--yellow-glow` | `rgba(255,204,0,0.5)` | свечение лампочки |
| `--orange` | `#ff9500` | оценка 2, конфликт |
| `--red` | `#ff3b30` | оценка Н/провал, ошибки |
| `--blue` | `#007aff` | основной акцент, кнопки, фокус |
| `--blue-light` | `#e8f2ff` | фон синих элементов |
| `--gray` | `#e5e5ea` | сепараторы, границы |
| `--gray-light` | `#f2f2f7` | фон инпутов, неактивные кнопки |
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.06)` | карточки, строки |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.08)` | модальные окна |
| `--radius-sm` | `12px` | кнопки группы, инпуты |
| `--radius-md` | `16px` | карточки уроков, строки учеников |
| `--radius-lg` | `20px` | верхняя плашка урока, секция группы |
| `--transition-fast` | `0.2s cubic-bezier(0.25,0.1,0.25,1)` | ховеры, активные состояния |
| `--transition-smooth` | `0.35s cubic-bezier(0.25,0.1,0.25,1)` | переходы экранов |

Шрифт: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', sans-serif`
`-webkit-font-smoothing: antialiased`

## Анимации (в `globals.css`)

| Класс | Назначение |
|-------|------------|
| `.animate-slide-in` | вход экрана справа (0.3s) |
| `.animate-slide-in-left` | вход экрана слева |
| `.animate-slide-out` | выход экрана влево |
| `.animate-pulse-glow` | пульсация лампочки (2s infinite) — используется для `.ai-badge.active` и `.icon-btn.context-active` |

## Карта мокапы → роуты

| Мокап | Роут | Описание |
|-------|------|----------|
| `teacher-lesson.html` | `/teacher/today` (экран урока) | список учеников, оценки, микрофон, лампочки, заметки |
| `manager-tasks.html` | `/manager/tasks` | задачи менеджера |
| `manager-dashboard.html` | `/manager/today` | дашборд менеджера |
| `students.html` | `/manager/students` | список учеников |
| `Безымянный1.html` | (деплой-версия teacher-lesson) | тот же, что teacher-lesson.html |

## Компоненты-эталон (обязательно сверяться с мокапом)

### 1. StudentRow — строка ученика в уроке
Мокап: `teacher-lesson.html` строки 286-294, 323-343
- `background: var(--card-bg)` + `border-radius: var(--radius-md)` + `padding: 12px 14px` + `shadow-sm`
- **Нет левой полосы** (в текущем коде `border-l-5 border-blue` — оставили по решению)
- Имя: `font-weight: 600; font-size: 15px`
- Селект оценки: `appearance-none`, `bg: var(--gray-light)`, `rounded-20px`, `padding: 8px 28px 8px 14px`, цвет по значению (`.val-5` → зеленый, `.val-3` → желтый, `.val-n` → серый)
- Кнопка микрофон: `38x38`, `rounded-full`, `bg-transparent`, `color: #c7c7cc`, `:active scale(0.9)`
- **Лампочка ИИ** (`.icon-btn`):
  - Неактивная: `color: #c7c7cc`, `bg-transparent`
  - Активная (`.context-active`): `color: #e5b800`, `bg: #fff9e6`, `box-shadow: 0 0 12px 4px var(--yellow-glow)`
  - Нажатие открывает попап с рекомендацией

### 2. AiLamp — лампочка педагога (в верхней плашке урока)
Мокап: строки 238-260, 521
- Кнопка `40x40`, `rounded-full`, `bg: var(--gray-light)`, иконка `💡`
- Активная (`.active`): `bg: #fff9e6`, `box-shadow: 0 0 16px 5px var(--yellow-glow)`, анимация `softPulse` (2.5s)
- Нажатие открывает попап с `teacherAiRecommendation`

### 3. NotePopup — попап заметок (универсальный)
Мокап: строки 546-560, 654-670
- Оверлей: `fixed inset-0 bg-black/30 backdrop-blur-sm`
- Карточка: `bg-white rounded-28px p-6 w-90% max-w-360px`
- Заголовок + крестик
- `textarea` с плейсхолдером «Введите текст или надиктуйте...»
- Кнопка микрофон `🎙️` (заглушка `simulateDictation()`)
- Кнопки: «Отмена» (серый), «Сохранить» (синий)

### 4. LessonCard — карточка урока в списке
Мокап: строки 160-177, 706-718
- `bg-white`, `rounded-16px`, `padding: 16px 18px`, `shadow-sm`, `gap: 12px`
- Статус-иконка `40x40` круг:
  - Не начато: `bg-gray-light`, `⚪`
  - Текущий: `bg-green-light`, `▶` + зеленая рамка карточки `1.5px solid var(--green)` + `bg: #f9fdf9`
  - Завершён: `bg-green-light`, `✔`
- Инфо: название группы (bold 15px), мета `12px text-secondary` (кабинет · время), тема `12px` (опционально)
- Чеврон `›` справа

### 5. SelectMark — селект оценки
Мокап: строки 298-320
- `appearance-none`, без границ, `rounded-20px`, `padding: 8px 28px 8px 14px`
- Стрелка SVG в `background-image`
- Цветовые классы по `value`: `.val-5`, `.val-4`, `.val-3`, `.val-2`, `.val-n`

### 6. GroupNotes — секция групповых заметок
Мокап: строки 346-366, 534-539
- Заголовок «ГРУППА» `11px uppercase tracking-wide text-secondary`
- 3 кнопки: «Заметка по уроку» `🎤`, «Гипотеза на следующее занятие» `🧠`, «Личная заметка» `📝`
- Каждая: `w-full`, `flex items-center gap-10`, `p-10px_14px`, `rounded-12px`, `bg-gray-light`, `active: bg-#e8e8ed`

## Правила работы с UI

1. **Любое изменение UI** — сначала открыть соответствующий `docs/mockups/*.html`, найти нужный фрагмент.
2. Отступления от мокапа — только с явного согласия (комментарий в PR).
3. Новые токены — добавлять в `globals.css` `:root` и `tailwind.config.ts` одновременно.
4. Кириллица в template literals — **запрещена** (конкатенация: `'Текст: ' + var`).
5. Жесткие цвета в `className` — только через токены (`bg-[#f2f2f7]` → `bg-gray-light`).

## Логика лампочек (исправлено)

- **Загрузка**: в `openLesson` после `setEnrolledStudents(enrolled)` вызывается `refetchRecs()`:
  - `teacherRecs` по `teacherId`
  - `studentRecs` по `enrolled.map(s => s.id)` (НЕ по `attendances`)
- **Перезагрузка**: после `saveNote` (наблюдение ученика) и после `finishLesson` — вызывается `refetchRecs()`
- **Отображение**:
  - Ученик: `studentRecs[s.id]?.length > 0` → `bg-[#fff9e6] animate-pulse-glow` + `box-shadow` glow
  - Педагог: `teacherRecs.length > 0` → `bg-[#fff9e6] animate-pulse-glow` + `box-shadow` glow
- **Попап**: при клике показывает `recs.map(r => r.text).join('\n\n')`

## Рекомендации — источник данных

- **Только ручной импорт** администратором через `/admin` → «Рекомендации» → JSON.
- В `scripts/seed.ts` добавлены 6 демо-записей (1 teacher + 5 student), чтобы лампочки светились сразу после `npm run seed`.
- Автогенерация из наблюдений — **не реализована** (планируется отдельно).

## Гейты перед коммитом

1. `npm run seed` (чистая БД)
2. `npm run dev` → открыть `/teacher/today` → войти `teacher@elif.ru / teacher123`
3. Открыть урок «Английский A1» (группа engA1):
   - У Артёма, Анны, Дмитрия горят лампочки 💡
   - Нажатие показывает текст рекомендации
   - Кнопки «Заметка по уроку» / «Гипотеза…» / «Личная заметка» открывают попап, сохраняют, при повторном открытии — текст на месте
4. `npm run build` → `node scripts/test.mjs` (зелёные)
5. `git add . && git commit -m "..." && git push`
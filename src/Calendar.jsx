import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { courseSheetSchedule } from './courseSheetSchedule'
import { categoriesForCohort, categoryEditsKey, categorySettingsOn, categorySlots, loadCategoryEdits } from './courseSheetCategories'
import { busanCourseNotes, busanLessonOn } from './busanCourseSheet'
import { calendarStorageKey, eventsOnDate, loadEvents } from './calendarEvents'
import { busanCohortId, cohortLabel, gumiCohortId } from './courses'
import { repeatOptions, shiftDate } from './dateRecurrence'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const colors = [['blue', '파랑'], ['violet', '보라'], ['green', '초록'], ['orange', '주황'], ['rose', '분홍']]
const koreanDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', dateStyle: 'short' })
const courseSheet = 'https://docs.google.com/spreadsheets/d/1hIktc9PY-MZy0Y1B9sBvRcQdGF6k43wZDiVtLSopxMk/edit?gid=839534603#gid=839534603'
const sheetDates = {
  '2026-12-24': '휴강',
  '2026-12-25': '공휴일',
  '2026-12-31': '단축수업',
  '2027-01-01': '공휴일',
  '2027-01-22': '휴강',
  '2027-02-05': '휴강',
  '2027-02-08': '공휴일',
  '2027-02-09': '공휴일',
  '2027-03-01': '공휴일',
}

function CourseCategory({ category }) {
  return category && <span className={`course-category course-category--${category.key}`}>{category.time && `${category.time} · `}{category.label}</span>
}

function CategoryBadges({ slots }) {
  if (!slots.length) return null
  return <div className="calendar-category-badges">
    {slots.map((category) => <CourseCategory key={category.time} category={category} />)}
  </div>
}

function CategoryEditor({ date, initial, categories, canReset, save, reset, close, addEvent }) {
  const [mode, setMode] = useState(initial.mode)
  const modeSelect = useRef(null)
  useEffect(() => { modeSelect.current?.focus() }, [])

  function categorySelect(name, label, value) {
    return <label>{label}<select name={name} defaultValue={value ?? ''}>
      <option value="">구분 없음</option>
      {categories.map(({ key, label: option }) => <option key={key} value={key}>{option}</option>)}
    </select></label>
  }

  return (
    <form className="management-form calendar-form calendar-category-editor" onSubmit={(event) => {
      event.preventDefault()
      const fields = new FormData(event.currentTarget)
      save(mode === 'split'
        ? { mode, am: fields.get('am'), pm: fields.get('pm') }
        : { mode, day: fields.get('day') })
    }}>
      <h3>{date} 직무 구분</h3>
      <label>시간대<select ref={modeSelect} value={mode} onChange={(event) => setMode(event.target.value)}>
        <option value="day">하루 전체</option>
        <option value="split">오전·오후 나누기</option>
      </select></label>
      {mode === 'split' ? (
        <>
          {categorySelect('am', '오전', initial.am ?? initial.day)}
          {categorySelect('pm', '오후', initial.pm ?? initial.day)}
        </>
      ) : categorySelect('day', '직무 구분', initial.day ?? initial.am ?? initial.pm)}
      <button type="submit">저장</button>
      <button type="button" onClick={close}>취소</button>
      <button type="button" className="calendar-add-event" onClick={addEvent}>+ 일정 추가</button>
      {canReset && <button type="button" className="delete-button" onClick={reset}>기본값 복원</button>}
    </form>
  )
}

const certificationPattern = /(?:필기|실기)\s*(?:시험|접수|합격|발표)/

function eventLabel(event, date) {
  if (!event.days) return event.title
  const boundary = event.start === event.end ? '시작·종료' : date === event.start ? '시작' : '종료'
  return `${event.title} ${boundary}`
}

function LessonText({ lesson }) {
  return (
    <div className="calendar-lesson">
      {lesson.split('\n').map((line, index) => {
        if (certificationPattern.test(line)) return <strong key={index} className="calendar-exam-text">{line}</strong>
        if (line.trim() === '단축수업') return <strong key={index} className="calendar-short-text">{line}</strong>
        return index === 0 ? <strong key={index}>{line}</strong> : <span key={index}>{line}</span>
      })}
    </div>
  )
}

function monthDates(month) {
  const first = new Date(`${month}-01T00:00:00Z`)
  const cursor = new Date(first)
  cursor.setUTCDate(1 - first.getUTCDay())
  const dates = []
  do {
    dates.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  } while (cursor.getUTCMonth() === first.getUTCMonth() || cursor.getUTCDay() !== 0)
  return dates
}

function shiftMonth(month, direction) {
  const date = new Date(`${month}-01T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + direction)
  return date.toISOString().slice(0, 7)
}

function CalendarForm({ entry, cohorts, save, remove, close }) {
  const [error, setError] = useState('')
  const titleInput = useRef(null)

  useEffect(() => {
    titleInput.current?.focus()
  }, [])

  function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const title = fields.get('title').trim()
    const start = fields.get('start')
    const end = fields.get('end')
    const repeat = fields.get('repeat')
    if (!title || end < start) {
      setError('제목을 입력하고 종료일을 시작일 이후로 설정해 주세요.')
      return
    }
    if (repeat && (start !== end || fields.get('days'))) {
      setError('반복은 수업일수 입력이 없는 하루 일정에 설정할 수 있어요.')
      return
    }
    save({
      ...entry, title, start, end, repeat, color: fields.get('color'), memo: fields.get('memo').trim(),
      cohortId: fields.get('scope') || null,
      days: fields.get('days') === '' ? null : Number(fields.get('days')),
    })
  }
  return (
    <form className="management-form calendar-form" onSubmit={submit}>
      <label>일정명<input ref={titleInput} name="title" defaultValue={entry.title} maxLength={100} required /></label>
      <label>시작일<input type="date" name="start" defaultValue={entry.start} required /></label>
      <label>종료일<input type="date" name="end" defaultValue={entry.end} required /></label>
      <label>업무 범위<select name="scope" defaultValue={entry.cohortId ?? ''}>
        <option value="">공통 일정</option>
        {cohorts.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
      </select></label>
      <label>수업일수<input type="number" name="days" min="1" defaultValue={entry.days ?? ''} /></label>
      <label>색상<select name="color" defaultValue={entry.color ?? 'blue'}>
        {colors.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label>반복<select name="repeat" defaultValue={entry.repeat ?? ''}>
        {repeatOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <label className="calendar-memo">메모<textarea name="memo" defaultValue={entry.memo} rows={3} /></label>
      <button type="submit">저장</button>
      <button type="button" onClick={close}>취소</button>
      {entry.id && <button type="button" className="delete-button" onClick={remove}>삭제</button>}
      {error && <p role="alert">{error}</p>}
    </form>
  )
}

export default function Calendar({ mini = false, course, cohort, courses = [], today = koreanDate.format(new Date()) }) {
  const [month, setMonth] = useState(() => {
    const requested = new URLSearchParams(window.location.hash.split('?')[1]).get('month')
    return !mini && /^\d{4}-(0[1-9]|1[0-2])$/.test(requested ?? '') ? requested : today.slice(0, 7)
  })
  const [events, setEvents] = useState(loadEvents)
  const [view, setView] = useState('month')
  const [focusDate, setFocusDate] = useState(today)
  const [selectedFilter, setFilter] = useState(cohort?.id ?? '')
  const filter = mini ? cohort?.id ?? '' : selectedFilter
  const [dragged, setDragged] = useState(null)
  const [entry, setEntry] = useState(null)
  const [categoryEdits, setCategoryEdits] = useState(loadCategoryEdits)
  const [categoryDate, setCategoryDate] = useState(null)
  const [error, setError] = useState(false)
  const current = eventsOnDate(events, today, cohort?.id).find((event) => event.cohortId && event.days)
  const [year, monthNumber] = month.split('-').map(Number)
  const firstOfWeek = shiftDate(focusDate, -new Date(focusDate).getUTCDay())
  const dates = view === 'month' ? monthDates(month) : view === 'week'
    ? Array.from({ length: 7 }, (_, index) => shiftDate(firstOfWeek, index))
    : [focusDate]
  const title = view === 'month' ? `${year}년 ${monthNumber}월`
    : view === 'week' ? `${firstOfWeek} ~ ${dates[6]}` : focusDate
  const fullLink = `#/calendar?month=${month}`
  const hasCourseSheet = filter === gumiCohortId || filter === '*'
  const notes = filter === busanCohortId ? busanCourseNotes : hasCourseSheet ? sheetDates : {}
  const lessonOn = (date, id = filter) => id === busanCohortId ? busanLessonOn(date)
    : id === gumiCohortId || id === '*' ? courseSheetSchedule[date] : undefined
  const cohorts = courses.flatMap((item) => item.cohorts.map((group) => ({ id: group.id, label: `${item.name} ${cohortLabel(group)}` })))
  const monthNotes = Object.entries(notes).filter(([date]) => date.startsWith(month))
  const categoriesOn = (date, id = filter) => categorySlots(categorySettingsOn(categoryEdits, id, date))
  const monthLessons = mini ? monthDates(month).flatMap((date) => {
    if (!date.startsWith(month)) return []
    const lesson = lessonOn(date)
    const slots = categoriesOn(date)
    return lesson || slots.length ? [{ date, lesson, slots }] : []
  }) : []
  const todayLesson = mini && today.slice(0, 7) === month
    ? lessonOn(today)
    : undefined
  const todayCategories = mini && today.startsWith(month) ? categoriesOn(today) : []
  const activeCategoryKey = `${filter}:${categoryDate}`
  const canEditCategories = Boolean(filter && filter !== '*')

  function addEventOn(date) {
    setCategoryDate(null)
    setEntry({ start: date, end: date, cohortId: filter === '*' ? cohort?.id : filter })
  }

  function openDate(date) {
    if (canEditCategories) {
      setEntry(null)
      setCategoryDate(date)
    } else addEventOn(date)
  }

  function saveCategories(settings) {
    const next = { ...categoryEdits }
    if (settings) next[activeCategoryKey] = settings
    else delete next[activeCategoryKey]
    try {
      localStorage.setItem(categoryEditsKey, JSON.stringify(next))
      setCategoryEdits(next)
      setCategoryDate(null)
      setError(false)
    } catch {
      setError(true)
    }
  }

  function commit(next) {
    try {
      localStorage.setItem(calendarStorageKey, JSON.stringify(next))
      setEvents(next)
      setEntry(null)
      setError(false)
    } catch {
      setError(true)
    }
  }

  function navigate(direction) {
    if (view === 'month') setMonth(shiftMonth(month, direction))
    else setFocusDate(shiftDate(focusDate, direction * (view === 'week' ? 7 : 1)))
  }

  function changeView(next) {
    if (view === 'month') setFocusDate(today.startsWith(month) ? today : `${month}-01`)
    else setMonth(focusDate.slice(0, 7))
    setView(next)
  }

  function moveEvent(date) {
    if (!dragged) return
    const delta = (Date.parse(date) - Date.parse(dragged.date)) / 86_400_000
    if (delta) commit(events.map((event) => event.id === dragged.id
      ? { ...event, start: shiftDate(event.start, delta), end: shiftDate(event.end, delta) } : event))
    setDragged(null)
  }

  return (
    <section className={mini ? 'management-card calendar calendar-mini' : 'management-card calendar'} aria-label={mini ? '미니 캘린더' : '일정 캘린더'}>
      <div className="calendar-heading">
        {mini ? <a href={fullLink} className="calendar-title" aria-label={`${title} 전체 캘린더 열기`}>{title}</a> : <h2>{title}</h2>}
        <div className="calendar-controls">
          {!mini && <button type="button" onClick={() => { setMonth(today.slice(0, 7)); setFocusDate(today) }}>오늘</button>}
          <button type="button" aria-label={view === 'month' ? '이전 달' : view === 'week' ? '이전 주' : '이전 날'} onClick={() => navigate(-1)}><ChevronLeft size={16} /></button>
          <button type="button" aria-label={view === 'month' ? '다음 달' : view === 'week' ? '다음 주' : '다음 날'} onClick={() => navigate(1)}><ChevronRight size={16} /></button>
        </div>
      </div>
      {!mini && <div className="calendar-filters">
        <label>보기 <select value={view} onChange={(event) => changeView(event.target.value)}>
          <option value="month">월간</option><option value="week">주간</option><option value="day">일간</option>
        </select></label>
        <label>일정 범위 <select value={filter} onChange={(event) => { setFilter(event.target.value); setEntry(null); setCategoryDate(null) }}>
          <option value="*">전체 과정</option><option value="">공통 일정만</option>
          {cohorts.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
        </select></label>
      </div>}
      {(filter && (!mini || monthLessons.some(({ slots }) => slots.length > 0))) && <div className="calendar-category-legend" aria-label="교육일 구분">
        {categoriesForCohort(filter).map((category) => <CourseCategory key={category.key} category={category} />)}
      </div>}
      <div className="calendar-scroll">
      <div className={`calendar-grid calendar-grid--${view}`}>
        {(view === 'day' ? [weekdays[new Date(focusDate).getUTCDay()]] : weekdays).map((day) => <span key={day} className="calendar-weekday">{day}</span>)}
        {dates.map((date) => {
          const matches = eventsOnDate(events, date, filter)
            .filter((event) => !event.days || date === event.start || date === event.end)
          const periodMarkers = matches.filter((event) => event.days).map((event) => eventLabel(event, date))
          const day = Number(date.slice(-2))
          const note = notes[date]
          const lesson = lessonOn(date)
          const slots = categoriesOn(date, filter === '*' ? gumiCohortId : filter)
          const otherCategories = filter === '*' ? cohorts.flatMap(({ id, label }) => {
            if (id === gumiCohortId) return []
            const entries = categoriesOn(date, id)
            const otherLesson = lessonOn(date, id)
            return entries.length || otherLesson ? [{ id, label, entries, otherLesson }] : []
          }) : []
          const categoryLabels = slots.map(({ time, label }) => time ? `${time} ${label}` : label)
          const exam = lesson && certificationPattern.test(lesson)
          const className = [
            'calendar-day', date === today && 'calendar-today',
            view === 'month' && date.slice(0, 7) !== month && 'calendar-outside',
            new Date(date).getUTCDay() === 0 && 'calendar-sunday',
            mini && slots.length === 1 && !slots[0].time && `course-category--${slots[0].key}`,
            note && (note === '단축수업' ? 'calendar-short-day' : 'calendar-day-off'),
            exam && 'calendar-exam-day',
          ].filter(Boolean).join(' ')
          if (mini) return (
            <a key={date} href={fullLink} className={className} title={[...periodMarkers, ...categoryLabels, lesson].filter(Boolean).join('\n') || undefined} aria-current={date === today ? 'date' : undefined} aria-label={[date, ...periodMarkers, ...categoryLabels, lesson, '전체 캘린더 열기'].filter(Boolean).join(', ')}>
              {day}{slots.some(({ time }) => time) ? <span className="calendar-split-dots" aria-hidden="true">
                {slots.map(({ time, key }) => <span key={time} className={`course-category--${key}`} />)}
              </span> : (matches.length > 0 || lesson) && <span className="calendar-dot" />}
            </a>
          )
          return (
            <div key={date} className={`${className} calendar-day--interactive`} onClick={() => openDate(date)} onDragOver={(event) => { if (dragged) event.preventDefault() }} onDrop={(event) => { event.preventDefault(); moveEvent(date) }}>
              <div className="calendar-day-actions">
                <button type="button" aria-current={date === today ? 'date' : undefined} aria-label={`${date} ${canEditCategories ? '직무 구분 편집' : '일정 추가'}`}>{day}</button>
              </div>
              {(lesson || slots.length > 0) && <div className={`calendar-cell-lesson${filter === busanCohortId && slots.length === 1 && !slots[0].time ? ` course-category--${slots[0].key}` : ''}`}>
                <CategoryBadges slots={slots} />
                {lesson && <LessonText lesson={lesson} />}
              </div>}
              {otherCategories.map(({ id, label, entries, otherLesson }) => <div key={id} className="calendar-cell-lesson"><span>{label}</span><CategoryBadges slots={entries} />{otherLesson && <LessonText lesson={otherLesson} />}</div>)}
              {matches.map((event) => (
                <button key={event.id} type="button" className={`calendar-event event-${event.color ?? 'blue'}`} title={event.memo ? `${eventLabel(event, date)}\n${event.memo}` : eventLabel(event, date)} onClick={(click) => { click.stopPropagation(); setCategoryDate(null); setEntry(event) }}
                  draggable={!event.repeat} onDragStart={(drag) => {
                    drag.dataTransfer.setData('text/plain', event.title)
                    setDragged({ id: event.id, date })
                  }} onDragEnd={() => setDragged(null)}>
                  {eventLabel(event, date)}
                </button>
              ))}
            </div>
          )
        })}
      </div>
      </div>
      {(todayLesson || todayCategories.length > 0) && (
        <div className="calendar-lesson-today">
          <strong>오늘 교과목·일정</strong>
          <CategoryBadges slots={todayCategories} />
          {todayLesson && <LessonText lesson={todayLesson} />}
        </div>
      )}
      {monthLessons.length > 0 && (
        <details className="calendar-lessons">
          <summary>이번 달 교과목·일정</summary>
          <ul>
            {monthLessons.map(({ date, lesson, slots }) => (
              <li key={date}>
                <time dateTime={date}>{monthNumber}/{Number(date.slice(-2))}</time>
                <div>
                  <CategoryBadges slots={slots} />
                  {lesson && <LessonText lesson={lesson} />}
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
      {mini && monthNotes.length > 0 && (
        <ul className="calendar-month-notes" aria-label="이번 달 휴강 및 수업 변경">
          {monthNotes.map(([date, note]) => (
            <li key={date}><time dateTime={date}>{monthNumber}/{Number(date.slice(-2))}</time> {note}</li>
          ))}
        </ul>
      )}
      {mini && current && (
        <div className="calendar-period">
          <strong>현재 {current.title}</strong>
          <span>{current.start} ~ {current.end}</span>
          <span>수업 {current.days}일 · 과정 {course.hours}시간</span>
          <span>종료까지 {Math.round((Date.parse(current.end) - Date.parse(today)) / 86_400_000)}일</span>
        </div>
      )}
      {hasCourseSheet && <a className="calendar-source" href={courseSheet} target="_blank" rel="noreferrer">교과목 캘린더 원본</a>}
      {!mini && categoryDate && <CategoryEditor key={activeCategoryKey} date={categoryDate}
        categories={categoriesForCohort(filter)}
        initial={categorySettingsOn(categoryEdits, filter, categoryDate)}
        canReset={Object.hasOwn(categoryEdits, activeCategoryKey)} save={saveCategories}
        reset={() => saveCategories(null)} close={() => setCategoryDate(null)} addEvent={() => addEventOn(categoryDate)}
      />}
      {!mini && entry && (
        <CalendarForm
          key={entry.id ?? entry.start}
          entry={entry}
          cohorts={cohorts}
          close={() => setEntry(null)}
          save={(fields) => commit(entry.id
            ? events.map((event) => event.id === entry.id ? fields : event)
            : [...events, { ...fields, id: crypto.randomUUID() }])}
          remove={() => {
            if (window.confirm(`${entry.title} 일정을 삭제할까요?`)) commit(events.filter((event) => event.id !== entry.id))
          }}
        />
      )}
      {error && <p role="alert">일정을 브라우저에 저장할 수 없습니다.</p>}
    </section>
  )
}

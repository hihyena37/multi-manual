import { useEffect, useRef, useState } from 'react'
import {
  CalendarDays, ClipboardCheck, ClipboardList, Clock3, Eye, EyeOff, FileSpreadsheet, FileText, Folder,
  GraduationCap, ListTodo, Pencil, Phone, Plus, QrCode, Utensils, Vote, Wallet,
} from 'lucide-react'
import Calendar from './Calendar'
import Weather from './Weather'
import SortableChecklist from './SortableChecklist'
import { checklistOrderKey, loadChecklistOrder, mergeChecklistOrder } from './checklistOrder'
import { eventsOnDate, loadEvents } from './calendarEvents'
import { courseSheetSchedule } from './courseSheetSchedule'
import { busanCategoryOn, busanCourseCategories, busanLessonOn } from './busanCourseSheet'
import { busanCohortId, cohortLabel, gumiCohortId } from './courses'
import { attendanceDocuments, dailyTasks, periodTasks, weekdayOrder, weekdays, weeklyTasks, weekRange } from './routineTasks'
import { occursOn, repeatOptions, shiftDate } from './dateRecurrence'

const storageKey = 'work-manual.tasks.v1'
const routineEditsKey = 'work-manual.routine-edits.v1'
const timeZone = 'Asia/Seoul'
const dateKey = new Intl.DateTimeFormat('sv-SE', { timeZone, dateStyle: 'short' })
const dateLabel = new Intl.DateTimeFormat('ko-KR', { timeZone, dateStyle: 'full' })
const clockLabel = new Intl.DateTimeFormat('ko-KR', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const routineIcons = {
  qr: QrCode, attendance: ClipboardCheck, calls: Phone,
  'pre-survey': ClipboardList, satisfaction: ClipboardCheck, 'post-survey': ClipboardList,
  exam: GraduationCap, mgmt: FileSpreadsheet, sheet: FileSpreadsheet, request: FileText,
  leave: Folder, 'leader-election': Vote, 'leader-payment': Wallet, 'lunch-payment': Utensils, lunch: Utensils,
}

function loadRoutineEdits() {
  try {
    const saved = JSON.parse(localStorage.getItem(routineEditsKey))
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved
  } catch {
    // Use original labels when saved edits cannot be read.
  }
  return {}
}

function loadTasks() {
  try {
    const tasks = JSON.parse(localStorage.getItem(storageKey))
    return Array.isArray(tasks) ? tasks : []
  } catch {
    return []
  }
}

function tomorrow(date) {
  const next = new Date(`${date}T00:00:00+09:00`)
  next.setTime(next.getTime() + 86_400_000)
  return dateKey.format(next)
}

function HideTask({ title, hide }) {
  if (!hide) return null
  return <button type="button" className="task-visibility" onClick={hide} title="이 기간에 숨기기" aria-label={`${title} 숨기기`}><Eye size={17} aria-hidden="true" /></button>
}

function HiddenTasks({ items, show }) {
  if (!items.length) return null
  return (
    <details className="hidden-tasks">
      <summary>숨긴 할 일 {items.length}개</summary>
      <ul>
        {items.map(({ id, title }) => (
          <li key={id}>
            <span>{title}</span>
            <button type="button" className="task-visibility" onClick={() => show(id)} title="다시 표시" aria-label={`${title} 다시 표시`}><EyeOff size={17} aria-hidden="true" /></button>
          </li>
        ))}
      </ul>
    </details>
  )
}

function TaskRow({ task, update, remove, checked, toggle, rowProps, handle, hide, weekdayBadge }) {
  const [editing, setEditing] = useState(false)

  function save(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const title = fields.get('title').trim()
    if (!title) return
    update({ title, repeat: fields.get('repeat') })
    setEditing(false)
  }

  return (
    <li className={weekdayBadge ? 'task-row task-schedule' : 'task-row'} {...rowProps}>
      {handle}
      {editing ? (
        <form className="task-form" onSubmit={save}>
          <input name="title" aria-label="할 일 제목 수정" defaultValue={task.title} maxLength={160} required />
          <select name="repeat" aria-label="할 일 반복 수정" defaultValue={task.repeat ?? ''}>
            {repeatOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="submit">저장</button>
          <button type="button" className="task-secondary" onClick={() => setEditing(false)}>취소</button>
        </form>
      ) : (
        <>
          <label className="task-label">
            <input type="checkbox" checked={checked} onChange={(event) => toggle(event.target.checked)} />
            <span className="checklist-icon" aria-hidden="true"><ListTodo size={16} /></span>
            <span className={checked ? 'task-done' : undefined}>{task.title}</span>
          </label>
          {weekdayBadge && <span className="task-scope" data-weekday={weekdayBadge}>{weekdayBadge}</span>}
          <div className="task-actions">
            <HideTask title={task.title} hide={hide} />
            {!weekdayBadge && !checked && !task.repeat && <button type="button" onClick={() => update({ date: tomorrow(task.date) })}>내일로</button>}
            <button type="button" onClick={() => setEditing(true)}>수정</button>
            <button type="button" onClick={remove}>삭제</button>
          </div>
        </>
      )}
    </li>
  )
}

function ChecklistHeading({ id, title, complete, total, range }) {
  const percentage = total ? Math.round(complete / total * 100) : 0
  return (
    <>
      <div className="checklist-heading">
        <h2 id={id}>{title}</h2>
        <span aria-live="polite">{complete}/{total} 완료 · {percentage}%</span>
      </div>
      {range && <p className="checklist-range">{range}</p>}
      <progress aria-label={`${title} 진행률`} max="100" value={percentage} />
    </>
  )
}

function RoutineForm({ item, weekly, save, cancel }) {
  function submit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const nextTitle = data.get('title').trim()
    if (!nextTitle) {
      const input = event.currentTarget.elements.namedItem('title')
      input.setCustomValidity('할 일 내용을 입력해 주세요.')
      input.reportValidity()
      return
    }
    save({ title: nextTitle, hint: data.get('hint').trim(), badge: data.get('badge') ?? item?.badge ?? '' })
  }

  return (
        <form className="task-form checklist-edit" onSubmit={submit}>
          <label>할 일{item?.title.includes('\n') ? (
            <textarea name="title" defaultValue={item.title} rows={3} maxLength={500} required onInput={(event) => event.target.setCustomValidity('')} />
          ) : (
            <input name="title" defaultValue={item?.title} maxLength={160} required onInput={(event) => event.target.setCustomValidity('')} />
          )}</label>
          <label>안내<input name="hint" defaultValue={item?.hint} maxLength={160} /></label>
          {weekly && (
            <label>요일
              <select name="badge" defaultValue={item?.badge ?? ''}>
                <option value="">요일 지정 없음</option>
                {weekdays.map((day) => <option key={day}>{day}</option>)}
              </select>
            </label>
          )}
          <button type="submit">{item ? '저장' : '추가'}</button>
          {cancel && <button type="button" className="task-secondary" onClick={cancel}>취소</button>}
        </form>
  )
}

function ChecklistRow({ item, done, toggle, edit, remove, rowProps, handle, hide }) {
  const [editing, setEditing] = useState(false)
  const { title, hint, badge, Icon } = item

  return (
    <li className="task-row task-schedule" {...rowProps}>
      {handle}
      {editing ? (
        <RoutineForm item={item} weekly={item.weekly && !item.dailyEditKey} cancel={() => setEditing(false)} save={(fields) => {
          if (edit(item.dailyEditKey ?? item.templateKey, fields)) setEditing(false)
        }} />
      ) : (
        <>
        <label className="task-label">
          <input type="checkbox" checked={done} disabled={!toggle} onChange={(event) => toggle?.(item.id, event.target.checked)} />
          <span className="checklist-icon" aria-hidden="true"><Icon size={16} /></span>
          <span>
            <span className={done ? 'task-done' : undefined}>{title}</span>
            {hint && <small className="checklist-hint">{hint}</small>}
          </span>
        </label>
        {badge && <span className="task-scope" data-weekday={item.weekly ? badge : undefined}>{badge}</span>}
        {(edit || hide) && <div className="task-actions">
          <HideTask title={title} hide={hide} />
          {edit && <>
            <button type="button" onClick={() => setEditing(true)} aria-label={`${title} 수정`}><Pencil size={13} aria-hidden="true" /> 수정</button>
            <button type="button" onClick={() => remove(item)} aria-label={`${title} 삭제`}>삭제</button>
          </>}
        </div>}
        </>
      )}
    </li>
  )
}

function RoutineAdder({ weekly, save }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="routine-adder">
      {open ? (
        <RoutineForm weekly={weekly} cancel={() => setOpen(false)} save={(fields) => {
          if (save(fields)) setOpen(false)
        }} />
      ) : (
        <div className="operations-actions">
          <button type="button" onClick={() => setOpen(true)}>+ 항목 추가</button>
        </div>
      )}
    </div>
  )
}

function RoutineList({ checked, toggle, edit, remove, hide, ...list }) {
  return <SortableChecklist {...list} render={(item, rowProps, handle) => (
    <ChecklistRow key={item.id} item={item} done={checked.has(item.id)} toggle={toggle} edit={edit} remove={remove} rowProps={rowProps} handle={handle} hide={hide && (() => hide(item.id))} />
  )} />
}

function NextWeekTasks({ start, end, items, add, remove }) {
  const [chosenDate, setChosenDate] = useState(start)
  const date = chosenDate >= start && chosenDate <= end ? chosenDate : start

  return (
    <section className="management-card next-week-tasks" aria-labelledby="next-week-title">
      <h2 id="next-week-title">차주 할 일</h2>
      <p className="checklist-range">{start} ~ {end}</p>
      <form className="next-week-form" onSubmit={(event) => {
        event.preventDefault()
        const input = event.currentTarget.elements.namedItem('title')
        const title = input.value.trim()
        if (title && add(title, date)) input.value = ''
      }}>
        <label>날짜<input type="date" min={start} max={end} value={date} onChange={(event) => setChosenDate(event.target.value)} required /></label>
        <label>할 일<input name="title" placeholder="차주에 할 일을 적으세요" maxLength={160} required /></label>
        <button type="submit"><Plus size={16} aria-hidden="true" /> 추가</button>
      </form>
      {items.length > 0 && <ul className="next-week-list">
        {items.map((item) => <li key={item.id}>
          <time dateTime={item.date}>{item.date.slice(5).replace('-', '/')}</time>
          <span>{item.title}</span>
          <button type="button" onClick={() => remove(item.id)} aria-label={`${item.title} 삭제`}>삭제</button>
        </li>)}
      </ul>}
    </section>
  )
}

export default function Home({ course, cohort }) {
  const [now, setNow] = useState(() => new Date())
  const [tasks, setTasks] = useState(loadTasks)
  const [events] = useState(loadEvents)
  const [routineEdits, setRoutineEdits] = useState(loadRoutineEdits)
  const [checklistOrder, setChecklistOrder] = useState(loadChecklistOrder)
  const [storageError, setStorageError] = useState(false)
  const [routineError, setRoutineError] = useState(false)
  const dailyForm = useRef(null)
  const cohortId = cohort?.id

  useEffect(() => {
    dailyForm.current?.reset()
  }, [cohortId])

  useEffect(() => {
    const refresh = () => {
      const current = new Date()
      setNow((previous) => Math.floor(current.getTime() / 60_000) === Math.floor(previous.getTime() / 60_000) ? previous : current)
    }
    const timer = window.setInterval(refresh, 1000)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  const today = dateKey.format(now)
  const todayEvents = eventsOnDate(events, today, cohort?.id)
  const period = todayEvents.find((event) => event.cohortId && event.days)
  const busanCategory = cohort?.id === busanCohortId
    ? busanCourseCategories.find(({ key }) => key === busanCategoryOn(today))?.label : undefined
  const lesson = cohort?.id === busanCohortId ? [busanCategory, busanLessonOn(today)].filter(Boolean).join('\n')
    : cohort?.id === gumiCohortId ? courseSheetSchedule[today] : undefined
  const schedule = todayEvents.filter((event) => !event.days).map(({ id, title }) => ({ id, title, badge: '캘린더 일정', Icon: CalendarDays }))
  if (lesson) schedule.unshift({ id: `${cohort.id}-sheet`, title: lesson, badge: '캘린더 일정', Icon: GraduationCap })
  const scope = cohort?.id ?? 'common'
  function scopedItems(items, prefix, includeCustom = false) {
    if (!cohort) return []
    const templatePrefix = `${scope}:${prefix.split(':')[0]}:`
    const custom = includeCustom ? Object.entries(routineEdits)
      .filter(([key]) => key.startsWith(`${templatePrefix}custom-`))
      .map(([key]) => ({ id: key.slice(templatePrefix.length) })) : []
    return [...items, ...custom].flatMap((item) => {
      const templateKey = templatePrefix + item.id
      const fields = routineEdits[templateKey]
      if (fields?.deleted) return []
      return [{
        ...item, ...fields, templateKey,
        id: `routine:${scope}:${prefix}:${item.id}`,
        Icon: routineIcons[item.id] ?? ListTodo,
        weekly: prefix === 'week',
      }]
    })
  }
  const [weekStart, weekEnd] = weekRange(today)
  const nextWeekStart = shiftDate(weekStart, 7)
  const nextWeekEnd = shiftDate(weekEnd, 7)
  const nextWeekItems = tasks.filter((task) => !task.scheduleId && task.cohortId === cohort?.id
    && task.date >= nextWeekStart && task.date <= nextWeekEnd)
    .sort((a, b) => a.date.localeCompare(b.date))
  const datedTasks = tasks.filter((task) => !task.scheduleId && (
    (task.cohortId ?? gumiCohortId) === cohort?.id
  ))
  const visibleTasks = datedTasks.filter((task) => occursOn(task.date, today, task.repeat))
  // Older next-week entries were stored in the same format as one-off daily tasks.
  const thisWeekTasks = datedTasks.filter((task) => (task.planned || !task.repeat)
    && task.date >= weekStart && task.date <= weekEnd)
    .map((task) => ({ ...task, badge: weekdays[(new Date(task.date).getUTCDay() + 6) % 7] }))
  const checkedOn = (date) => new Set(tasks.filter((task) => task.date === date && task.scheduleId).map((task) => task.scheduleId))
  const checkedToday = checkedOn(today)
  const checkedWeek = checkedOn(weekStart)
  const checkedUnit = checkedOn(period?.start)
  const visibilityKey = (id) => `hidden:${scope}:${id}`
  const isHidden = (item, saved) => saved.has(visibilityKey(item.id))
  const allWeekly = scopedItems(weeklyTasks, 'week', true)
  const weekday = weekdays[(new Date(today).getUTCDay() + 6) % 7]
  const dueWeekly = allWeekly.filter((item) => item.badge === weekday)
  const dueWeeklyIds = new Set(dueWeekly.map(({ id }) => id))
  const dailyCopies = (items) => items.flatMap((item) => {
    const dailyEditKey = `${scope}:day-copy:${today}:${item.id}`
    const fields = routineEdits[dailyEditKey]
    return fields?.deleted ? [] : [{ ...item, ...fields, dailyEditKey }]
  })
  const dailyEntries = [
    ...dailyCopies(schedule), ...scopedItems(dailyTasks, 'day'),
    ...dailyCopies(dueWeekly), ...visibleTasks,
  ]
  const allDaily = [...new Map(dailyEntries.map((item) => [item.templateKey ?? item.id, item])).values()]
  const allDocuments = scopedItems(attendanceDocuments, `period:${period?.id}`)
  const allUnit = scopedItems(periodTasks, `period:${period?.id}`, true)
  const dailyChecks = (id) => dueWeeklyIds.has(id) ? checkedWeek : checkedToday
  const dailyActionDate = (id) => dueWeeklyIds.has(id) ? weekStart : today
  const daily = allDaily.filter((item) => !isHidden(item, dailyChecks(item.id)))
  const weeklyEntries = [...allWeekly, ...thisWeekTasks]
  const weekly = weeklyEntries.filter((item) => !isHidden(item, checkedWeek))
  const documents = allDocuments.filter((item) => !isHidden(item, checkedUnit))
  const unit = allUnit.filter((item) => !isHidden(item, checkedUnit))
  const count = (items, checked) => items.filter(({ id }) => checked.has(id)).length
  const isDone = (task) => task.repeat
    ? checkedToday.has(`task:${task.id}`) || (task.date === today && task.done)
    : task.done
  const completed = daily.filter((item) => item.Icon ? dailyChecks(item.id).has(item.id) : isDone(item)).length
  const total = daily.length

  function commit(next) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setTasks(next)
      setStorageError(false)
      return true
    } catch {
      setStorageError(true)
      return false
    }
  }

  function addTask(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = form.get('title').trim()
    if (!title || !cohort) return
    commit([...tasks, {
      id: crypto.randomUUID(),
      date: dateKey.format(new Date()),
      title,
      done: false,
      repeat: form.get('repeat'),
      courseId: course.id,
      cohortId: cohort.id,
    }])
    event.currentTarget.elements.namedItem('title').value = ''
  }

  function planNextWeek(title, date) {
    if (!cohort || date < nextWeekStart || date > nextWeekEnd) return false
    return commit([...tasks, {
      id: crypto.randomUUID(), title, date, done: false, repeat: '', planned: true,
      courseId: course.id, cohortId: cohort.id,
    }])
  }

  function toggleSchedule(date, scheduleId, checked) {
    commit(checked
      ? [...tasks, { scheduleId, date }]
      : tasks.filter((task) => task.scheduleId !== scheduleId || task.date !== date))
  }

  function setHidden(date, id, hidden) {
    toggleSchedule(date, visibilityKey(id), hidden)
  }

  function editRoutine(templateKey, fields) {
    const next = { ...routineEdits, [templateKey]: fields }
    try {
      localStorage.setItem(routineEditsKey, JSON.stringify(next))
      setRoutineEdits(next)
      setRoutineError(false)
      return true
    } catch {
      setRoutineError(true)
      return false
    }
  }

  function removeRoutine({ templateKey, dailyEditKey, title, hint = '', badge = '' }) {
    const scopeLabel = dailyEditKey ? '오늘의 일일 할 일' : '이 과정의 체크리스트'
    if (window.confirm(`‘${title}’ 항목을 ${scopeLabel}에서 삭제할까요?`)) {
      editRoutine(dailyEditKey ?? templateKey, { title, hint, badge, deleted: true })
    }
  }

  const routineActions = { edit: editRoutine, remove: removeRoutine }
  const toggleUnit = period ? (id, done) => toggleSchedule(period.start, id, done) : undefined

  function sorting(group) {
    const key = `${scope}:${group}`
    const preferred = checklistOrder[key] ?? []
    return {
      preferred,
      save(ids) {
        const next = { ...checklistOrder, [key]: mergeChecklistOrder(preferred, ids) }
        setChecklistOrder(next)
        try {
          localStorage.setItem(checklistOrderKey, JSON.stringify(next))
          setRoutineError(false)
        } catch {
          setRoutineError(true)
        }
      },
    }
  }

  function toggleTask(task, done, date = today) {
    if (task.repeat && task.date !== date) toggleSchedule(date, `task:${task.id}`, done)
    else commit(tasks.map((entry) => entry.id === task.id ? { ...entry, done } : entry))
  }

  function renderTask(task, rowProps, handle, weeklyView = false) {
    return (
      <TaskRow
        key={task.id}
        task={task}
        checked={weeklyView ? task.done : isDone(task)}
        toggle={(done) => toggleTask(task, done, weeklyView ? task.date : today)}
        rowProps={rowProps}
        handle={handle}
        weekdayBadge={weeklyView ? task.badge : undefined}
        hide={() => setHidden(weeklyView ? weekStart : today, task.id, true)}
        update={(fields) => commit(tasks.map((entry) => entry.id === task.id ? { ...entry, ...fields } : entry))}
        remove={() => commit(tasks.filter(({ id }) => id !== task.id))}
      />
    )
  }

  return (
    <div className="home">
      <div className="home-overview">
        <div>
          <div className="home-date">
            <CalendarDays size={21} aria-hidden="true" />
            <time dateTime={today}>{dateLabel.format(now)}</time>
          </div>
          {course && <p className="home-course">{course.name}{cohort && ` ${cohortLabel(cohort)}`}{period && ` · ${period.title}`}</p>}
        </div>
        <div className="home-overview-widgets">
          <Weather />
          <div className="home-clock">
            <Clock3 size={21} aria-hidden="true" />
            <div><span>한국 시간</span><time dateTime={now.toISOString()}>{clockLabel.format(now)}</time></div>
          </div>
        </div>
      </div>
      {routineError && <p role="alert">브라우저에 체크리스트 수정을 저장할 수 없습니다.</p>}
      <div className="home-columns">
      <div className="home-checklists">
      <section className="management-card home-checklist" aria-labelledby="checklist-title">
        <ChecklistHeading id="checklist-title" title="일일 할 일" complete={completed} total={total} />
        {cohort && <form ref={dailyForm} className="task-form" onSubmit={addTask}>
          <input name="title" aria-label="새 할 일" placeholder="할 일을 입력하세요" maxLength={160} required />
          <select name="repeat" aria-label="할 일 반복">
            {repeatOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="submit" aria-label="일일 할 일 추가"><Plus size={16} aria-hidden="true" /> 추가</button>
        </form>}
        {storageError && <p role="alert">브라우저에 할 일을 저장할 수 없습니다.</p>}
          <SortableChecklist
            key={scope}
            items={daily}
            {...sorting('daily')}
            render={(item, rowProps, handle) => item.Icon ? (
              <ChecklistRow key={item.id} item={item} done={dailyChecks(item.id).has(item.id)} toggle={(id, done) => toggleSchedule(dailyActionDate(id), id, done)} rowProps={rowProps} handle={handle} hide={() => setHidden(dailyActionDate(item.id), item.id, true)} {...routineActions} />
            ) : renderTask(item, rowProps, handle)}
          />
        <HiddenTasks items={allDaily.filter((item) => isHidden(item, dailyChecks(item.id)))} show={(id) => setHidden(dailyActionDate(id), id, false)} />
      </section>
      <section className="management-card home-checklist" aria-labelledby="weekly-title">
        <ChecklistHeading id="weekly-title" title="주간 할 일" complete={weekly.filter((item) => item.Icon ? checkedWeek.has(item.id) : item.done).length} total={weekly.length} range={`${weekStart} ~ ${weekEnd}`} />
        {cohort && <RoutineAdder key={`week:${cohort.id}`} weekly save={(fields) => editRoutine(`${scope}:week:custom-${crypto.randomUUID()}`, fields)} />}
        <SortableChecklist key={scope} items={weekly} groupOrder={weekdayOrder} {...sorting('weekly')}
          render={(item, rowProps, handle) => item.Icon ? (
            <ChecklistRow key={item.id} item={item} done={checkedWeek.has(item.id)} toggle={(id, done) => toggleSchedule(weekStart, id, done)} rowProps={rowProps} handle={handle} hide={() => setHidden(weekStart, item.id, true)} {...routineActions} />
          ) : renderTask(item, rowProps, handle, true)} />
        <HiddenTasks items={weeklyEntries.filter((item) => isHidden(item, checkedWeek))} show={(id) => setHidden(weekStart, id, false)} />
      </section>
      <section className="management-card home-checklist" aria-labelledby="unit-title">
        {cohort ? (
          <>
            <ChecklistHeading id="unit-title" title="단위기간 할 일" complete={count([...documents, ...unit], checkedUnit)} total={documents.length + unit.length} range={period ? `${period.title} · ${period.start} ~ ${period.end}` : '진행 중인 단위기간에 체크할 수 있어요.'} />
            <RoutineAdder key={`period:${cohort.id}`} save={(fields) => editRoutine(`${scope}:period:custom-${crypto.randomUUID()}`, fields)} />
            {documents.length > 0 && <>
            <h3 className="checklist-group-title"><Folder size={17} aria-hidden="true" /> 대한상의 출석부 정리</h3>
              <RoutineList key={`${scope}:documents`} className="checklist-subtasks" items={documents} checked={checkedUnit} toggle={toggleUnit} hide={period && ((id) => setHidden(period.start, id, true))} {...routineActions} {...sorting('documents')} />
            </>}
            <RoutineList key={`${scope}:unit`} items={unit} checked={checkedUnit} toggle={toggleUnit} hide={period && ((id) => setHidden(period.start, id, true))} {...routineActions} {...sorting('unit')} />
            <HiddenTasks items={[...allDocuments, ...allUnit].filter((item) => isHidden(item, checkedUnit))} show={(id) => setHidden(period.start, id, false)} />
          </>
        ) : (
          <>
            <h2 id="unit-title">단위기간 할 일</h2>
            <p className="task-empty">상단에서 과정과 기수를 선택해 주세요.</p>
          </>
        )}
      </section>
      </div>
      <div className="home-calendar-column">
        <Calendar mini course={course} cohort={cohort} today={today} />
        {cohort && <NextWeekTasks start={nextWeekStart} end={nextWeekEnd} items={nextWeekItems}
          add={planNextWeek} remove={(id) => commit(tasks.filter((task) => task.id !== id))} />}
      </div>
      </div>
    </div>
  )
}

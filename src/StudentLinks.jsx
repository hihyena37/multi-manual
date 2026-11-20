import { useState } from 'react'
import {
  Award, BriefcaseBusiness, CalendarDays, ClipboardCheck, ClipboardList, FileCheck,
  GraduationCap, ListChecks, MessageSquare, NotebookPen, Pencil, Presentation,
  Table2, UsersRound,
} from 'lucide-react'
import { cohortLabel, gumiCohortId } from './courses'
import { courseSheetSchedule } from './courseSheetSchedule'
import { previewRows } from './sheetPreview'

const gumiOperatorTabs = {
  timetable: '315838374',
  calendar: '839534603',
  participants: '1395570111',
  'live-attendance': '1980085984',
  instructors: '1462404805',
  certificates: '279822164',
}
const gumiOperatorLinks = Object.fromEntries(Object.entries(gumiOperatorTabs).map(([id, gid]) => [
  id, `https://docs.google.com/spreadsheets/d/1hIktc9PY-MZy0Y1B9sBvRcQdGF6k43wZDiVtLSopxMk/edit?gid=${gid}#gid=${gid}`,
]))

const sections = [
  { name: '참여청년 관리시트(운영자)', type: 'operator', icon: BriefcaseBusiness, links: [
    ['timetable', '시간표', Table2],
    ['calendar', '캘린더', CalendarDays],
    ['participants', '참여청년 명단', UsersRound],
    ['live-attendance', '실시간 출결 현황', ListChecks],
    ['instructors', '출강 강사', Presentation],
    ['certificates', '자격증 취득 현황', GraduationCap],
  ] },
  { name: '참여청년 관리시트(강사)', type: 'instructor', icon: Presentation, links: [
    ['evaluation', '참여청년 평가 시트', ClipboardCheck],
    ['counseling', '상담일지', MessageSquare],
  ] },
  { name: '개인관리', type: 'personal', icon: NotebookPen, links: [
    ['roll', '출석부', ClipboardList],
    ['attendance', '출석관리', ListChecks],
    ['attendance-summary', '출결합', FileCheck],
    ['awards', '우수훈련생', Award],
    ['satisfaction', '만족도 취합', NotebookPen],
  ] },
]

const defaultLayout = sections.map(({ name, type, links }) => ({
  name, type, cards: links.map(([id, label]) => ({ id, label })),
}))

function readLayout(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    if (Array.isArray(saved)) return saved
  } catch {
    // Show the original cards if a saved layout cannot be read.
  }
  return defaultLayout
}

function NameForm({ label, initial, save }) {
  return (
    <form className="task-form" onSubmit={(event) => {
      event.preventDefault()
      const name = event.currentTarget.elements.namedItem('name').value.trim()
      if (name && save(name) && !initial) event.currentTarget.reset()
    }}>
      <input name="name" aria-label={label} placeholder={label} defaultValue={initial} maxLength={100} required />
      <button type="submit">{initial ? '이름 저장' : '추가'}</button>
    </form>
  )
}

function readLinks(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved
  } catch {
    // Start with empty shortcuts when no saved links can be read.
  }
  return {}
}

function webUrl(value) {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href
  } catch {
    return ''
  }
  return ''
}

function openBeside(url) {
  const { availWidth, availHeight, availLeft = 0, availTop = 0 } = window.screen
  const width = Math.min(availWidth, Math.max(680, Math.round(availWidth * 0.55)))
  const height = Math.min(availHeight, Math.max(500, availHeight - 40))
  window.open(url, '_blank', [
    'popup', 'noopener', 'noreferrer', `width=${width}`, `height=${height}`,
    `left=${availLeft + availWidth - width}`, `top=${availTop + 12}`,
  ].join(','))
}

function SheetThumbnail({ id, Icon, name, rows }) {
  const type = id === 'calendar' ? 'calendar' : id === 'timetable' ? 'timetable' : 'table'
  const cells = Array.from({ length: type === 'calendar' ? 21 : 12 }, (_, index) => index)
  return (
    <div className={`sheet-thumbnail sheet-thumbnail--${type}`}>
      <div className="sheet-thumbnail-header"><Icon size={13} /><span>{name}</span></div>
      {rows.length > 0 ? <div className="sheet-preview-values"><table aria-label={`${name} 셀 미리보기`}><tbody>
        {rows.map((row, index) => <tr key={index}>
          {row.map((cell, column) => <td key={column}>{cell}</td>)}
        </tr>)}
      </tbody></table></div> : <div className="sheet-thumbnail-grid">
        {cells.map((index) => <span key={index} />)}
      </div>}
    </div>
  )
}

function Shortcut({ id, name, Icon, url, onSave, context, preview, defaultPreview, onPreviewSave }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const rows = preview ? previewRows(preview) : defaultPreview

  function save(value) {
    const normalized = webUrl(value)
    if (value && !normalized) {
      setError('https:// 또는 http://로 시작하는 주소를 입력해 주세요.')
      return
    }
    if (!onSave(normalized)) {
      setError('브라우저에 링크를 저장할 수 없습니다.')
      return
    }
    setEditing(false)
    setError('')
  }

  return (
    <li className="student-shortcut">
      <div className="student-shortcut-heading">
        {url ? (
          <div className="student-sheet-launch">
            <h3><button type="button" className="student-sheet-button" onClick={() => openBeside(url)} aria-label={`${name} 시트 열기`}>
              <span className="student-shortcut-icon"><Icon size={19} aria-hidden="true" /></span>
              <span>{name}</span>
            </button></h3>
            <div className="student-sheet-preview">
              <SheetThumbnail id={id} Icon={Icon} name={name} rows={rows} />
              <span>{context}</span>
              <span>{rows.length ? '저장된 셀 값' : '등록된 셀 미리보기 없음'}</span>
            </div>
          </div>
        ) : <>
          <span className="student-shortcut-icon"><Icon size={19} aria-hidden="true" /></span>
          <div><h3>{name}</h3><span>링크 미등록</span></div>
        </>}
        {!editing && (
          <button type="button" className="student-link-edit" onClick={() => setEditing(true)} aria-label={`${name} 링크 ${url ? '수정' : '등록'}`}>
            <Pencil size={14} aria-hidden="true" /> {url ? '수정' : '등록'}
          </button>
        )}
      </div>
      {editing && (
        <>
        <form className="task-form student-link-form" onSubmit={(event) => {
          event.preventDefault()
          save(new FormData(event.currentTarget).get('url').trim())
        }}>
          <input name="url" type="url" aria-label={`${name} 주소`} placeholder="https://" defaultValue={url} required />
          <button type="submit">저장</button>
          <button type="button" className="task-secondary" onClick={() => { setEditing(false); setError('') }}>취소</button>
          {url && <button type="button" className="task-secondary" onClick={() => save('')}>링크 제거</button>}
          {error && <p role="alert">{error}</p>}
        </form>
        {url && <form className="task-form student-link-form student-preview-form" onSubmit={(event) => {
          event.preventDefault()
          const content = event.currentTarget.elements.namedItem('cells').value
          if (onPreviewSave(content)) {
            setError('')
            setEditing(false)
          } else setError('브라우저에 셀 미리보기를 저장할 수 없습니다.')
        }}>
          <label>셀 미리보기<textarea name="cells" defaultValue={preview} maxLength={10000} rows={4} placeholder="시트에서 최대 6행 × 6열을 복사해 붙여넣으세요." /></label>
          <button type="submit">미리보기 저장</button>
        </form>}
        </>
      )}
    </li>
  )
}

export default function StudentLinks({ course, cohort }) {
  const storageKey = `work-manual.student-links.v1.${course?.id}.${cohort?.id}`
  const layoutKey = `work-manual.student-layout.v1.${course?.id}.${cohort?.id}`
  const previewKey = `work-manual.student-previews.v1.${course?.id}.${cohort?.id}`
  const [links, setLinks] = useState(() => cohort ? readLinks(storageKey) : {})
  const [previews, setPreviews] = useState(() => readLinks(previewKey))
  const defaultLinks = cohort?.id === gumiCohortId ? gumiOperatorLinks : {}
  const [layout, setLayout] = useState(() => readLayout(layoutKey))
  const [layoutError, setLayoutError] = useState(false)

  function saveLayout(next) {
    try {
      localStorage.setItem(layoutKey, JSON.stringify(next))
      setLayout(next)
      setLayoutError(false)
      return true
    } catch {
      setLayoutError(true)
      return false
    }
  }

  function editSection(type, change) {
    return saveLayout(layout.map((group) => group.type === type ? change(group) : group))
  }

  function move(type, cards, index, offset) {
    const next = [...cards]
    const target = index + offset
    const card = next[index]
    next[index] = next[target]
    next[target] = card
    return editSection(type, (group) => ({ ...group, cards: next }))
  }

  function save(id, url) {
    const next = { ...links }
    if (url || Object.hasOwn(defaultLinks, id)) next[id] = url
    else delete next[id]
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setLinks(next)
      return true
    } catch {
      return false
    }
  }

  function savePreview(id, url, text) {
    const next = { ...previews }
    if (text.trim()) next[id] = { url, text }
    else delete next[id]
    try {
      localStorage.setItem(previewKey, JSON.stringify(next))
      setPreviews(next)
      return true
    } catch {
      return false
    }
  }

  if (!cohort) return <p className="management-card">상단에서 교육과정과 기수를 선택하면 시트 링크를 관리할 수 있어요.</p>
  const context = `${course.name} ${cohortLabel(cohort)}`
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', dateStyle: 'short' }).format()
  const lessons = Object.entries(courseSheetSchedule)
  const upcoming = lessons.filter(([date]) => date >= today).slice(0, 3)
  const calendarPreview = [['날짜', '교과목·일정'], ...(upcoming.length ? upcoming : lessons.slice(-3))]

  return (
    <div className="management student-links">
      <p className="student-context">{context}</p>
      <details className="management-card student-layout">
        <summary>분류 및 바로가기 편집</summary>
        <NameForm label="새 분류 이름" save={(name) => saveLayout([...layout, { name, type: crypto.randomUUID(), cards: [] }])} />
        {layout.map(({ type, name, cards }) => (
          <div key={type} className="student-layout-section">
            <h3>{name}</h3>
            <NameForm label={`${name} 분류 이름`} initial={name} save={(value) => editSection(type, (group) => ({ ...group, name: value }))} />
            <NameForm label={`${name} 새 바로가기`} save={(label) => editSection(type, (group) => ({ ...group, cards: [...cards, { id: crypto.randomUUID(), label }] }))} />
            {cards.map((card, index) => (
              <div key={card.id} className="student-layout-row">
                <NameForm label={`${card.label} 바로가기 이름`} initial={card.label} save={(label) => editSection(type, (group) => ({ ...group, cards: cards.map((item) => item.id === card.id ? { ...item, label } : item) }))} />
                <div className="operations-actions">
                  <button type="button" disabled={!index} aria-label={`${card.label} 앞으로 이동`} onClick={() => move(type, cards, index, -1)}>↑</button>
                  <button type="button" disabled={index === cards.length - 1} aria-label={`${card.label} 뒤로 이동`} onClick={() => move(type, cards, index, 1)}>↓</button>
                  <button type="button" onClick={() => {
                    if (window.confirm(`‘${card.label}’ 바로가기를 삭제할까요?`)) {
                      editSection(type, (group) => ({ ...group, cards: cards.filter(({ id }) => id !== card.id) }))
                    }
                  }}>삭제</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </details>
      {layoutError && <p role="alert">바로가기 구성을 저장할 수 없어요.</p>}
      {layout.map(({ name, type, cards }) => {
        const defaults = sections.find((section) => section.type === type)
        const SectionIcon = defaults?.icon ?? ClipboardList
        return (
        <section key={type} className={`management-card student-section student-section--${type}`} aria-labelledby={`student-${type}`}>
          <div className="student-section-heading">
            <SectionIcon size={21} aria-hidden="true" />
            <h2 id={`student-${type}`}>{name}</h2>
          </div>
          <ul className="student-link-grid">
            {cards.map(({ id, label }) => {
              const url = webUrl(links[id] ?? defaultLinks[id])
              return <Shortcut key={id} id={id} name={label} Icon={defaults?.links.find(([key]) => key === id)?.[2] ?? Table2}
                url={url} onSave={(value) => save(id, value)} context={context}
                preview={previews[id]?.url === url ? previews[id].text : ''}
                defaultPreview={id === 'calendar' && url && url === defaultLinks.calendar ? calendarPreview : []}
                onPreviewSave={(text) => savePreview(id, url, text)}
              />
            })}
          </ul>
        </section>
        )
      })}
    </div>
  )
}

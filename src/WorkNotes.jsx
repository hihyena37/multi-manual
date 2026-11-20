import { useState } from 'react'
import { BookOpen, ListChecks, Pin, Plus } from 'lucide-react'
import { cohortLabel } from './courses'

const storageKey = 'work-manual.notes.v1'
const dateLabel = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium' })

function loadNotes() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    if (Array.isArray(saved)) return saved
  } catch {
    // Use an empty list when saved notes cannot be read.
  }
  return []
}

function NoteForm({ draft, cohort, save, cancel }) {
  function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const title = fields.get('title').trim()
    if (!title) {
      const input = event.currentTarget.elements.namedItem('title')
      input.setCustomValidity('제목을 입력해 주세요.')
      input.reportValidity()
      return
    }
    save({
      ...draft,
      title,
      content: fields.get('content').trim(),
      cohortId: fields.get('scope') === 'cohort' ? cohort?.id ?? null : null,
    })
  }

  return (
    <form className="management-form operations-form notes-form" onSubmit={submit}>
      <label>제목<input name="title" defaultValue={draft.title} onInput={(event) => event.target.setCustomValidity('')} maxLength={120} required /></label>
      <label>내용<textarea name="content" rows={4} defaultValue={draft.content} /></label>
      <label>범위
        <select name="scope" defaultValue={draft.cohortId ? 'cohort' : 'common'}>
          <option value="common">공통</option>
          {cohort && <option value="cohort">{cohortLabel(cohort)}</option>}
        </select>
      </label>
      <button type="submit">저장</button>
      <button type="button" className="operations-secondary" onClick={cancel}>취소</button>
    </form>
  )
}

function NoteList({ notes, review, edit, update, remove, cohort }) {
  return (
    <ul className="notes-list">
      {notes.map((note) => (
        <li key={note.id} className={note.done ? 'note-card note-card--done' : 'note-card'}>
          <h3>
            {review ? (
              <label className="task-label">
                <input type="checkbox" checked={note.done} onChange={(event) => update({ ...note, done: event.target.checked })} />
                <span className={note.done ? 'task-done' : undefined}>{note.title}</span>
              </label>
            ) : note.title}
          </h3>
          {note.content && <p className="note-content">{note.content}</p>}
          <div className="note-meta">
            <time dateTime={note.createdAt}>{dateLabel.format(new Date(note.createdAt))}</time>
            <span>{note.cohortId && cohort ? cohortLabel(cohort) : '공통'}</span>
          </div>
          <div className="operations-actions">
            <button type="button" aria-pressed={note.pinned} onClick={() => update({ ...note, pinned: !note.pinned })}>
              <Pin size={13} aria-hidden="true" /> {note.pinned ? '고정 해제' : '상단 고정'}
            </button>
            <button type="button" onClick={() => edit(note)}>수정</button>
            <button type="button" onClick={() => remove(note)}>삭제</button>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default function WorkNotes({ cohort }) {
  const [notes, setNotes] = useState(loadNotes)
  const [draft, setDraft] = useState(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState(false)
  const term = query.trim().toLowerCase()
  const visible = notes
    .filter((note) => (!note.cohortId || note.cohortId === cohort?.id)
      && [note.title, note.content].some((value) => value.toLowerCase().includes(term)))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))

  function commit(next) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setNotes(next)
      setError(false)
      return true
    } catch {
      setError(true)
      return false
    }
  }

  function update(note) {
    return commit(notes.map((item) => item.id === note.id ? note : item))
  }

  function save(note) {
    const saved = note.id ? commit(notes.map((item) => item.id === note.id
      ? { ...item, title: note.title, content: note.content, cohortId: note.cohortId }
      : item)) : commit([...notes, {
      ...note, id: crypto.randomUUID(), createdAt: new Date().toISOString(), pinned: false, done: false,
    }])
    if (saved) setDraft(null)
  }

  function remove(note) {
    if (!window.confirm(`‘${note.title}’ 항목을 삭제할까요?`)) return
    if (commit(notes.filter((item) => item.id !== note.id)) && draft?.id === note.id) setDraft(null)
  }

  const listProps = { edit: setDraft, update, remove, cohort }
  const topics = [
    { id: 'learned', title: 'MEMO', icon: BookOpen },
    { id: 'review', title: '확인 사항', icon: ListChecks },
  ]

  return (
    <div className="management">
      <div className="notes-toolbar">
        <input type="search" aria-label="업무 메모 검색" placeholder="제목·내용 검색" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {error && <p role="alert">브라우저에 메모를 저장할 수 없습니다.</p>}
      <div className="notes-columns">
        {topics.map(({ id, title, icon: Icon }) => {
          const entries = visible.filter((note) => note.kind === id)
          const review = id === 'review'
          const groups = review
            ? [{ name: '확인 전', items: entries.filter((note) => !note.done) }, { name: '확인 완료', items: entries.filter((note) => note.done) }]
            : [{ name: '', items: entries }]
          return (
            <section key={id} className="management-card notes-section" aria-labelledby={`notes-${id}`}>
              <div className="notes-section-heading">
                <Icon size={20} aria-hidden="true" />
                <h2 id={`notes-${id}`}>{title}</h2>
                <button type="button" onClick={() => setDraft({ kind: id })} aria-label={`${title} 추가`}><Plus size={15} aria-hidden="true" /> 추가</button>
              </div>
              {draft?.kind === id && <NoteForm key={draft.id ?? id} draft={draft} cohort={cohort} save={save} cancel={() => setDraft(null)} />}
              {entries.length ? groups.filter(({ items }) => items.length > 0).map(({ name, items }) => (
                <div key={name} className="notes-group">
                  {name && <p className="notes-group-label">{name} {items.length}개</p>}
                  <NoteList notes={items} review={review} {...listProps} />
                </div>
              )) : <p className="task-empty">{term ? '검색 결과가 없어요.' : '등록된 항목이 없어요.'}</p>}
            </section>
          )
        })}
      </div>
    </div>
  )
}

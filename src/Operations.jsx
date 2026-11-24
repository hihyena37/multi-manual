import { useEffect, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, ExternalLink, FileText, Folder, Link2 } from 'lucide-react'
import { cohortLabel } from './courses'
import { downloadOperationFile, readOperationFiles, removeOperationFiles, storeOperationFiles } from './operationFiles'

const initialItems = [
  ['textbooks', '교재'],
  ['supplies', '실습용품'],
  ['signatures', '서명서(저장용)'],
  ['templates', '서명서(양식용)'],
].map(([id, name]) => ({ id, name, kind: 'folder', parentId: null }))

function loadItems(key, defaults) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    if (Array.isArray(saved)) return saved
  } catch {
    // Use the default folders if the saved collection is unavailable.
  }
  return defaults
}

function ancestors(id, items) {
  const path = []
  let item = items.find((entry) => entry.id === id)
  while (item && !path.includes(item)) {
    path.unshift(item)
    item = items.find((entry) => entry.id === item.parentId)
  }
  return path
}

function safeLink(value) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

function ManualText({ content }) {
  const blocks = content.split(/\n\s*\n/)
  return (
    <div className="manual-text">
      {blocks.map((block, index) => {
        const lines = block.split('\n')
        const image = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
        if (image && safeLink(image[2])) {
          return <img key={index} src={safeLink(image[2])} alt={image[1]} loading="lazy" referrerPolicy="no-referrer" />
        }
        if (lines.length >= 3 && lines[1].includes('|') && /^[\s|:-]+$/.test(lines[1])) {
          const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim())
          return <div key={index} className="manual-table"><table>
            <thead><tr>{cells(lines[0]).map((cell, column) => <th key={column}>{cell}</th>)}</tr></thead>
            <tbody>{lines.slice(2).map((line, row) => <tr key={row}>{cells(line).map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody>
          </table></div>
        }
        return <p key={index}>{block.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\([^)]+\))/g).map((part, position) => {
          if (part.startsWith('**') && part.endsWith('**') && part.length > 4) return <strong key={position}>{part.slice(2, -2)}</strong>
          if (part.startsWith('*') && part.endsWith('*') && part.length > 2) return <em key={position}>{part.slice(1, -1)}</em>
          const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
          const url = link && safeLink(link[2])
          return url ? <a key={position} href={url} target="_blank" rel="noopener noreferrer">{link[1]}</a> : part
        })}</p>
      })}
    </div>
  )
}

function ItemForm({ item, save, cancel, textLabel, manual }) {
  const [error, setError] = useState('')
  const [content, setContent] = useState(item.content ?? '')

  function submit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = data.get('name').trim()
    const content = data.get('content')?.trim() ?? ''
    const value = item.kind === 'link' ? safeLink(content) : content
    if (!name || (item.kind !== 'folder' && !value)) {
      setError(item.kind === 'link' ? '이름과 올바른 웹 주소를 입력해 주세요.' : '빈칸을 채워 주세요.')
      return
    }
    save({ ...item, name, content: value, ...(manual && item.kind === 'note' ? { formatted: true } : {}) })
  }

  return (
    <form className="management-form operations-form" onSubmit={submit}>
      <label>이름<input name="name" defaultValue={item.name} maxLength={100} required /></label>
      {item.kind === 'link' && <label>웹 주소<input type="url" name="content" defaultValue={item.content} required /></label>}
      {item.kind === 'note' && <label className={manual ? 'manual-editor' : undefined}>{textLabel}
        <textarea name="content" value={content} onChange={(event) => setContent(event.target.value)} rows={manual ? 7 : 4} required />
      </label>}
      {manual && item.kind === 'note' && (
        <div className="operations-actions manual-editor">
          {[
            ['굵게', '**강조할 내용**'], ['기울임', '*강조할 내용*'],
            ['링크', '[링크 이름](https://example.com)'],
            ['이미지', '![이미지 설명](https://example.com/image.png)'],
            ['표', '| 항목 | 설명 |\n| --- | --- |\n| 내용 | 내용 |'],
          ].map(([label, snippet]) => <button key={label} type="button" onClick={() => setContent((value) => value ? `${value}\n\n${snippet}` : snippet)}>{label}</button>)}
        </div>
      )}
      <button type="submit">저장</button>
      <button type="button" className="operations-secondary" onClick={cancel}>취소</button>
      {error && <p role="alert">{error}</p>}
    </form>
  )
}

export default function Operations({ course, cohort, sharedKey, resourceKey }) {
  const key = sharedKey ?? resourceKey ?? `work-manual.operations.v1.${cohort?.id}`
  const [items, setItems] = useState(() => loadItems(key, sharedKey || resourceKey ? [] : initialItems))
  const [folderId, setFolderId] = useState(null)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState(false)
  const [files, setFiles] = useState(null)
  const [fileMessage, setFileMessage] = useState('')
  const [fileBusy, setFileBusy] = useState(false)
  const manual = ['work-manual.administration.v1', 'work-manual.systems.v1'].includes(sharedKey)
  const canAttach = manual || Boolean(!sharedKey && !resourceKey && cohort)

  useEffect(() => {
    if (!canAttach) return
    let active = true
    readOperationFiles(key).then((saved) => {
      if (active) setFiles(saved)
    }).catch(() => {
      if (active) setFileMessage('브라우저에서 저장된 파일을 열 수 없어요.')
    })
    return () => { active = false }
  }, [key, canAttach])

  const term = query.trim().toLowerCase()
  const path = ancestors(folderId, items)
  const folderLabel = sharedKey ? '분류' : '폴더'
  const textLabel = sharedKey ? '문서' : '메모'
  const folders = new Set(items.filter((item) => item.kind === 'folder').map(({ id }) => id))
  const availableItems = [...items, ...(files ?? []).filter((file) => file.parentId === null || folders.has(file.parentId))]
  const visible = term
    ? availableItems.filter((item) => [item.name, item.content].some((value) => value?.toLowerCase().includes(term)))
    : availableItems.filter((item) => item.parentId === folderId)
  const siblingFolders = term ? [] : visible.filter((item) => item.kind === 'folder')

  function open(id) {
    setFolderId(id)
    setQuery('')
    setDraft(null)
  }

  function commit(next, closeDraft = true) {
    try {
      localStorage.setItem(key, JSON.stringify(next))
      setItems(next)
      if (folderId && !next.some((item) => item.id === folderId)) setFolderId(null)
      if (closeDraft) setDraft(null)
      setError(false)
      return true
    } catch {
      setError(true)
      return false
    }
  }

  function save(item) {
    commit(item.id
      ? items.map((entry) => entry.id === item.id ? item : entry)
      : [...items, { ...item, id: crypto.randomUUID() }])
  }

  function moveFolder(item, offset) {
    const position = siblingFolders.indexOf(item)
    const neighbor = siblingFolders[position + offset]
    if (position < 0 || !neighbor) return

    const next = [...items]
    next[items.indexOf(item)] = neighbor
    next[items.indexOf(neighbor)] = item
    commit(next, false)
  }

  async function upload(event) {
    const input = event.currentTarget
    const selected = Array.from(input.files)
    input.value = ''
    if (!selected.length) return
    setFileBusy(true)
    setFileMessage('')
    const additions = selected.map((file) => ({
      id: crypto.randomUUID(), scope: key, name: file.name, kind: 'file', parentId: folderId, blob: file,
    }))
    try {
      await storeOperationFiles(additions)
      setFiles((current) => [...current, ...additions])
      setFileMessage(`${additions.length}개 파일을 저장했어요.`)
    } catch {
      setFileMessage('파일을 저장할 수 없어요. 브라우저 저장 용량을 확인해 주세요.')
    } finally {
      setFileBusy(false)
    }
  }

  async function remove(item) {
    const message = item.kind === 'folder' ? `${folderLabel}와 안에 있는 자료를 삭제할까요?` : '자료를 삭제할까요?'
    if (!window.confirm(`${item.name} ${message}`)) return
    if (item.kind === 'folder' && canAttach && !files) return
    const next = items.filter((entry) => !ancestors(entry.id, items).includes(item))
    const deletedFolders = new Set(items.filter((entry) => !next.includes(entry)).map(({ id }) => id))
    const ids = item.kind === 'file' ? [item.id] : (files ?? []).filter((file) => deletedFolders.has(file.parentId)).map(({ id }) => id)
    if (item.kind !== 'file' && !commit(next)) return
    if (!ids.length) return
    setFileBusy(true)
    try {
      await removeOperationFiles(ids)
      setFiles((current) => current.filter((file) => !ids.includes(file.id)))
      setFileMessage('')
    } catch {
      setFileMessage('브라우저에서 파일을 삭제할 수 없어요.')
    } finally {
      setFileBusy(false)
    }
  }

  if (!sharedKey && !cohort) return <p className="management-card">상단에서 교육과정과 기수를 선택해 주세요.</p>

  return (
    <div className="management">
      <p className="student-context">{sharedKey ? '모든 교육과정 공통' : `${course.name} ${cohortLabel(cohort)}`}</p>
      <section className="management-card operations">
        <div className="operations-toolbar">
          <nav className="operations-path" aria-label={`현재 ${folderLabel}`}>
            <button
              type="button"
              className="operations-back"
              aria-label={`상위 ${folderLabel}로 돌아가기`}
              title={`상위 ${folderLabel}로 돌아가기`}
              disabled={folderId === null}
              onClick={() => open(path.at(-2)?.id ?? null)}
            ><ArrowLeft size={18} aria-hidden="true" /></button>
            <button type="button" onClick={() => open(null)} aria-current={folderId === null ? 'location' : undefined}>모든 {folderLabel}</button>
            {path.map((folder) => (
              <span key={folder.id}>
                <span aria-hidden="true"> / </span>
                <button type="button" onClick={() => open(folder.id)} aria-current={folderId === folder.id ? 'location' : undefined}>{folder.name}</button>
              </span>
            ))}
          </nav>
          <input type="search" aria-label="자료 검색" placeholder={`${folderLabel}·자료 검색`} value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="operations-actions">
          <button type="button" onClick={() => setDraft({ kind: 'folder', parentId: folderId })}>+ {folderLabel}</button>
          <button type="button" onClick={() => setDraft({ kind: 'link', parentId: folderId })}>+ 링크</button>
          <button type="button" onClick={() => setDraft({ kind: 'note', parentId: folderId })}>+ {textLabel}</button>
          {canAttach && <label className="operations-upload">+ 파일 업로드
            <input type="file" multiple disabled={fileBusy || !files} onChange={upload} aria-label="파일 업로드" />
          </label>}
        </div>
        {fileMessage && <p role="status">{fileMessage}</p>}
        {draft && <ItemForm key={draft.id ?? draft.kind} item={draft} textLabel={textLabel} manual={manual} save={save} cancel={() => setDraft(null)} />}
        {error && <p role="alert">브라우저에 변경 사항을 저장할 수 없습니다.</p>}
        {visible.length ? (
          <ul className="operations-list">
            {visible.map((item) => {
              const Icon = item.kind === 'folder' ? Folder : item.kind === 'link' ? Link2 : FileText
              const url = item.kind === 'link' ? safeLink(item.content) : ''
              const folderPosition = siblingFolders.indexOf(item)
              return (
                <li key={item.id} className="operations-item">
                  <Icon size={20} aria-hidden="true" />
                  <div className="operations-item-content">
                    {item.kind === 'folder'
                      ? <button type="button" className="operations-item-title" onClick={() => open(item.id)}>{item.name}</button>
                      : url
                        ? <a className="operations-item-title" href={url} target="_blank" rel="noopener noreferrer">{item.name} <ExternalLink size={13} aria-hidden="true" /></a>
                        : <strong>{item.name}</strong>}
                    {term && item.parentId && <p className="operations-location">{ancestors(item.parentId, items).map(({ name }) => name).join(' / ')}</p>}
                    {item.kind === 'note' && (item.formatted ? <ManualText content={item.content} /> : <p className="operations-note">{item.content}</p>)}
                  </div>
                  <div className="operations-actions">
                    {folderPosition >= 0 && <>
                      <button type="button" disabled={folderPosition === 0} onClick={() => moveFolder(item, -1)}
                        aria-label={`${item.name} 위로 이동`} title="위로 이동"><ArrowUp size={16} aria-hidden="true" /></button>
                      <button type="button" disabled={folderPosition === siblingFolders.length - 1} onClick={() => moveFolder(item, 1)}
                        aria-label={`${item.name} 아래로 이동`} title="아래로 이동"><ArrowDown size={16} aria-hidden="true" /></button>
                    </>}
                    {item.kind === 'file'
                      ? <button type="button" onClick={() => downloadOperationFile(item)} aria-label={`${item.name} 다운로드`}>다운로드</button>
                      : <button type="button" onClick={() => setDraft(item)} aria-label={`${item.name} 수정`}>수정</button>}
                    <button type="button" disabled={fileBusy || (item.kind === 'folder' && canAttach && !files)} onClick={() => remove(item)} aria-label={`${item.name} 삭제`}>삭제</button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : <p className="task-empty">{term ? '검색 결과가 없어요.' : '등록된 자료가 없어요.'}</p>}
      </section>
    </div>
  )
}

import { useState } from 'react'
import { Download, RotateCcw, Upload } from 'lucide-react'
import { createBackup, parseBackup, replaceSavedData } from './backup'
import { clearOperationFiles } from './operationFiles'

export default function BackupSettings() {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  function download() {
    try {
      const backup = createBackup(localStorage)
      const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul', dateStyle: 'short' }).format()
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `업무매뉴얼-백업-${date}.json`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      setMessage('백업 파일 다운로드를 시작했어요.')
    } catch {
      setMessage('백업 파일을 만들 수 없어요.')
    }
  }

  async function replace(data, reset = false) {
    try {
      replaceSavedData(localStorage, data)
    } catch (error) {
      setMessage(error.message === 'rollback-failed'
        ? '브라우저 저장 오류로 기존 데이터를 완전히 되돌리지 못했어요.'
        : '데이터를 변경할 수 없어요. 기존 데이터는 유지됐어요.')
      return
    }
    if (reset) {
      setBusy(true)
      try {
        await clearOperationFiles()
      } catch {
        setMessage('설정과 기록은 초기화했지만, 브라우저 오류로 업로드한 파일을 지우지 못했어요.')
        setBusy(false)
        return
      }
    }
    window.location.reload()
  }

  async function restore(event) {
    const input = event.currentTarget
    const file = input.files[0]
    input.value = ''
    if (!file) return
    setBusy(true)
    setMessage('')
    try {
      const data = parseBackup(await file.text())
      if (window.confirm('현재 저장된 데이터를 선택한 백업 파일의 내용으로 교체할까요?')) replace(data)
    } catch {
      setMessage('올바른 업무 매뉴얼 JSON 백업 파일을 선택해 주세요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="management-card backup-settings">
      <h2>데이터 백업·복원</h2>
      <p>저장한 설정, 할 일, 일정, 링크와 메모를 JSON 파일로 백업해요. 업로드한 파일은 JSON에 포함되지 않으며, 각 메뉴에서 내려받을 수 있어요.</p>
      <div className="backup-actions">
        <button type="button" onClick={download} disabled={busy}><Download size={16} aria-hidden="true" /> 백업 다운로드</button>
        <label>
          <Upload size={16} aria-hidden="true" /> 백업 파일 불러오기
          <input type="file" aria-label="백업 파일 불러오기" accept=".json,application/json" onChange={restore} disabled={busy} />
        </label>
        <button type="button" className="backup-reset" disabled={busy} onClick={() => {
          if (window.confirm('이 브라우저에 저장된 업무 매뉴얼 데이터와 업로드한 파일을 모두 지울까요?')) replace({}, true)
        }}><RotateCcw size={16} aria-hidden="true" /> 전체 초기화</button>
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  )
}

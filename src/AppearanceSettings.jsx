import { useState } from 'react'
import { defaultAppearance, imageTypes, maxImageBytes } from './appearance'

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AppearanceSettings({ appearance, save }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  function update(fields) {
    const success = save({ ...appearance, ...fields })
    setMessage(success ? '' : '배경 설정을 저장할 수 없어요. 브라우저 저장 용량을 확인해 주세요.')
  }

  async function chooseImage(event) {
    const input = event.currentTarget
    const file = input.files[0]
    input.value = ''
    if (!file) return
    if (!imageTypes.includes(file.type) || file.size > maxImageBytes) {
      setMessage('1.5MB 이하의 PNG, JPG, WebP 또는 GIF 이미지를 선택해 주세요.')
      return
    }
    setBusy(true)
    try {
      update({ image: await readImage(file) })
    } catch {
      setMessage('이미지 파일을 읽을 수 없어요.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="management-card appearance-settings">
      <h2>배경 설정</h2>
      <div className="appearance-actions">
        <label>배경색<input type="color" value={appearance.color} disabled={busy} onChange={(event) => update({ color: event.target.value })} /></label>
        <label>배경 이미지<input type="file" accept={imageTypes.join(',')} disabled={busy} onChange={chooseImage} /></label>
        {appearance.image && <button type="button" disabled={busy} onClick={() => update({ image: '' })}>이미지 제거</button>}
        <button type="button" disabled={busy} onClick={() => update(defaultAppearance)}>기본 배경으로</button>
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  )
}

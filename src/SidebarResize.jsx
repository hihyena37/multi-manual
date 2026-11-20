import { useRef } from 'react'
import { GripVertical } from 'lucide-react'

export default function SidebarResize({ width, limits, resize, save }) {
  const drag = useRef(null)

  function constrain(value) {
    return Math.min(limits.max, Math.max(limits.min, Math.round(value)))
  }

  return (
    <div
      className="sidebar-resize"
      role="separator"
      tabIndex={0}
      aria-label="왼쪽 메뉴 너비"
      aria-orientation="vertical"
      aria-controls="sidebar"
      aria-valuemin={limits.min}
      aria-valuemax={limits.max}
      aria-valuenow={width}
      title="좌우로 끌어 메뉴 너비 조절"
      onPointerDown={(event) => {
        if (event.button !== 0 || drag.current) return
        drag.current = { x: event.clientX, width, pointerId: event.pointerId }
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={(event) => {
        const start = drag.current
        if (start?.pointerId === event.pointerId) resize(constrain(start.width + event.clientX - start.x))
      }}
      onPointerUp={(event) => {
        const start = drag.current
        if (start?.pointerId !== event.pointerId) return
        drag.current = null
        save(constrain(start.width + event.clientX - start.x))
      }}
      onLostPointerCapture={() => {
        if (drag.current) resize(drag.current.width)
        drag.current = null
      }}
      onKeyDown={(event) => {
        const next = { ArrowLeft: width - 12, ArrowRight: width + 12, Home: limits.min, End: limits.max }[event.key]
        if (typeof next !== 'number') return
        event.preventDefault()
        save(constrain(next))
      }}
    ><GripVertical size={14} aria-hidden="true" /></div>
  )
}

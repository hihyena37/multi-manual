import { useState } from 'react'
import { GripVertical } from 'lucide-react'
import { moveChecklistItem, orderedIds } from './checklistOrder'

export default function SortableChecklist({ items, preferred, save, render, groupOrder, className = '' }) {
  const [drag, setDrag] = useState(null)
  const byId = new Map(items.map((item) => [item.templateKey ?? item.id, item]))
  const ids = orderedIds([...byId.keys()], preferred)
  if (groupOrder) ids.sort((a, b) => groupOrder(byId.get(a)) - groupOrder(byId.get(b)))

  function canMove(source, target) {
    return byId.has(source) && byId.has(target)
      && (!groupOrder || groupOrder(byId.get(source)) === groupOrder(byId.get(target)))
  }

  function move(source, target) {
    if (!canMove(source, target)) return
    const next = moveChecklistItem(ids, source, target)
    if (next !== ids) save(next)
  }

  return (
    <ul className={`task-list ${className}`}>
      {ids.map((id, index) => {
        const item = byId.get(id)
        const target = drag?.target === id && drag.source !== id
        const rowProps = {
          'data-drop-target': target ? (ids.indexOf(drag.source) < index ? 'after' : 'before') : undefined,
          onDragOver(event) {
            if (!drag) return
            if (!canMove(drag.source, id)) {
              if (drag.target !== null) setDrag({ ...drag, target: null })
              return
            }
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            if (drag.target !== id) setDrag({ ...drag, target: id })
          },
          onDrop(event) {
            if (!drag) return
            event.preventDefault()
            move(drag.source, id)
            setDrag(null)
          },
        }
        const movable = canMove(id, ids[index - 1]) || canMove(id, ids[index + 1])
        const handle = (groupOrder || movable) && (
          <button
            type="button"
            draggable={movable}
            disabled={!movable}
            className="task-drag"
            title={movable ? '끌어서 순서 변경 · 키보드는 위/아래 화살표' : '같은 요일에 순서를 바꿀 항목이 없습니다'}
            aria-label={`${item.title.split('\n')[0]} 순서 변경`}
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', id)
              setDrag({ source: id, target: id })
            }}
            onDragEnd={() => setDrag(null)}
            onKeyDown={(event) => {
              const offset = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
              if (!offset) return
              event.preventDefault()
              move(id, ids[index + offset])
            }}
          ><GripVertical size={17} aria-hidden="true" /></button>
        )
        return render(item, rowProps, handle)
      })}
    </ul>
  )
}

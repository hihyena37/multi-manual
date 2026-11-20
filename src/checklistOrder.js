export const checklistOrderKey = 'work-manual.checklist-order.v1'

export function loadChecklistOrder() {
  try {
    const saved = JSON.parse(localStorage.getItem(checklistOrderKey))
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved
  } catch {
    // Keep the default order when browser storage cannot be read.
  }
  return {}
}

export function orderedIds(ids, preferred = []) {
  const available = new Set(ids)
  const order = preferred.filter((id) => available.delete(id))
  return [...order, ...available]
}

export function moveChecklistItem(ids, source, target) {
  const from = ids.indexOf(source)
  const to = ids.indexOf(target)
  if (from < 0 || to < 0 || from === to) return ids
  const next = [...ids]
  next.splice(from, 1)
  next.splice(to, 0, source)
  return next
}

export function mergeChecklistOrder(previous, next) {
  const visible = new Set(next)
  let index = 0
  return [...previous.map((id) => visible.has(id) ? next[index++] : id), ...next.slice(index)]
}

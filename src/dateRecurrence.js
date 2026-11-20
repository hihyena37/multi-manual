const dayMs = 86_400_000

export function shiftDate(date, days) {
  return new Date(Date.parse(date) + days * dayMs).toISOString().slice(0, 10)
}

export function occursOn(start, date, repeat) {
  if (date < start) return false
  if (date === start || repeat === 'daily') return true
  if (repeat === 'weekly') return (Date.parse(date) - Date.parse(start)) % (7 * dayMs) === 0
  return repeat === 'monthly' && start.slice(-2) === date.slice(-2)
}

export const repeatOptions = [
  ['', '반복 없음'], ['daily', '매일'], ['weekly', '매주'], ['monthly', '매월'],
]

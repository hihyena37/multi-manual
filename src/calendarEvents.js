import { busanCohortId, gumiCohortId } from './courses.js'
import { occursOn } from './dateRecurrence.js'

export const calendarStorageKey = 'work-manual.calendar.v2'

const periods = [
  ['2026-10-30', '2026-11-29', 21, 'blue'],
  ['2026-11-30', '2026-12-29', 20, 'violet'],
  ['2026-12-30', '2027-01-29', 21, 'green'],
  ['2027-01-30', '2027-02-28', 17, 'orange'],
  ['2027-03-01', '2027-03-15', 10, 'rose'],
]

function initialPeriods(cohortId) {
  return periods.map(([start, end, days, color], index) => ({
    id: `${cohortId}-period-${index + 1}`, cohortId,
    title: `${index + 1}단위기간`, start, end, days, color,
  }))
}

function readEvents(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key))
    if (Array.isArray(saved)) return saved
  } catch {
    // Use initial periods when storage cannot be read.
  }
  return null
}

export function loadEvents() {
  return readEvents(calendarStorageKey) ?? [
    ...(readEvents('work-manual.calendar.v1') ?? initialPeriods(gumiCohortId)),
    ...initialPeriods(busanCohortId),
  ]
}

export function eventsOnDate(events, date, cohortId) {
  return events.filter((event) => (
    (cohortId === '*' || !event.cohortId || event.cohortId === cohortId)
    && ((event.start <= date && date <= event.end) || (event.repeat && occursOn(event.start, date, event.repeat)))
  ))
}

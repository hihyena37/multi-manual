import { busanCategoryOn, busanCourseCategories } from './busanCourseSheet.js'
import { busanCohortId, gumiCohortId } from './courses.js'

// Date-header fills from the Gumi HVAC calendar. The dark blue cells contain
// technical lessons, but the sheet legend does not specify a venue for that fill.
const groups = [
  { key: 'basic', label: '직무기초 · 주강의장', dates: '11-02 11-03 11-04 11-05 11-06 11-09 11-10 11-11 11-12 11-13' },
  { key: 'annex', label: '직무특화 · 부강의장', dates: '11-16 11-17 11-18 11-20 11-23 11-24 11-25 11-26 11-27 11-30 12-01 12-02 12-04 12-07 12-08 12-09 12-10 12-11 12-14 12-15 12-16 12-17 12-18 12-21 12-22 12-28 12-29 12-31 01-14 01-21' },
  { key: 'school', label: '직무특화 · 직업훈련학교', dates: '01-25 01-26 01-27 01-28 01-29 02-01 02-02 02-03 02-04' },
  { key: 'technical', label: '직무특화', dates: '11-19 12-03 12-23 12-30 01-04 01-05 01-06 01-07 01-08 01-11 01-12 01-13 01-15 01-18 01-19 01-20 02-10 02-11 02-12 02-15 02-16 02-17 02-18 02-19 02-22 02-23 02-24 02-25 02-26 03-02 03-03 03-04 03-05 03-08 03-09 03-10 03-11 03-12' },
]

const gumiCategories = groups.map(({ key, label }) => ({ key, label }))
export const courseSheetCategories = [...gumiCategories, ...busanCourseCategories]

export function categoriesForCohort(cohortId) {
  if (cohortId === '*') return courseSheetCategories
  return cohortId === busanCohortId ? busanCourseCategories : gumiCategories
}

const byDate = new Map(groups.flatMap(({ key, label, dates }) => dates.split(' ').map((date) => [
  `${date >= '10' ? '2026' : '2027'}-${date}`, { key, label },
])))

export function courseSheetCategoryOn(date) {
  return byDate.get(date)
}


export const categoryEditsKey = 'work-manual.calendar-categories.v1'

export function loadCategoryEdits() {
  try {
    const saved = JSON.parse(localStorage.getItem(categoryEditsKey))
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved
  } catch {
    // Fall back to the source categories when saved edits are unavailable.
  }
  return {}
}

export function categorySettingsOn(edits, cohortId, date) {
  return edits[`${cohortId}:${date}`] ?? {
    mode: 'day',
    day: cohortId === busanCohortId ? busanCategoryOn(date)
      : cohortId === gumiCohortId ? courseSheetCategoryOn(date)?.key ?? '' : '',
  }
}

export function categorySlots(settings) {
  const slots = settings.mode === 'split' ? [['오전', settings.am], ['오후', settings.pm]] : [['', settings.day]]
  return slots.flatMap(([time, key]) => {
    const category = courseSheetCategories.find((item) => item.key === key)
    return category ? [{ ...category, time }] : []
  })
}

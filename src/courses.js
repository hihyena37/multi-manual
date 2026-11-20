export const storageKey = 'work-manual.courses.v1'

export const statuses = ['미운영', '진행 예정', '진행 중', '종료']
export const gumiCohortId = 'hvac-2'
export const busanCohortId = 'hvac-2-busan'

const busanCohort = { id: busanCohortId, name: '2기', region: '부산', status: '미운영' }

export function cohortLabel(cohort) {
  return cohort.region ? `${cohort.name} · ${cohort.region}` : cohort.name
}

function addRegionalCohorts(state) {
  return {
    ...state,
    regionalCohortsVersion: 1,
    courses: state.courses.map((course) => {
      if (course.id !== 'hvac') return course
      return {
        ...course,
        cohorts: course.cohorts.flatMap((cohort) => cohort.id === gumiCohortId
          ? [{ ...cohort, region: '구미(대구)' }, busanCohort]
          : [cohort]),
      }
    }),
  }
}

const catalog = [
  ['electronics', '전자/IT제조기술자', 700],
  ['hvac', '공조냉동기술자', 700],
  ['shipbuilding', '선박제조기술자', 400],
  ['equipment', '중장비운전기능사', 400],
  ['marketing', '온라인광고/홍보실무자', 400],
  ['bakery', '제과제빵기술자', 400],
]

export const initialCourseState = addRegionalCohorts({
  courseId: 'hvac',
  cohortId: gumiCohortId,
  courses: catalog.map(([id, name, hours]) => ({
    id,
    name,
    hours,
    cohorts: [1, 2, 3, 4].map((number) => ({
      id: `${id}-${number}`,
      name: `${number}기`,
      status: id === 'hvac' && number === 2 ? '진행 중' : '미운영',
    })),
  })),
})

export function getSelection({ courses, courseId, cohortId }) {
  const course = courses.find(({ id }) => id === courseId) ?? courses[0]
  const cohort = course?.cohorts.find(({ id }) => id === cohortId) ?? course?.cohorts[0]
  return { course, cohort }
}

export function selectCourse(state, courseId) {
  const { course, cohort } = getSelection(state)
  if (course?.id === courseId) return state
  const lastCohortByCourse = { ...state.lastCohortByCourse }
  if (course && cohort) lastCohortByCourse[course.id] = cohort.id
  return { ...state, courseId, cohortId: lastCohortByCourse[courseId] ?? '', lastCohortByCourse }
}

export function selectCohortName(state, name) {
  const { course, cohort } = getSelection(state)
  if (cohort?.name === name) return state
  const candidates = course?.cohorts.filter((item) => item.name === name) ?? []
  const next = candidates.find((item) => item.region === cohort?.region) ?? candidates[0]
  return next ? { ...state, cohortId: next.id } : state
}

export function loadCourses() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey))
    if (Array.isArray(saved?.courses) && saved.courses.every(
      (course) => typeof course?.name === 'string' && Array.isArray(course.cohorts),
    )) {
      const state = saved.regionalCohortsVersion ? saved : addRegionalCohorts(saved)
      const preferred = state.courses.find((course) => course.id === state.defaultCourseId)
      const preferredCohort = preferred?.cohorts.find((cohort) => cohort.id === state.defaultCohortId)
      return preferredCohort ? { ...state, courseId: preferred.id, cohortId: preferredCohort.id } : state
    }
  } catch {
    // Storage may be unavailable or contain invalid JSON.
  }
  return initialCourseState
}

import { shiftDate } from './dateRecurrence.js'

export const busanCourseCategories = [
  { key: 'busan-basic', label: '직무 기초' },
  { key: 'busan-theory', label: '직무 특화 · 이론' },
  { key: 'busan-practice', label: '직무 특화 · 실기' },
  { key: 'busan-career', label: '커리어' },
]

const [basic, theory, practice, career] = busanCourseCategories.map(({ key }) => key)
const sessions = [
  [basic, '비즈니스 · 402호\n이도경 강사님', [['2026-11-02', '2026-11-06']]],
  [basic, 'OA · 402호\n서정아 강사님', [['2026-11-09', '2026-11-13']]],
  [theory, '402호\n손금두 강사님', [
    ['2026-11-16', '2026-12-23'], ['2026-12-28', '2026-12-29'],
  ]],
  [practice, '제 5실습실\n박지원 강사님', [
    ['2026-12-30', '2026-12-31'], ['2027-01-04', '2027-01-21'],
    ['2027-02-10', '2027-02-26'], ['2027-03-02', '2027-03-12'],
  ]],
  [career, '제 5실습실', [['2027-01-25', '2027-02-04']]],
]

const busanLessons = new Map()
for (const [category, lesson, ranges] of sessions) {
  for (const [start, end] of ranges) {
    for (let date = start; date <= end; date = shiftDate(date, 1)) {
      const day = new Date(date).getUTCDay()
      if (day >= 1 && day <= 5) busanLessons.set(date, { category, lesson })
    }
  }
}

export const busanCourseNotes = {
  '2026-12-24': '휴강',
  '2026-12-25': '성탄절',
  '2026-12-31': '단축수업',
  '2027-01-01': '신정',
  '2027-01-22': '휴강',
  '2027-02-05': '휴강',
  '2027-02-06': '설날 연휴',
  '2027-02-07': '설날',
  '2027-02-08': '설날 연휴',
  '2027-02-09': '대체 공휴일',
  '2027-03-01': '3.1절',
}

const additions = {
  '2026-10-30': '개강식\n부산 삼성전기 사업장',
  '2026-11-06': '평가',
  '2026-11-13': '평가',
  '2027-01-22': '필기시험',
  '2027-03-15': '커리어 402호\n박지원 강사님\n종강 / 수료식',
}

export function busanCategoryOn(date) {
  return busanLessons.get(date)?.category ?? ''
}

export function busanLessonOn(date) {
  return [busanLessons.get(date)?.lesson, busanCourseNotes[date], additions[date]].filter(Boolean).join('\n')
}

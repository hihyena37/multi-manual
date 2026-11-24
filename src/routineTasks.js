export const dailyTasks = [
  { id: 'qr', title: '참여청년 입·퇴실 QR 체크' },
  { id: 'attendance', title: '출석부 입·퇴실 시간 입력 + 출결합 정리' },
  { id: 'calls', title: '오전 9시 이후 입실하지 않은 참여청년 체크' },
]

export const weekdays = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']

export function weekdayOrder({ badge }) {
  const index = weekdays.indexOf(badge)
  return index === -1 ? weekdays.length : index
}

export const weeklyTasks = [
  { id: 'pre-survey', title: '사전설문', badge: '월요일', hint: '시간표에서 실시 여부 확인' },
  { id: 'satisfaction', title: '만족도설문', badge: '금요일', hint: '매주 실시' },
  { id: 'post-survey', title: '사후설문', badge: '금요일', hint: '시간표에서 실시 여부 확인' },
  { id: 'exam', title: '시험', badge: '금요일', hint: '시간표에서 실시 여부 확인' },
  { id: 'lunch-payment', title: '중식결제', badge: '금요일' },
]

export const attendanceDocuments = [
  { id: 'mgmt', title: 'MGMT 출석부(엑셀)' },
  { id: 'sheet', title: '시트 출석부' },
  { id: 'request', title: '출석입력요청대장(PDF)' },
  { id: 'leave', title: '공가 발생 참여청년 폴더(공사서류 PDF 포함)' },
]

export const periodTasks = [
  { id: 'leader-election', title: '단위기간 반장 선거' },
  { id: 'leader-payment', title: '전 단위기간 반장지원금 정산' },
  { id: 'lunch', title: '중식대 취합' },
]

export function weekRange(date) {
  const monday = new Date(`${date}T00:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
  const friday = new Date(monday)
  friday.setUTCDate(friday.getUTCDate() + 4)
  return [monday, friday].map((day) => day.toISOString().slice(0, 10))
}

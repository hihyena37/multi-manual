import { cohortLabel, statuses } from './courses'

function CourseForm({ course, onSave, onDelete }) {
  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('name').trim()
    if (!name) return
    onSave({ name, hours: Number(form.get('hours')) })
    if (!course) event.currentTarget.reset()
  }

  return (
    <form className="management-form" onSubmit={submit}>
      <label>과정명<input name="name" defaultValue={course?.name} required /></label>
      <label>교육시간<input type="number" name="hours" min="1" max={Number.MAX_SAFE_INTEGER} required defaultValue={course?.hours} /></label>
      <button type="submit">{course ? '과정 저장' : '과정 추가'}</button>
      {course && <button type="button" className="delete-button" onClick={onDelete}>과정 삭제</button>}
    </form>
  )
}

function CohortForm({ cohort, cohorts, onSave, onDelete }) {
  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = form.get('name').trim()
    const region = form.get('region').trim()
    if (!name) return
    if (cohorts.some((item) => item.id !== cohort?.id && item.name === name && (item.region ?? '') === region)) {
      const input = event.currentTarget.elements.namedItem('region')
      input.setCustomValidity('같은 기수와 지역이 이미 등록되어 있어요.')
      input.reportValidity()
      return
    }
    onSave({ name, region, status: form.get('status') })
    if (!cohort) event.currentTarget.reset()
  }

  return (
    <form className="management-form" onSubmit={submit} onInput={(event) => event.currentTarget.elements.namedItem('region').setCustomValidity('')}>
      <label>기수명<input name="name" defaultValue={cohort?.name} placeholder="예: 5기" required /></label>
      <label>지역<input name="region" defaultValue={cohort?.region} placeholder="예: 구미(대구)" /></label>
      <label>운영 상태
        <select name="status" defaultValue={cohort?.status ?? statuses[0]}>
          {statuses.map((status) => <option key={status}>{status}</option>)}
        </select>
      </label>
      <button type="submit">{cohort ? '기수 저장' : '기수 추가'}</button>
      {cohort && <button type="button" className="delete-button" onClick={onDelete}>기수 삭제</button>}
    </form>
  )
}

export default function CourseSettings({ course, cohort, update }) {
  function updateCourse(change) {
    update((state) => ({
      ...state,
      courseId: course.id,
      cohortId: cohort?.id ?? '',
      courses: state.courses.map((item) => item.id === course.id ? change(item) : item),
    }))
  }

  function addCourse(fields) {
    const id = crypto.randomUUID()
    update((state) => ({
      ...state,
      courseId: id,
      cohortId: '',
      courses: [...state.courses, { id, ...fields, cohorts: [] }],
    }))
  }

  function removeCourse() {
    if (!window.confirm(`${course.name} 과정과 소속 기수를 삭제할까요?`)) return
    update((state) => ({
      ...state,
      courseId: '',
      cohortId: '',
      courses: state.courses.filter(({ id }) => id !== course.id),
    }))
  }

  function addCohort(fields) {
    const id = crypto.randomUUID()
    update((state) => ({
      ...state,
      courseId: course.id,
      cohortId: id,
      courses: state.courses.map((item) => (
        item.id === course.id ? { ...item, cohorts: [...item.cohorts, { id, ...fields }] } : item
      )),
    }))
  }

  function saveCohort(fields) {
    updateCourse((item) => ({
      ...item,
      cohorts: item.cohorts.map((entry) => entry.id === cohort.id ? { ...entry, ...fields } : entry),
    }))
  }

  function removeCohort() {
    if (!window.confirm(`${course.name} ${cohortLabel(cohort)} 항목을 삭제할까요?`)) return
    updateCourse((item) => ({
      ...item,
      cohorts: item.cohorts.filter(({ id }) => id !== cohort.id),
    }))
  }

  return (
    <div className="management">
      <section className="management-card">
        <h2>교육과정 관리</h2>
        {course && (
          <CourseForm
            key={course.id}
            course={course}
            onSave={(fields) => updateCourse((item) => ({ ...item, ...fields }))}
            onDelete={removeCourse}
          />
        )}
        <CourseForm onSave={addCourse} />
      </section>
      {course && (
        <section className="management-card">
          <h2>{course.name} 기수 관리</h2>
          {cohort && <CohortForm key={cohort.id} cohort={cohort} cohorts={course.cohorts} onSave={saveCohort} onDelete={removeCohort} />}
          <CohortForm key={course.id} cohorts={course.cohorts} onSave={addCohort} />
        </section>
      )}
    </div>
  )
}

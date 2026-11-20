import { useEffect, useState } from 'react'
import {
  BookOpen, BriefcaseBusiness, CalendarDays, ClipboardList, FolderOpen,
  GraduationCap, House, NotebookPen, PanelLeftClose, PanelLeftOpen,
  Settings, UsersRound,
} from 'lucide-react'
import './App.css'
import CourseSettings from './CourseSettings'
import BackupSettings from './BackupSettings'
import AppearanceSettings from './AppearanceSettings'
import SidebarResize from './SidebarResize'
import { appearanceKey, backgroundTextColor, loadAppearance, validAppearance } from './appearance'
import StudentLinks from './StudentLinks'
import Operations from './Operations'
import WorkNotes from './WorkNotes'
import Home from './Home'
import Calendar from './Calendar'
import { WeatherSettings } from './Weather'
import { getSelection, loadCourses, selectCohortName, selectCourse, storageKey } from './courses'

const pages = [
  { id: 'home', label: '홈', icon: House },
  { id: 'students', label: '교육생 관리', icon: UsersRound },
  { id: 'operations', label: '교육과정 운영', icon: ClipboardList },
  { id: 'administration', label: '본사 행정 업무', icon: BriefcaseBusiness },
  { id: 'systems', label: '시스템 사용법', icon: BookOpen },
  { id: 'calendar', label: '캘린더', icon: CalendarDays },
  { id: 'resources', label: '자료실', icon: FolderOpen },
  { id: 'notes', label: '업무 메모', icon: NotebookPen },
  { id: 'settings', label: '설정', icon: Settings },
]

const sidebarWidthKey = 'work-manual.sidebar-width.v1'
const sidebarLimits = { min: 180, max: 360 }

function loadSidebarWidth() {
  try {
    const saved = Number(localStorage.getItem(sidebarWidthKey))
    if (saved >= sidebarLimits.min && saved <= sidebarLimits.max) return saved
  } catch {
    // Use the default width when storage is unavailable.
  }
  return 236
}

function Resources({ course, cohort }) {
  const [scoped, setScoped] = useState(false)
  return (
    <div className="management">
      <label className="resources-scope">자료 범위 <select value={scoped ? 'cohort' : 'common'} onChange={(event) => setScoped(event.target.value === 'cohort')}>
        <option value="common">공통 자료</option>
        <option value="cohort">선택한 과정·기수 자료</option>
      </select></label>
      {scoped
        ? <Operations key={cohort?.id ?? 'no-cohort'} course={course} cohort={cohort} resourceKey={`work-manual.resources.v1.${cohort?.id}`} />
        : <Operations key="common" sharedKey="work-manual.resources.v1" />}
    </div>
  )
}

function getPage() {
  return pages.find(({ id }) => window.location.hash.split('?')[0] === `#/${id}`) ?? pages[0]
}

export default function App() {
  const [page, setPage] = useState(getPage)
  const [collapsed, setCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(loadSidebarWidth)
  const [courseState, setCourseState] = useState(loadCourses)
  const [appearance, setAppearance] = useState(loadAppearance)
  const [storageError, setStorageError] = useState(false)
  const { course, cohort } = getSelection(courseState)
  const cohortNames = [...new Set(course?.cohorts.map(({ name }) => name))]
  const regionalCohorts = course?.cohorts.filter(({ name }) => name === cohort?.name) ?? []
  const SidebarIcon = collapsed ? PanelLeftOpen : PanelLeftClose

  useEffect(() => {
    function onHashChange() {
      setPage(getPage())
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    document.title = `${page.label} | 교육운영 업무 매뉴얼`
  }, [page])

  function updateCourses(change) {
    const next = change(courseState)
    if (next === courseState) return
    const selection = getSelection(next)
    next.courseId = selection.course?.id ?? ''
    next.cohortId = selection.cohort?.id ?? ''
    setCourseState(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  function saveAppearance(next) {
    if (!validAppearance(next)) return false
    try {
      localStorage.setItem(appearanceKey, JSON.stringify(next))
      setAppearance(next)
      return true
    } catch {
      return false
    }
  }

  function saveSidebarWidth(value) {
    setSidebarWidth(value)
    try {
      localStorage.setItem(sidebarWidthKey, String(value))
    } catch {
      // The chosen width still applies for the current visit.
    }
  }

  return (
    <div className={collapsed ? 'workspace workspace--collapsed' : 'workspace'} style={{ '--sidebar-width': `${sidebarWidth}px` }}>
      <div className="sidebar-shell">
      <aside className="sidebar" id="sidebar" aria-label="사이드바">
        <a href="#/home" className="brand" aria-label="교육운영 업무 매뉴얼 홈">
          <span className="brand-icon"><GraduationCap size={22} aria-hidden="true" /></span>
          <span className="sidebar-label">교육운영 업무 매뉴얼</span>
        </a>
        <nav className="navigation" aria-label="주 메뉴">
          {pages.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              className="navigation-link"
              href={`#/${id}`}
              aria-current={page.id === id ? 'page' : undefined}
              aria-label={label}
              title={label}
            >
              <Icon size={19} aria-hidden="true" />
              <span className="sidebar-label">{label}</span>
            </a>
          ))}
        </nav>
      </aside>
      {!collapsed && <SidebarResize width={sidebarWidth} limits={sidebarLimits} resize={setSidebarWidth} save={saveSidebarWidth} />}
      </div>
      <div className="workspace-body" data-image-background={Boolean(appearance.image) || undefined} style={{
        '--workspace-color': appearance.color,
        '--workspace-ink': backgroundTextColor(appearance.color),
        '--workspace-image': appearance.image ? `linear-gradient(#ffffff70, #ffffff70), url("${appearance.image}")` : 'none',
      }}>
        <header className="topbar">
          <button
            className="sidebar-toggle"
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-controls="sidebar"
            aria-expanded={!collapsed}
            aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
            title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            <SidebarIcon size={20} aria-hidden="true" />
          </button>
          <h1 className="current-page">{page.label}</h1>
          <div className="course-picker">
            <label className="course-picker-field">과정
            <select
              aria-label="교육과정"
              value={course?.id ?? ''}
              disabled={!course}
              onChange={(event) => updateCourses((state) => selectCourse(state, event.target.value))}
            >
              {!course && <option value="">등록된 과정 없음</option>}
              {courseState.courses.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
            </label>
            <label className="course-picker-field">기수
            <select
              aria-label="기수"
              value={cohort?.name ?? ''}
              disabled={!cohort}
              onChange={(event) => updateCourses((state) => selectCohortName(state, event.target.value))}
            >
              {!cohort && <option value="">등록된 기수 없음</option>}
              {cohortNames.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            </label>
            <label className="course-picker-field">지역
            <select
              aria-label="지역"
              value={cohort?.id ?? ''}
              disabled={regionalCohorts.length < 2}
              onChange={(event) => {
                const id = event.target.value
                if (id !== cohort?.id) updateCourses((state) => ({ ...state, cohortId: id }))
              }}
            >
              {!cohort && <option value="">지역 미지정</option>}
              {regionalCohorts.map((item) => <option key={item.id} value={item.id}>{item.region || '지역 미지정'}</option>)}
            </select>
            </label>
            {course && <span className="course-meta">{course.hours}시간{cohort && ` · ${cohort.status}`}</span>}
          </div>
        </header>
        <main className="page">
          {storageError && <p role="alert">브라우저에 변경 사항을 저장할 수 없습니다. 새로고침하면 변경 사항이 사라질 수 있습니다.</p>}
          {page.id === 'home' ? (
            <Home course={course} cohort={cohort} />
          ) : page.id === 'students' ? (
            <StudentLinks key={cohort?.id} course={course} cohort={cohort} />
          ) : page.id === 'operations' ? (
            <Operations key={cohort?.id} course={course} cohort={cohort} />
          ) : page.id === 'administration' ? (
            <Operations key="administration" sharedKey="work-manual.administration.v1" />
          ) : page.id === 'systems' ? (
            <Operations key="systems" sharedKey="work-manual.systems.v1" />
          ) : page.id === 'notes' ? (
            <WorkNotes key={cohort?.id} cohort={cohort} />
          ) : page.id === 'resources' ? (
            <Resources course={course} cohort={cohort} />
          ) : page.id === 'calendar' ? (
            <Calendar key={cohort?.id} course={course} cohort={cohort} courses={courseState.courses} />
          ) : (
            <div className="management">
              <WeatherSettings />
              <AppearanceSettings appearance={appearance} save={saveAppearance} />
              <CourseSettings course={course} cohort={cohort} update={updateCourses} />
              {cohort && <section className="management-card">
                <h2>기본 시작 과정</h2>
                <p>{courseState.defaultCohortId === cohort.id ? '현재 선택이 기본 시작 과정이에요.' : '상단에서 과정과 기수를 선택해 기본 시작 과정으로 저장할 수 있어요.'}</p>
                <div className="operations-actions">
                  <button type="button" onClick={() => updateCourses((state) => ({ ...state, defaultCourseId: course.id, defaultCohortId: cohort.id }))}>현재 선택을 기본으로 설정</button>
                  {courseState.defaultCohortId && <button type="button" onClick={() => updateCourses((state) => ({ ...state, defaultCourseId: '', defaultCohortId: '' }))}>기본 설정 해제</button>}
                </div>
              </section>}
              <BackupSettings />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

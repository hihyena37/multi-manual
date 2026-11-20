import { appearanceKey, validAppearance } from './appearance.js'

const format = 'work-manual-backup'
const version = 1

const isText = (value) => typeof value === 'string'
const isDate = (value) => isText(value) && /^\d{4}-\d{2}-\d{2}$/.test(value)
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const listOf = (check) => (value) => Array.isArray(value) && value.every((item) => isRecord(item) && check(item))
const optionalText = (value) => value == null || isText(value)

const checkCohorts = listOf((item) => isText(item.id) && isText(item.name) && isText(item.status) && optionalText(item.region))
const checkCourses = listOf((item) => isText(item.id) && isText(item.name) && Number.isFinite(item.hours) && checkCohorts(item.cohorts))
const checkEvents = listOf((item) => isText(item.id) && isText(item.title) && isDate(item.start) && isDate(item.end) && optionalText(item.cohortId))

function validator(key) {
  switch (key) {
    case 'work-manual.sidebar-width.v1':
      return (value) => Number.isInteger(value) && value >= 180 && value <= 360
    case appearanceKey:
      return validAppearance
    case 'work-manual.weather-region':
      return isText
    case 'work-manual.courses.v1':
      return (item) => isRecord(item) && isText(item.courseId) && isText(item.cohortId) && checkCourses(item.courses)
    case 'work-manual.calendar.v1':
    case 'work-manual.calendar.v2':
      return checkEvents
    case 'work-manual.tasks.v1':
      return listOf((item) => isDate(item.date) && (isText(item.scheduleId)
        || (isText(item.id) && isText(item.title) && typeof item.done === 'boolean')))
    case 'work-manual.routine-edits.v1':
      return (value) => isRecord(value) && Object.values(value).every((item) => (
        isRecord(item) && isText(item.title) && isText(item.hint) && isText(item.badge)
        && (item.deleted === undefined || typeof item.deleted === 'boolean')
      ))
    case 'work-manual.checklist-order.v1':
      return (value) => isRecord(value) && Object.values(value).every((ids) => Array.isArray(ids) && ids.every(isText))
    case 'work-manual.calendar-categories.v1': {
      const valid = (key) => key === '' || courseSheetCategories.some((category) => category.key === key)
      return (value) => isRecord(value) && Object.entries(value).every(([id, entry]) => (
        id.includes(':') && isDate(id.slice(id.lastIndexOf(':') + 1)) && isRecord(entry)
        && (entry.mode === 'day' ? valid(entry.day) : entry.mode === 'split' && valid(entry.am) && valid(entry.pm))
      ))
    }
    case 'work-manual.notes.v1':
      return listOf((item) => isText(item.id) && isText(item.title) && isText(item.content)
        && ['learned', 'review'].includes(item.kind) && isText(item.createdAt) && Number.isFinite(Date.parse(item.createdAt))
        && typeof item.done === 'boolean' && typeof item.pinned === 'boolean' && optionalText(item.cohortId))
    default:
      if (/^work-manual\.student-links\.v1\.[^.]+\.[^.]+$/.test(key)) {
        return (item) => isRecord(item) && Object.values(item).every(isText)
      }
      if (/^work-manual\.student-layout\.v1\.[^.]+\.[^.]+$/.test(key)) {
        return listOf((group) => isText(group.name) && isText(group.type)
          && listOf((card) => isText(card.id) && isText(card.label))(group.cards))
      }
      if (/^work-manual\.student-previews\.v1\.[^.]+\.[^.]+$/.test(key)) {
        return (value) => isRecord(value) && Object.values(value).every((entry) => (
          isRecord(entry) && isText(entry.url) && isText(entry.text) && entry.text.length <= 10000
        ))
      }
      if (['work-manual.administration.v1', 'work-manual.systems.v1', 'work-manual.resources.v1'].includes(key)
        || /^work-manual\.(operations|resources)\.v1\.[^.]+$/.test(key)) {
        return listOf((item) => isText(item.id) && isText(item.name) && ['folder', 'link', 'note'].includes(item.kind)
          && (item.kind === 'folder' ? optionalText(item.content) : isText(item.content)) && optionalText(item.parentId))
      }
      return null
  }
}

function snapshot(storage) {
  const entries = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (validator(key)) entries.push([key, storage.getItem(key)])
  }
  return Object.fromEntries(entries)
}

export function createBackup(storage) {
  return { format, version, exportedAt: new Date().toISOString(), data: snapshot(storage) }
}

export function parseBackup(raw) {
  const backup = JSON.parse(raw)
  if (backup?.format !== format || backup.version !== version || !isRecord(backup.data)) {
    throw new Error('Invalid backup format')
  }
  for (const [key, value] of Object.entries(backup.data)) {
    const validate = validator(key)
    if (!validate || !isText(value) || !validate(key === 'work-manual.weather-region' ? value : JSON.parse(value))) {
      throw new Error('Invalid backup entry')
    }
  }
  return backup.data
}

export function replaceSavedData(storage, data) {
  const before = snapshot(storage)
  try {
    for (const key of Object.keys(before)) storage.removeItem(key)
    for (const [key, value] of Object.entries(data)) storage.setItem(key, value)
  } catch {
    try {
      for (const key of Object.keys(data)) storage.removeItem(key)
      for (const [key, value] of Object.entries(before)) storage.setItem(key, value)
    } catch {
      throw new Error('rollback-failed')
    }
    throw new Error('write-failed')
  }
}
import { courseSheetCategories } from './courseSheetCategories.js'


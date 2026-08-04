import { useMemo, useRef, useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import {
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DatabaseBackup,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  UserRound,
  MapPin,
  X,
} from 'lucide-react'
import {
  eventCategories,
  eventCategoryByKey,
  eventCategoryStyle,
} from '../config/eventCategories'
import { calendarEventService } from '../services/calendarEventService'
import { eventStorage } from '../services/eventStorage'
import type {
  CalendarEvent,
  CalendarEventInstance,
  EventCategory,
  RecurrenceType,
} from '../types/calendar'
import {
  generateEventInstancesForMonth,
  getRecurrenceLabel,
} from '../utils/recurrence'
import { MonthCalendar } from './MonthCalendar'

type EventDraft = Omit<CalendarEvent, 'id' | 'shortTitle'>
type FormErrors = Partial<Record<keyof EventDraft, string>>

const LOCATION_OPTIONS = ['TP767', '內湖磐石', '自行輸入'] as const

const RECURRENCE_OPTIONS: Array<{ value: RecurrenceType; label: string }> = [
  { value: 'none', label: '不循環' },
  { value: 'weekly', label: '每週' },
  { value: 'monthly', label: '每月' },
  { value: 'yearly', label: '每年' },
]

const RECURRENCE_INTERVALS: Record<Exclude<RecurrenceType, 'none'>, number[]> = {
  weekly: [1, 2, 3, 4],
  monthly: [1, 2, 3],
  yearly: [1, 2],
}

function recurrenceIntervalUnit(type: RecurrenceType) {
  if (type === 'weekly') return '週'
  if (type === 'monthly') return '個月'
  return '年'
}

function calculateEndTime(startTime: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(startTime)
  if (!match) return ''

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return ''

  const endMinutes = (hours * 60 + minutes + 90) % (24 * 60)
  const endHours = Math.floor(endMinutes / 60)
  const remainingMinutes = endMinutes % 60

  return `${String(endHours).padStart(2, '0')}:${String(remainingMinutes).padStart(2, '0')}`
}

const createEmptyDraft = (date = format(new Date(), 'yyyy-MM-dd')): EventDraft => ({
  category: 'daily-training',
  title: '',
  date,
  startTime: '08:30',
  endTime: calculateEndTime('08:30'),
  instructor: '',
  location: 'TP767',
  description: '',
  notes: '',
  registrationUrl: '',
  attachmentUrl: '',
  featured: false,
  visible: true,
  showInWeeklyHighlights: false,
  recurrenceType: 'none',
  recurrenceInterval: 1,
  recurrenceEndDate: null,
})

function toDraft(event: CalendarEvent): EventDraft {
  const { id: _id, shortTitle: _shortTitle, ...draft } = event
  return draft
}

function isValidUrl(value: string) {
  if (!value) return true
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

interface EventEditorProps {
  events: CalendarEvent[]
  loading: boolean
  error: string
  onReload: () => Promise<void>
}

function eventSignature(event: EventDraft | CalendarEvent) {
  return [
    event.title.trim().toLowerCase(),
    event.date,
    event.startTime,
    event.endTime,
    event.location.trim().toLowerCase(),
  ].join('|')
}

export function EventEditor({
  events,
  loading,
  error,
  onReload,
}: EventEditorProps) {
  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EventDraft>(createEmptyDraft)
  const [endTimeManuallyEdited, setEndTimeManuallyEdited] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [message, setMessage] = useState('')
  const [operationError, setOperationError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [legacyEvents] = useState(() => eventStorage.getLegacyEvents())
  const [hasLegacyStorage] = useState(() => eventStorage.hasLegacyEvents())
  const formRef = useRef<HTMLDivElement>(null)
  const categoryDetailsRef = useRef<HTMLDetailsElement>(null)

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')

  const monthEvents = useMemo(
    () => generateEventInstancesForMonth(events, month),
    [events, month],
  )

  const eventsByDate = useMemo(
    () =>
      monthEvents.reduce<Record<string, CalendarEventInstance[]>>((result, event) => {
        result[event.date] = [...(result[event.date] ?? []), event]
        return result
      }, {}),
    [monthEvents],
  )

  const selectedEvents = eventsByDate[selectedDateKey] ?? []

  const updateDraft = <Key extends keyof EventDraft>(
    key: Key,
    value: EventDraft[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setMessage('')
    setOperationError('')
  }

  const updateStartTime = (startTime: string) => {
    setDraft((current) => ({
      ...current,
      startTime,
      endTime: endTimeManuallyEdited
        ? current.endTime
        : calculateEndTime(startTime),
    }))
    setErrors((current) => ({
      ...current,
      startTime: undefined,
      endTime: undefined,
    }))
    setMessage('')
    setOperationError('')
  }

  const updateEndTime = (endTime: string) => {
    setEndTimeManuallyEdited(true)
    updateDraft('endTime', endTime)
  }

  const updateRecurrenceType = (recurrenceType: RecurrenceType) => {
    setDraft((current) => ({
      ...current,
      recurrenceType,
      recurrenceInterval: 1,
      recurrenceEndDate:
        recurrenceType === 'none' ? null : current.recurrenceEndDate,
    }))
    setErrors((current) => ({
      ...current,
      recurrenceType: undefined,
      recurrenceInterval: undefined,
      recurrenceEndDate: undefined,
    }))
    setMessage('')
    setOperationError('')
  }

  const startNew = () => {
    setEditingId(null)
    setDraft(createEmptyDraft(selectedDateKey))
    setEndTimeManuallyEdited(false)
    setErrors({})
    setMessage('')
    setOperationError('')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const startEdit = (eventOrInstance: CalendarEvent) => {
    const originalEvent = events.find((event) => event.id === eventOrInstance.id)
    if (!originalEvent) return
    const occurrenceDate = parseISO(eventOrInstance.date)
    setMonth(occurrenceDate)
    setSelectedDate(occurrenceDate)
    setEditingId(originalEvent.id)
    setDraft(toDraft(originalEvent))
    setEndTimeManuallyEdited(false)
    setErrors({})
    setMessage('')
    setOperationError('')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const cancel = () => {
    setEditingId(null)
    setDraft(createEmptyDraft(selectedDateKey))
    setEndTimeManuallyEdited(false)
    setErrors({})
    setMessage('')
    setOperationError('')
  }

  const moveMonth = (amount: number) => {
    const nextMonth = addMonths(month, amount)
    setMonth(nextMonth)
    setSelectedDate(nextMonth)
  }

  const goToday = () => {
    const today = new Date()
    setMonth(today)
    setSelectedDate(today)
  }

  const selectDate = (date: Date) => {
    setSelectedDate(date)
    setMessage('')
    setOperationError('')
  }

  const validate = () => {
    const nextErrors: FormErrors = {}
    if (!draft.title.trim()) nextErrors.title = '請輸入活動名稱'
    if (!draft.date) nextErrors.date = '請選擇日期'
    if (!draft.startTime) nextErrors.startTime = '請選擇開始時間'
    if (!draft.endTime) nextErrors.endTime = '請選擇結束時間'
    if (!draft.instructor.trim()) nextErrors.instructor = '請輸入講師'
    if (!draft.location.trim()) nextErrors.location = '請輸入地點'
    if (
      draft.recurrenceType !== 'none' &&
      !RECURRENCE_INTERVALS[draft.recurrenceType].includes(
        draft.recurrenceInterval,
      )
    ) {
      nextErrors.recurrenceInterval = '請選擇有效的循環間隔'
    }
    if (
      draft.recurrenceType !== 'none' &&
      draft.recurrenceEndDate &&
      draft.recurrenceEndDate < draft.date
    ) {
      nextErrors.recurrenceEndDate = '循環結束日期不可早於活動日期'
    }
    if (!isValidUrl(draft.registrationUrl ?? '')) {
      nextErrors.registrationUrl = '請輸入有效的 http(s) 網址'
    }
    if (!isValidUrl(draft.attachmentUrl ?? '')) {
      nextErrors.attachmentUrl = '請輸入有效的 http(s) 網址'
    }
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (saving || !validate()) return

    const normalized: EventDraft = {
      ...draft,
      title: draft.title.trim(),
      instructor: draft.instructor.trim(),
      location: draft.location.trim(),
      description: draft.description.trim(),
      notes: draft.notes.trim(),
      registrationUrl: draft.registrationUrl?.trim(),
      attachmentUrl: draft.attachmentUrl?.trim(),
    }

    setSaving(true)
    setOperationError('')
    try {
      if (editingId) {
        await calendarEventService.updateEvent(editingId, normalized)
        setMessage('活動已更新')
      } else {
        await calendarEventService.createEvent(normalized)
        setMessage('活動已新增')
      }
      await onReload()
      setEditingId(null)
      setDraft(createEmptyDraft(selectedDateKey))
      setEndTimeManuallyEdited(false)
      setErrors({})
    } catch (saveError) {
      setOperationError(
        saveError instanceof Error ? saveError.message : '儲存活動失敗，請稍後再試。',
      )
    } finally {
      setSaving(false)
    }
  }

  const remove = async (event: CalendarEvent) => {
    if (deletingId || saving || importing) return
    const confirmMessage = event.recurrenceType === 'none'
      ? `確定要刪除「${event.title}」嗎？此動作無法復原。`
      : `此操作會刪除整個循環活動，確定要繼續嗎？\n\n${event.title}`
    if (!window.confirm(confirmMessage)) return
    setDeletingId(event.id)
    setOperationError('')
    try {
      await calendarEventService.deleteEvent(event.id)
      await onReload()
      setEditingId(null)
      setDraft(createEmptyDraft(selectedDateKey))
      setEndTimeManuallyEdited(false)
      setErrors({})
      setMessage('活動已刪除')
    } catch (deleteError) {
      setOperationError(
        deleteError instanceof Error ? deleteError.message : '刪除活動失敗，請稍後再試。',
      )
    } finally {
      setDeletingId(null)
    }
  }

  const importLegacyEvents = async () => {
    if (importing || !legacyEvents.length) return
    if (!window.confirm(`確定要將這台裝置的 ${legacyEvents.length} 筆舊活動匯入 Supabase 嗎？舊資料會保留作為備份。`)) return

    const existing = new Set(events.map(eventSignature))
    const uniqueLegacyEvents: EventDraft[] = []
    legacyEvents.forEach((event) => {
      const signature = eventSignature(event)
      if (existing.has(signature)) return
      existing.add(signature)
      uniqueLegacyEvents.push(toDraft(event))
    })

    if (!uniqueLegacyEvents.length) {
      setMessage('舊資料皆已存在，沒有需要匯入的活動')
      return
    }

    setImporting(true)
    setOperationError('')
    try {
      await calendarEventService.createEvents(uniqueLegacyEvents)
      await onReload()
      setMessage(`已匯入 ${uniqueLegacyEvents.length} 筆舊活動，localStorage 備份仍保留`)
    } catch (importError) {
      setOperationError(
        importError instanceof Error ? importError.message : '匯入舊資料失敗，請稍後再試。',
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="editor-layout">
      <section className="editor-toolbar-card">
        <div>
          <span className="eyebrow">EVENT MANAGEMENT</span>
          <h2>活動管理</h2>
          <p>活動直接儲存至 Supabase，完成後會同步更新一般檢視。</p>
        </div>
        {hasLegacyStorage && (
          <div className="editor-toolbar-actions">
            <button
              type="button"
              className="restore-button"
              onClick={importLegacyEvents}
              disabled={importing || saving || Boolean(deletingId) || !legacyEvents.length}
            >
              <DatabaseBackup size={16} />{importing ? '匯入中…' : '匯入舊資料'}
            </button>
          </div>
        )}
      </section>

      {message && (
        <div className="success-toast" role="status">
          <CheckCircle2 size={18} />{message}
        </div>
      )}
      {operationError && (
        <div className="operation-error" role="alert">{operationError}</div>
      )}

      <section className="calendar-card editor-calendar-card">
        <div className="calendar-toolbar editor-calendar-toolbar">
          <div>
            <span className="eyebrow">COURSE CALENDAR</span>
            <h2>{format(month, 'yyyy 年 M 月', { locale: zhTW })}</h2>
          </div>
          <div className="toolbar-actions editor-calendar-actions">
            <button
              type="button"
              className="primary-button"
              onClick={startNew}
              disabled={saving || importing || Boolean(deletingId)}
            >
              <Plus size={17} />新增活動
            </button>
            <button type="button" className="today-button" onClick={goToday}>今天</button>
            <button type="button" className="icon-button" onClick={() => moveMonth(-1)} aria-label="上一個月"><ChevronLeft /></button>
            <button type="button" className="icon-button" onClick={() => moveMonth(1)} aria-label="下一個月"><ChevronRight /></button>
          </div>
        </div>

        <div className="legend editor-calendar-legend">
          {eventCategories.map((category) => (
            <span key={category.key}>
              <i
                style={{
                  backgroundColor: category.borderColor,
                  borderColor: category.borderColor,
                }}
              />
              {category.label}
            </span>
          ))}
          <span><i className="hidden-event-legend" />隱藏活動</span>
          <span><Sparkles size={13} />本週重點</span>
        </div>

        {error && (
          <div className="inline-load-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={onReload} disabled={loading}>
              <RefreshCw size={15} />重新載入
            </button>
          </div>
        )}

        <MonthCalendar
          month={month}
          selectedDate={selectedDate}
          onSelectDate={selectDate}
          renderDay={(date) =>
            (eventsByDate[format(date, 'yyyy-MM-dd')] ?? []).map((event) => (
              <span
                className={[
                  'event-pill',
                  'event-category-surface',
                  'editor-calendar-event',
                  event.visible ? '' : 'is-hidden',
                  editingId === event.id ? 'is-selected' : '',
                ].join(' ')}
                style={eventCategoryStyle(event.category)}
                key={event.id}
                role="button"
                tabIndex={0}
                aria-label={`${event.title}，${event.startTime} 到 ${event.endTime}${event.visible ? '' : '，已隱藏'}${event.showInWeeklyHighlights ? '，本週重點' : ''}${event.recurrenceType === 'none' ? '' : `，${getRecurrenceLabel(event.recurrenceType)}`}`}
                aria-pressed={editingId === event.id}
                onClick={(clickEvent) => {
                  clickEvent.stopPropagation()
                  startEdit(event)
                }}
                onKeyDown={(keyEvent) => {
                  if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') return
                  keyEvent.preventDefault()
                  keyEvent.stopPropagation()
                  startEdit(event)
                }}
              >
                <span className="editor-pill-title">{event.shortTitle}</span>
                {(!event.visible || event.showInWeeklyHighlights || event.recurrenceType !== 'none') && (
                  <span className="editor-pill-flags">
                    {!event.visible && <span>隱藏</span>}
                    {event.showInWeeklyHighlights && <span>重點</span>}
                    {event.recurrenceType !== 'none' && (
                      <span>{getRecurrenceLabel(event.recurrenceType)}</span>
                    )}
                  </span>
                )}
              </span>
            ))
          }
          getDayLabel={(date) => {
            const dayEvents = eventsByDate[format(date, 'yyyy-MM-dd')] ?? []
            return `${format(date, 'M 月 d 日 EEEE', { locale: zhTW })}${dayEvents.length ? `，${dayEvents.length} 個活動` : ''}`
          }}
        />
      </section>

      <section className="event-list-card selected-date-events-card">
        <div className="section-heading selected-date-heading">
          <div>
            <span className="eyebrow">SELECTED DATE</span>
            <h2>{format(selectedDate, 'M 月 d 日 EEEE', { locale: zhTW })}</h2>
          </div>
          <span className="record-count">{selectedEvents.length} 筆活動</span>
        </div>

        <div className={`editor-date-event-list ${loading ? 'is-loading' : ''}`}>
          {selectedEvents.map((event) => (
            <article
              className={[
                'editor-date-event-item',
                event.visible ? '' : 'is-hidden',
                editingId === event.id ? 'is-selected' : '',
              ].join(' ')}
              key={event.occurrenceKey}
            >
              <button
                type="button"
                className="editor-date-event-select"
                onClick={() => startEdit(event)}
                disabled={saving || importing || Boolean(deletingId)}
                aria-pressed={editingId === event.id}
              >
                <span className="editor-date-event-topline">
                  <span
                    className="category-badge event-category-surface"
                    style={eventCategoryStyle(event.category)}
                  >
                    {eventCategoryByKey[event.category].label}
                  </span>
                  {event.visible
                    ? <span className="visible-badge"><Eye size={13} />顯示中</span>
                    : <span className="hidden-badge"><EyeOff size={13} />已隱藏</span>}
                  {event.showInWeeklyHighlights
                    ? <span className="highlight-badge"><Sparkles size={13} />本週重點</span>
                    : <span className="standard-badge">非本週重點</span>}
                  {event.recurrenceType !== 'none' && (
                    <span className="recurrence-badge">
                      {getRecurrenceLabel(event.recurrenceType)}
                    </span>
                  )}
                </span>
                <strong className="editor-date-event-title">{event.title}</strong>
                <span className="editor-date-event-meta">
                  <span><Clock3 size={16} />{event.startTime}–{event.endTime}</span>
                  <span><UserRound size={16} />{event.instructor}</span>
                  <span><MapPin size={16} />{event.location}</span>
                </span>
              </button>
              <div className="list-actions">
                <button
                  type="button"
                  onClick={() => startEdit(event)}
                  disabled={saving || importing || Boolean(deletingId)}
                  aria-label={`編輯 ${event.title}`}
                >
                  <Edit3 size={16} />編輯
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => remove(event)}
                  disabled={saving || importing || Boolean(deletingId)}
                  aria-label={`刪除 ${event.title}`}
                >
                  <Trash2 size={16} />{deletingId === event.id ? '刪除中…' : '刪除'}
                </button>
              </div>
            </article>
          ))}

          {!loading && !selectedEvents.length && !error && (
            <div className="empty-state selected-date-empty">
              <Eye size={28} />
              <strong>這一天尚無活動</strong>
              <p>可選擇其他日期，或直接建立這一天的新活動。</p>
              <button
                type="button"
                className="primary-button"
                onClick={startNew}
                disabled={saving || importing || Boolean(deletingId)}
              >
                <Plus size={17} />新增活動
              </button>
            </div>
          )}
          {loading && (
            <div className="empty-state"><RefreshCw className="spin" size={28} /><strong>正在載入活動</strong></div>
          )}
        </div>
      </section>

      <section className="editor-form-card" ref={formRef}>
        <div className="editor-card-heading">
          <span className="editor-heading-icon"><CalendarPlus size={20} /></span>
          <div>
            <span className="eyebrow">{editingId ? 'EDIT EVENT' : 'NEW EVENT'}</span>
            <h2>{editingId ? '修改活動' : '新增活動'}</h2>
            {editingId && <p className="editing-event-name">目前正在編輯：{draft.title}</p>}
          </div>
        </div>

        <form onSubmit={save} noValidate>
          <div className="editor-form-grid">
            <div className="category-field">
              <span id="event-category-label">活動分類 *</span>
              <details className="category-select" ref={categoryDetailsRef}>
                <summary aria-labelledby="event-category-label">
                  <i
                    className="category-dot"
                    style={{ backgroundColor: eventCategoryByKey[draft.category].borderColor }}
                  />
                  <span>{eventCategoryByKey[draft.category].label}</span>
                </summary>
                <div className="category-select-menu" role="listbox" aria-label="活動分類">
                  {eventCategories.map((category) => (
                    <button
                      type="button"
                      role="option"
                      aria-selected={draft.category === category.key}
                      key={category.key}
                      onClick={() => {
                        updateDraft('category', category.key as EventCategory)
                        categoryDetailsRef.current?.removeAttribute('open')
                      }}
                      >
                        <i
                          className="category-dot"
                          style={{ backgroundColor: category.borderColor }}
                        />
                      <span>{category.label}</span>
                    </button>
                  ))}
                </div>
              </details>
            </div>

            <label className="span-two">
              <span>活動名稱 *</span>
              <input
                aria-label="活動名稱"
                value={draft.title}
                onChange={(event) => updateDraft('title', event.target.value)}
                aria-invalid={Boolean(errors.title)}
              />
              {errors.title && <small className="field-error">{errors.title}</small>}
            </label>

            <label>
              <span>日期 *</span>
              <input
                aria-label="日期"
                type="date"
                value={draft.date}
                onChange={(event) => updateDraft('date', event.target.value)}
                aria-invalid={Boolean(errors.date)}
              />
              {errors.date && <small className="field-error">{errors.date}</small>}
            </label>

            <label>
              <span>循環方式</span>
              <select
                aria-label="循環方式"
                value={draft.recurrenceType}
                onChange={(event) =>
                  updateRecurrenceType(event.target.value as RecurrenceType)
                }
              >
                {RECURRENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            {draft.recurrenceType !== 'none' && (
              <>
                <label>
                  <span>每隔多久</span>
                  <select
                    aria-label="循環間隔"
                    value={draft.recurrenceInterval}
                    onChange={(event) =>
                      updateDraft('recurrenceInterval', Number(event.target.value))
                    }
                  >
                    {RECURRENCE_INTERVALS[draft.recurrenceType].map((interval) => (
                      <option key={interval} value={interval}>
                        {interval} {recurrenceIntervalUnit(draft.recurrenceType)}
                      </option>
                    ))}
                  </select>
                  {errors.recurrenceInterval && (
                    <small className="field-error">{errors.recurrenceInterval}</small>
                  )}
                </label>

                <label>
                  <span>循環結束日期</span>
                  <input
                    aria-label="循環結束日期"
                    type="date"
                    min={draft.date || undefined}
                    value={draft.recurrenceEndDate ?? ''}
                    onChange={(event) =>
                      updateDraft('recurrenceEndDate', event.target.value || null)
                    }
                    aria-invalid={Boolean(errors.recurrenceEndDate)}
                  />
                  <small className="field-hint">留空代表持續循環</small>
                  {errors.recurrenceEndDate && (
                    <small className="field-error">{errors.recurrenceEndDate}</small>
                  )}
                </label>
              </>
            )}

            <label>
              <span>開始時間 *</span>
              <input
                aria-label="開始時間"
                type="time"
                value={draft.startTime}
                onChange={(event) => updateStartTime(event.target.value)}
                aria-invalid={Boolean(errors.startTime)}
              />
              {errors.startTime && <small className="field-error">{errors.startTime}</small>}
            </label>

            <label>
              <span>結束時間 *</span>
              <input
                aria-label="結束時間"
                type="time"
                value={draft.endTime}
                onChange={(event) => updateEndTime(event.target.value)}
                aria-invalid={Boolean(errors.endTime)}
              />
              {errors.endTime && <small className="field-error">{errors.endTime}</small>}
            </label>

            <label>
              <span>講師 *</span>
              <input
                aria-label="講師"
                value={draft.instructor}
                onChange={(event) => updateDraft('instructor', event.target.value)}
                aria-invalid={Boolean(errors.instructor)}
              />
              {errors.instructor && <small className="field-error">{errors.instructor}</small>}
            </label>

            <label>
              <span>地點 *</span>
              <input
                aria-label="地點"
                list="event-location-options"
                placeholder="選擇或輸入地點"
                value={draft.location}
                onChange={(event) =>
                  updateDraft(
                    'location',
                    event.target.value === '自行輸入' ? '' : event.target.value,
                  )
                }
                aria-invalid={Boolean(errors.location)}
              />
              <datalist id="event-location-options">
                {LOCATION_OPTIONS.map((location) => (
                  <option key={location} value={location} />
                ))}
              </datalist>
              {errors.location && <small className="field-error">{errors.location}</small>}
            </label>

            <label className="span-two">
              <span>活動說明</span>
              <textarea
                aria-label="活動說明"
                rows={3}
                value={draft.description}
                onChange={(event) => updateDraft('description', event.target.value)}
              />
            </label>

            <label className="span-two">
              <span>注意事項</span>
              <textarea
                aria-label="注意事項"
                rows={3}
                value={draft.notes}
                onChange={(event) => updateDraft('notes', event.target.value)}
              />
            </label>

            <label>
              <span>報名連結</span>
              <input
                aria-label="報名連結"
                type="url"
                placeholder="https://"
                value={draft.registrationUrl}
                onChange={(event) => updateDraft('registrationUrl', event.target.value)}
                aria-invalid={Boolean(errors.registrationUrl)}
              />
              {errors.registrationUrl && <small className="field-error">{errors.registrationUrl}</small>}
            </label>

            <label>
              <span>附件連結</span>
              <input
                aria-label="附件連結"
                type="url"
                placeholder="https://"
                value={draft.attachmentUrl}
                onChange={(event) => updateDraft('attachmentUrl', event.target.value)}
                aria-invalid={Boolean(errors.attachmentUrl)}
              />
              {errors.attachmentUrl && <small className="field-error">{errors.attachmentUrl}</small>}
            </label>

            <label className="visibility-toggle">
              <input
                type="checkbox"
                checked={draft.visible}
                onChange={(event) => updateDraft('visible', event.target.checked)}
                aria-label="是否顯示活動"
              />
              <span className="toggle-track"><i /></span>
              <span>
                <strong>{draft.visible ? '顯示此活動' : '隱藏此活動'}</strong>
                <small>{draft.visible ? '一般月曆與日期詳情會顯示' : '只保留在編輯頁，不顯示於一般檢視'}</small>
              </span>
            </label>

            <label className="visibility-toggle weekly-highlight-toggle">
              <input
                type="checkbox"
                checked={draft.showInWeeklyHighlights}
                onChange={(event) =>
                  updateDraft('showInWeeklyHighlights', event.target.checked)
                }
                aria-label="顯示在本週重點"
              />
              <span className="toggle-track"><i /></span>
              <span>
                <strong>顯示在本週重點</strong>
                <small>開啟後，此活動才會出現在首頁的本週重點區塊</small>
              </span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={cancel} disabled={saving}><X size={17} />取消</button>
            <button type="submit" className="primary-button" disabled={saving}>
              <Save size={17} />{saving ? '儲存中…' : '儲存活動'}
            </button>
          </div>
        </form>
      </section>

    </div>
  )
}

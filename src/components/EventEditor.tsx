import { useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import {
  CalendarPlus,
  CheckCircle2,
  DatabaseBackup,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import {
  eventCategories,
  eventCategoryByKey,
  eventCategoryStyle,
} from '../config/eventCategories'
import { calendarEventService } from '../services/calendarEventService'
import { eventStorage } from '../services/eventStorage'
import type { CalendarEvent, EventCategory } from '../types/calendar'

type EventDraft = Omit<CalendarEvent, 'id' | 'shortTitle'>
type FormErrors = Partial<Record<keyof EventDraft, string>>

const createEmptyDraft = (): EventDraft => ({
  category: 'daily-training',
  title: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  startTime: '09:00',
  endTime: '10:00',
  instructor: '',
  location: '',
  description: '',
  notes: '',
  registrationUrl: '',
  attachmentUrl: '',
  featured: false,
  visible: true,
  showInWeeklyHighlights: false,
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
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EventDraft>(createEmptyDraft)
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

  const sortedEvents = useMemo(
    () =>
      [...events].sort((a, b) =>
        `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
      ),
    [events],
  )

  const updateDraft = <Key extends keyof EventDraft>(
    key: Key,
    value: EventDraft[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    setMessage('')
    setOperationError('')
  }

  const startNew = () => {
    setEditingId(null)
    setDraft(createEmptyDraft())
    setErrors({})
    setMessage('')
    setOperationError('')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const startEdit = (event: CalendarEvent) => {
    setEditingId(event.id)
    setDraft(toDraft(event))
    setErrors({})
    setMessage('')
    setOperationError('')
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const cancel = () => {
    setEditingId(null)
    setDraft(createEmptyDraft())
    setErrors({})
    setMessage('')
    setOperationError('')
  }

  const validate = () => {
    const nextErrors: FormErrors = {}
    if (!draft.title.trim()) nextErrors.title = '請輸入活動名稱'
    if (!draft.date) nextErrors.date = '請選擇日期'
    if (!draft.startTime) nextErrors.startTime = '請選擇開始時間'
    if (!draft.endTime) nextErrors.endTime = '請選擇結束時間'
    if (draft.startTime && draft.endTime && draft.endTime <= draft.startTime) {
      nextErrors.endTime = '結束時間必須晚於開始時間'
    }
    if (!draft.instructor.trim()) nextErrors.instructor = '請輸入講師'
    if (!draft.location.trim()) nextErrors.location = '請輸入地點'
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
      setDraft(createEmptyDraft())
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
    if (!window.confirm(`確定要刪除「${event.title}」嗎？此動作無法復原。`)) return
    setDeletingId(event.id)
    setOperationError('')
    try {
      await calendarEventService.deleteEvent(event.id)
      await onReload()
      if (editingId === event.id) cancel()
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
        <div className="editor-toolbar-actions">
          {hasLegacyStorage && (
            <button
              type="button"
              className="restore-button"
              onClick={importLegacyEvents}
              disabled={importing || saving || Boolean(deletingId) || !legacyEvents.length}
            >
              <DatabaseBackup size={16} />{importing ? '匯入中…' : '匯入舊資料'}
            </button>
          )}
          <button
            type="button"
            className="primary-button"
            onClick={startNew}
            disabled={saving || importing || Boolean(deletingId)}
          >
            <Plus size={17} />新增活動
          </button>
        </div>
      </section>

      {message && (
        <div className="success-toast" role="status">
          <CheckCircle2 size={18} />{message}
        </div>
      )}
      {operationError && (
        <div className="operation-error" role="alert">{operationError}</div>
      )}

      <section className="editor-form-card" ref={formRef}>
        <div className="editor-card-heading">
          <span className="editor-heading-icon"><CalendarPlus size={20} /></span>
          <div>
            <span className="eyebrow">{editingId ? 'EDIT EVENT' : 'NEW EVENT'}</span>
            <h2>{editingId ? '修改活動' : '新增活動'}</h2>
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
              <span>開始時間 *</span>
              <input
                aria-label="開始時間"
                type="time"
                value={draft.startTime}
                onChange={(event) => updateDraft('startTime', event.target.value)}
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
                onChange={(event) => updateDraft('endTime', event.target.value)}
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
                value={draft.location}
                onChange={(event) => updateDraft('location', event.target.value)}
                aria-invalid={Boolean(errors.location)}
              />
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

      <section className="event-list-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ALL EVENTS</span>
            <h2>活動列表</h2>
          </div>
          <span className="record-count">共 {events.length} 筆</span>
        </div>

        {error && (
          <div className="inline-load-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={onReload} disabled={loading}>
              <RefreshCw size={15} />重新載入
            </button>
          </div>
        )}

        <div className={`editor-event-list ${loading ? 'is-loading' : ''}`}>
          {sortedEvents.map((event) => (
            <article className={`editor-event-item ${event.visible ? '' : 'is-hidden'}`} key={event.id}>
              <span
                className="editor-event-date event-category-surface"
                style={eventCategoryStyle(event.category)}
              >
                <strong>{format(parseISO(event.date), 'd')}</strong>
                {format(parseISO(event.date), 'M 月', { locale: zhTW })}
              </span>
              <div className="editor-event-copy">
                <div>
                  <span
                    className="category-badge event-category-surface"
                    style={eventCategoryStyle(event.category)}
                  >
                    {eventCategoryByKey[event.category].label}
                  </span>
                  {!event.visible && <span className="hidden-badge"><EyeOff size={12} />已隱藏</span>}
                  {event.showInWeeklyHighlights && (
                    <span className="highlight-badge"><Sparkles size={12} />本週重點</span>
                  )}
                </div>
                <h3>{event.title}</h3>
                <p>{event.date} · {event.startTime}–{event.endTime} · {event.instructor} · {event.location}</p>
              </div>
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
          {!loading && !events.length && !error && (
            <div className="empty-state"><Eye size={28} /><strong>目前沒有活動</strong><p>按下「新增活動」建立第一筆資料。</p></div>
          )}
          {loading && (
            <div className="empty-state"><RefreshCw className="spin" size={28} /><strong>正在載入活動</strong></div>
          )}
        </div>
      </section>
    </div>
  )
}

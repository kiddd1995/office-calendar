import {
  eventCategoryByKey,
  normalizeEventCategory,
} from '../config/eventCategories'
import { getSupabaseClient } from '../lib/supabaseClient'
import type { CalendarEvent } from '../types/calendar'

export type CalendarEventInput = Omit<CalendarEvent, 'id' | 'shortTitle'>

interface CalendarEventRow {
  id: string
  created_at: string
  title: string
  category: string
  event_date: string
  start_time: string | null
  end_time: string | null
  speaker: string | null
  location: string | null
  description: string | null
  notice: string | null
  registration_url: string | null
  attachment_url: string | null
  display_color: string | null
  is_visible: boolean
  show_in_weekly_highlights: boolean | null
  updated_at: string | null
}

const EVENT_COLUMNS = [
  'id',
  'created_at',
  'title',
  'category',
  'event_date',
  'start_time',
  'end_time',
  'speaker',
  'location',
  'description',
  'notice',
  'registration_url',
  'attachment_url',
  'display_color',
  'is_visible',
  'show_in_weekly_highlights',
  'updated_at',
].join(',')

function toCalendarEvent(row: CalendarEventRow): CalendarEvent {
  const category = normalizeEventCategory(row.category, row.display_color)
  const normalizeTime = (value: string | null) =>
    value && /^\d{2}:\d{2}/.test(value) ? value.slice(0, 5) : (value ?? '')

  return {
    id: row.id,
    title: row.title,
    shortTitle: row.title.slice(0, 8),
    category,
    date: row.event_date,
    startTime: normalizeTime(row.start_time),
    endTime: normalizeTime(row.end_time),
    instructor: row.speaker ?? '',
    location: row.location ?? '',
    description: row.description ?? '',
    notes: row.notice ?? '',
    registrationUrl: row.registration_url ?? '',
    attachmentUrl: row.attachment_url ?? '',
    visible: row.is_visible,
    showInWeeklyHighlights: row.show_in_weekly_highlights === true,
  }
}

function toCalendarEventRow(event: CalendarEventInput) {
  return {
    title: event.title,
    category: event.category,
    event_date: event.date,
    start_time: event.startTime || null,
    end_time: event.endTime || null,
    speaker: event.instructor || null,
    location: event.location || null,
    description: event.description || null,
    notice: event.notes || null,
    registration_url: event.registrationUrl || null,
    attachment_url: event.attachmentUrl || null,
    display_color: eventCategoryByKey[event.category].borderColor,
    is_visible: event.visible,
    show_in_weekly_highlights: event.showInWeeklyHighlights === true,
    updated_at: new Date().toISOString(),
  }
}

function operationError(action: string, error: { message: string }) {
  return new Error(`${action}失敗：${error.message}`)
}

async function getEvents(visibleOnly: boolean) {
  const client = getSupabaseClient()
  let query = client
    .from('calendar_events')
    .select(EVENT_COLUMNS)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })

  if (visibleOnly) query = query.eq('is_visible', true)

  const { data, error } = await query
  if (error) throw operationError('讀取活動', error)
  return (data as unknown as CalendarEventRow[]).map(toCalendarEvent)
}

export const calendarEventService = {
  getVisibleEvents() {
    return getEvents(true)
  },

  getAllEvents() {
    return getEvents(false)
  },

  async createEvent(event: CalendarEventInput) {
    const { data, error } = await getSupabaseClient()
      .from('calendar_events')
      .insert(toCalendarEventRow(event))
      .select(EVENT_COLUMNS)
      .single()

    if (error) throw operationError('新增活動', error)
    return toCalendarEvent(data as unknown as CalendarEventRow)
  },

  async createEvents(events: CalendarEventInput[]) {
    if (!events.length) return []
    const { data, error } = await getSupabaseClient()
      .from('calendar_events')
      .insert(events.map(toCalendarEventRow))
      .select(EVENT_COLUMNS)

    if (error) throw operationError('匯入活動', error)
    return (data as unknown as CalendarEventRow[]).map(toCalendarEvent)
  },

  async updateEvent(id: string, event: CalendarEventInput) {
    const { data, error } = await getSupabaseClient()
      .from('calendar_events')
      .update(toCalendarEventRow(event))
      .eq('id', id)
      .select(EVENT_COLUMNS)
      .single()

    if (error) throw operationError('更新活動', error)
    return toCalendarEvent(data as unknown as CalendarEventRow)
  },

  async deleteEvent(id: string) {
    const { error } = await getSupabaseClient()
      .from('calendar_events')
      .delete()
      .eq('id', id)

    if (error) throw operationError('刪除活動', error)
  },
}

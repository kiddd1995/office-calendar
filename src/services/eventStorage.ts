import { normalizeEventCategory } from '../config/eventCategories'
import type { CalendarEvent } from '../types/calendar'

export const EVENT_STORAGE_KEY = 'office-calendar-events'

function normalizeEvent(event: Partial<CalendarEvent>): CalendarEvent | null {
  if (
    typeof event.id !== 'string' ||
    typeof event.title !== 'string' ||
    typeof event.date !== 'string'
  ) {
    return null
  }

  const legacyEvent = event as Partial<CalendarEvent> & {
    color?: unknown
    show_in_weekly_highlights?: unknown
  }
  const category = normalizeEventCategory(event.category, legacyEvent.color)
  return {
    id: event.id,
    title: event.title,
    shortTitle: event.shortTitle || event.title.slice(0, 8),
    category,
    date: event.date,
    startTime: event.startTime ?? '',
    endTime: event.endTime ?? '',
    instructor: event.instructor ?? '',
    location: event.location ?? '',
    description: event.description ?? '',
    notes: event.notes ?? '',
    registrationUrl: event.registrationUrl ?? '',
    attachmentUrl: event.attachmentUrl ?? '',
    featured: event.featured,
    visible: event.visible !== false,
    showInWeeklyHighlights:
      event.showInWeeklyHighlights === true ||
      legacyEvent.show_in_weekly_highlights === true,
    recurrenceType: 'none',
    recurrenceInterval: 1,
    recurrenceEndDate: null,
  }
}

export const eventStorage = {
  getLegacyEvents(): CalendarEvent[] {
    const stored = localStorage.getItem(EVENT_STORAGE_KEY)
    if (stored === null) return []

    try {
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return []
      return parsed
        .map((event) => normalizeEvent(event))
        .filter((event): event is CalendarEvent => event !== null)
    } catch {
      return []
    }
  },

  hasLegacyEvents() {
    return localStorage.getItem(EVENT_STORAGE_KEY) !== null
  },
}

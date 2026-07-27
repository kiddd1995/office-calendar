import { parseISO } from 'date-fns'
import type { CalendarEvent } from '../types/calendar'

export function getPublicEvents(events: CalendarEvent[]) {
  return events.filter((event) => event.visible)
}

export function getWeeklyHighlightEvents(
  events: CalendarEvent[],
  weekStart: Date,
  weekEnd: Date,
) {
  return getPublicEvents(events)
    .filter((event) => {
      const date = parseISO(event.date)
      return (
        event.showInWeeklyHighlights === true &&
        date >= weekStart &&
        date <= weekEnd
      )
    })
    .sort((a, b) =>
      `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`),
    )
}

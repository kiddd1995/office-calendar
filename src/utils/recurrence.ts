import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDate,
  getDaysInMonth,
  getMonth,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type {
  CalendarEvent,
  CalendarEventInstance,
  RecurrenceType,
} from '../types/calendar'

const recurrenceLabels: Record<Exclude<RecurrenceType, 'none'>, string> = {
  weekly: '每週循環',
  monthly: '每月循環',
  yearly: '每年循環',
}

export function getRecurrenceLabel(type: RecurrenceType) {
  return type === 'none' ? '' : recurrenceLabels[type]
}

function safeInterval(event: CalendarEvent) {
  return Number.isInteger(event.recurrenceInterval) && event.recurrenceInterval > 0
    ? event.recurrenceInterval
    : 1
}

function isWithinRecurrenceBounds(event: CalendarEvent, target: Date) {
  const start = parseISO(event.date)
  if (isBefore(target, start)) return false
  if (!event.recurrenceEndDate) return true
  return !isAfter(target, parseISO(event.recurrenceEndDate))
}

export function eventOccursOnDate(event: CalendarEvent, target: Date) {
  const start = parseISO(event.date)
  if (!isWithinRecurrenceBounds(event, target)) return false

  const interval = safeInterval(event)
  switch (event.recurrenceType) {
    case 'weekly': {
      const days = differenceInCalendarDays(target, start)
      return days % (interval * 7) === 0
    }
    case 'monthly': {
      const months = differenceInCalendarMonths(target, start)
      const expectedDay = Math.min(getDate(start), getDaysInMonth(target))
      return months % interval === 0 && getDate(target) === expectedDay
    }
    case 'yearly': {
      const years = differenceInCalendarYears(target, start)
      const expectedDay = Math.min(getDate(start), getDaysInMonth(target))
      return (
        years % interval === 0 &&
        getMonth(target) === getMonth(start) &&
        getDate(target) === expectedDay
      )
    }
    case 'none':
    default:
      return isSameDay(target, start)
  }
}

export function generateEventInstancesForRange(
  events: CalendarEvent[],
  rangeStart: Date,
  rangeEnd: Date,
): CalendarEventInstance[] {
  if (isAfter(rangeStart, rangeEnd)) return []

  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd })
  return events
    .flatMap((event) =>
      days
        .filter((date) => eventOccursOnDate(event, date))
        .map((date) => {
          const occurrenceDate = format(date, 'yyyy-MM-dd')
          return {
            ...event,
            sourceDate: event.date,
            date: occurrenceDate,
            occurrenceKey: `${event.id}::${occurrenceDate}`,
          }
        }),
    )
    .sort((a, b) =>
      `${a.date}${a.startTime}${a.title}`.localeCompare(
        `${b.date}${b.startTime}${b.title}`,
      ),
    )
}

export function generateEventInstancesForMonth(
  events: CalendarEvent[],
  month: Date,
) {
  return generateEventInstancesForRange(
    events,
    startOfWeek(startOfMonth(month)),
    endOfWeek(endOfMonth(month)),
  )
}

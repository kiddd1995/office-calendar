import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'
import type { ReactNode } from 'react'
import { getTaiwanHoliday } from '../data/taiwanHolidays'

interface MonthCalendarProps {
  month: Date
  selectedDate: Date
  onSelectDate: (date: Date) => void
  renderDay?: (date: Date) => ReactNode
  dayClassName?: (date: Date) => string
  getDayLabel?: (date: Date) => string
}

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

export function MonthCalendar({
  month,
  selectedDate,
  onSelectDate,
  renderDay,
  dayClassName,
  getDayLabel,
}: MonthCalendarProps) {
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  })

  return (
    <div className="month-calendar" role="grid" aria-label={format(month, 'yyyy 年 M 月', { locale: zhTW })}>
      <div className="weekday-row" role="row">
        {weekdays.map((weekday, index) => (
          <div
            className={`weekday ${index === 0 || index === 6 ? 'weekend' : ''}`}
            role="columnheader"
            key={weekday}
          >
            {weekday}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {days.map((date) => {
          const selected = isSameDay(date, selectedDate)
          const today = isToday(date)
          const weekend = date.getDay() === 0 || date.getDay() === 6
          const holiday = getTaiwanHoliday(format(date, 'yyyy-MM-dd'))
          const dayLabel = getDayLabel?.(date)
            ?? format(date, 'M 月 d 日 EEEE', { locale: zhTW })
          return (
            <button
              type="button"
              role="gridcell"
              key={date.toISOString()}
              className={[
                'calendar-day',
                !isSameMonth(date, month) ? 'outside-month' : '',
                weekend ? 'weekend' : '',
                holiday ? 'national-holiday' : '',
                today ? 'today' : '',
                selected ? 'selected' : '',
                dayClassName?.(date) ?? '',
              ].join(' ')}
              onClick={() => onSelectDate(date)}
              aria-selected={selected}
              aria-label={`${dayLabel}${holiday ? `，國定假日：${holiday.name}` : ''}`}
            >
              <span className="day-number">{format(date, 'd')}</span>
              <span className="day-content">
                {holiday && (
                  <span className="holiday-tag" title={holiday.name}>
                    {holiday.shortName ?? holiday.name}
                  </span>
                )}
                {renderDay?.(date)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

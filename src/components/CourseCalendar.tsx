import { useMemo, useState } from 'react'
import {
  addMonths,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
  endOfWeek,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  MapPin,
  Sparkles,
  UserRound,
} from 'lucide-react'
import {
  eventCategories,
  eventCategoryByKey,
  eventCategoryStyle,
} from '../config/eventCategories'
import type { CalendarEvent } from '../types/calendar'
import {
  getPublicEvents,
  getWeeklyHighlightEvents,
} from '../utils/eventFilters'
import { MonthCalendar } from './MonthCalendar'

interface CourseCalendarProps {
  events: CalendarEvent[]
}

export function CourseCalendar({ events }: CourseCalendarProps) {
  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const visibleEvents = useMemo(() => getPublicEvents(events), [events])
  const selectedEvents = visibleEvents.filter((event) =>
    isSameDay(parseISO(event.date), selectedDate),
  )
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
  const featuredEvents = getWeeklyHighlightEvents(
    visibleEvents,
    weekStart,
    weekEnd,
  )

  const eventsByDate = useMemo(
    () =>
      visibleEvents.reduce<Record<string, CalendarEvent[]>>((result, event) => {
        result[event.date] = [...(result[event.date] ?? []), event]
        return result
      }, {}),
    [visibleEvents],
  )

  const moveMonth = (amount: number) => {
    const next = addMonths(month, amount)
    setMonth(next)
    setSelectedDate(next)
  }

  const goToday = () => {
    const today = new Date()
    setMonth(today)
    setSelectedDate(today)
  }

  return (
    <div className="view-stack">
      <section className="weekly-card">
        <div className="section-heading">
          <div>
            <span className="eyebrow"><Sparkles size={14} /> THIS WEEK</span>
            <h2>本週重點</h2>
          </div>
          <span className="week-range">{format(weekStart, 'M/d')} — {format(weekEnd, 'M/d')}</span>
        </div>
        <div className="weekly-list">
          {featuredEvents.map((event) => (
            <button
              className="weekly-item"
              type="button"
              key={event.id}
              onClick={() => {
                const date = parseISO(event.date)
                setSelectedDate(date)
                setMonth(date)
              }}
            >
              <span
                className="weekly-date event-category-surface"
                style={eventCategoryStyle(event.category)}
              >
                <strong>{format(parseISO(event.date), 'd')}</strong>
                {format(parseISO(event.date), 'EEE', { locale: zhTW })}
              </span>
              <span className="weekly-copy">
                <strong>{event.title}</strong>
                <small>{event.startTime} · {event.location}</small>
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
          {!featuredEvents.length && (
            <div className="weekly-empty">本週尚無重點活動</div>
          )}
        </div>
      </section>

      <section className="calendar-card">
        <div className="calendar-toolbar">
          <div>
            <span className="eyebrow">COURSE CALENDAR</span>
            <h2>{format(month, 'yyyy 年 M 月', { locale: zhTW })}</h2>
          </div>
          <div className="toolbar-actions">
            <button type="button" className="today-button" onClick={goToday}>今天</button>
            <button type="button" className="icon-button" onClick={() => moveMonth(-1)} aria-label="上一個月"><ChevronLeft /></button>
            <button type="button" className="icon-button" onClick={() => moveMonth(1)} aria-label="下一個月"><ChevronRight /></button>
          </div>
        </div>
        <div className="legend">
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
        </div>
        <MonthCalendar
          month={month}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          renderDay={(date) =>
            (eventsByDate[format(date, 'yyyy-MM-dd')] ?? []).map((event) => (
              <span
                className="event-pill event-category-surface"
                style={eventCategoryStyle(event.category)}
                key={event.id}
              >
                {event.shortTitle}
              </span>
            ))
          }
          getDayLabel={(date) => {
            const dayEvents = eventsByDate[format(date, 'yyyy-MM-dd')] ?? []
            return `${format(date, 'M 月 d 日 EEEE', { locale: zhTW })}${dayEvents.length ? `，${dayEvents.length} 個活動` : ''}`
          }}
        />
      </section>

      <section className="detail-section">
        <div className="detail-heading">
          <div className="date-badge"><CalendarDays size={20} /></div>
          <div>
            <span className="eyebrow">SELECTED DATE</span>
            <h2>{format(selectedDate, 'M 月 d 日 EEEE', { locale: zhTW })}</h2>
          </div>
          <span className="count-badge">{selectedEvents.length} 場活動</span>
        </div>
        {selectedEvents.length ? (
          <div className="event-details">
            {selectedEvents.map((event) => {
              const meta = eventCategoryByKey[event.category]
              return (
                <article className="event-detail-card" key={event.id}>
                  <div
                    className="event-accent event-category-accent"
                    style={eventCategoryStyle(event.category)}
                  />
                  <div className="event-detail-header">
                    <div>
                      <span
                        className="category-badge event-category-surface"
                        style={eventCategoryStyle(event.category)}
                      >
                        {meta.label}
                      </span>
                      <h3>{event.title}</h3>
                    </div>
                    <span className="event-time"><Clock3 size={16} />{event.startTime}–{event.endTime}</span>
                  </div>
                  <div className="event-meta">
                    <span><UserRound size={17} />{event.instructor}</span>
                    <span><MapPin size={17} />{event.location}</span>
                  </div>
                  <div className="event-description">
                    <div><h4>活動說明</h4><p>{event.description}</p></div>
                    <div><h4>注意事項</h4><p>{event.notes}</p></div>
                  </div>
                  <div className="event-links">
                    {event.registrationUrl && <a href={event.registrationUrl} target="_blank" rel="noopener noreferrer">前往報名 <ArrowUpRight size={16} /></a>}
                    {event.attachmentUrl && <a href={event.attachmentUrl} target="_blank" rel="noopener noreferrer" className="secondary-link"><FileText size={16} />查看附件</a>}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <CalendarDays size={28} />
            <strong>這一天尚無活動</strong>
            <p>選擇月曆上有色彩標籤的日期查看課程內容。</p>
          </div>
        )}
      </section>
    </div>
  )
}

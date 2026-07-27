import { useEffect, useMemo, useState } from 'react'
import {
  addMonths,
  format,
  isAfter,
  isBefore,
  parseISO,
} from 'date-fns'
import { zhTW } from 'date-fns/locale'
import {
  AlertTriangle,
  Banknote,
  Building2,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Flag,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react'
import { loadInsuranceCalendar } from '../services/excelReader'
import type {
  InsuranceCalendarData,
  PaydayRecord,
  WorkMonthRecord,
} from '../types/calendar'
import { MonthCalendar } from './MonthCalendar'

function formatDate(date: string) {
  if (!date) return '尚未提供'
  return format(parseISO(date), 'M/d（EEE）', { locale: zhTW })
}

function formatDateLong(date: string) {
  if (!date) return '尚未提供'
  return format(parseISO(date), 'yyyy/M/d', { locale: zhTW })
}

function paydayLabel(payday: PaydayRecord) {
  return payday.displayText || payday.payType || '發薪日'
}

function workMonthLabel(period: WorkMonthRecord) {
  return period.workMonthOrder === 0
    ? '上年度第12工作月'
    : `第${period.workMonthOrder}工作月`
}

function paydayMatchesPeriod(
  payday: PaydayRecord,
  period: WorkMonthRecord,
) {
  return payday.workMonthOrder === period.workMonthOrder
}

export function WorkCalendar() {
  const [data, setData] = useState<InsuranceCalendarData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [companyCode, setCompanyCode] = useState('')
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [mode, setMode] = useState<'calendar' | 'overview'>('calendar')

  const loadData = (reload = false) => {
    setLoading(true)
    setError('')
    loadInsuranceCalendar({ reload })
      .then((nextData) => {
        const initialYear = nextData.years.includes(new Date().getFullYear())
          ? new Date().getFullYear()
          : nextData.years[nextData.years.length - 1]
        setData(nextData)
        setCompanyCode((current) =>
          nextData.companies.some((company) => company.code === current)
            ? current
            : nextData.companies[0].code,
        )
        setYear((current) =>
          nextData.years.includes(current) ? current : initialYear,
        )
        if (!nextData.years.includes(new Date().getFullYear())) {
          const initialDate = new Date(initialYear, 0, 1)
          setMonth(initialDate)
          setSelectedDate(initialDate)
        }
      })
      .catch((reason: unknown) => {
        setError(
          reason instanceof Error
            ? reason.message
            : 'Excel 載入失敗，請確認檔案存在且格式正確。',
        )
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const companies = data?.companies ?? []
  const years = data?.years ?? []
  const company = companies.find((item) => item.code === companyCode)

  const periods = useMemo(
    () =>
      (data?.workMonths ?? [])
        .filter(
          (period) =>
            period.companyCode === companyCode && period.year === year,
        )
        .sort((a, b) => a.workMonthOrder - b.workMonthOrder),
    [companyCode, data, year],
  )

  const paydays = useMemo(
    () =>
      (data?.paydays ?? []).filter(
        (payday) =>
          payday.year === year &&
          (!payday.companyCode ||
            payday.companyCode === '本公司' ||
            payday.companyCode === companyCode),
      ),
    [companyCode, data, year],
  )

  const periodByDate = useMemo(
    () => (date: Date) =>
      periods.find(
        (period) =>
          period.startDate &&
          period.endDate &&
          !isBefore(date, parseISO(period.startDate)) &&
          !isAfter(date, parseISO(period.endDate)),
      ),
    [periods],
  )

  const dateKey = format(selectedDate, 'yyyy-MM-dd')
  const selectedPeriod = periodByDate(selectedDate)
  const selectedPaydays = paydays.filter((payday) => payday.payday === dateKey)

  const dayTags = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd')
    const tags: Array<{ id: string; type: string; label: string }> = []

    periods.forEach((period) => {
      const label = workMonthLabel(period)
      if (period.startDate === key) {
        tags.push({
          id: `start-${period.companyCode}-${period.workMonthOrder}`,
          type: 'work-boundary',
          label: `${label}開始`,
        })
      }
      if (period.endDate === key) {
        tags.push({
          id: `end-${period.companyCode}-${period.workMonthOrder}`,
          type: 'work-boundary',
          label: `${label}結束`,
        })
      }
      if (period.settlementDate === key) {
        tags.push({
          id: `settlement-${period.companyCode}-${period.workMonthOrder}`,
          type: 'settlement',
          label: `${label}結績日`,
        })
      }
    })

    paydays.forEach((payday) => {
      if (payday.payday === key) {
        tags.push({
          id: payday.id,
          type: 'payday',
          label: paydayLabel(payday),
        })
      }
    })

    return tags
  }

  const moveMonth = (amount: number) => {
    const nextMonth = addMonths(month, amount)
    setMonth(nextMonth)
    setSelectedDate(nextMonth)
    if (years.includes(nextMonth.getFullYear())) {
      setYear(nextMonth.getFullYear())
    }
  }

  const goToday = () => {
    const today = new Date()
    const targetYear = years.includes(today.getFullYear())
      ? today.getFullYear()
      : years[years.length - 1]
    const targetDate =
      targetYear === today.getFullYear() ? today : new Date(targetYear, 0, 1)
    setYear(targetYear)
    setMonth(targetDate)
    setSelectedDate(targetDate)
  }

  if (loading) {
    return (
      <section className="work-load-state" aria-live="polite">
        <LoaderCircle className="spin" size={28} />
        <strong>正在讀取保險公司行事曆</strong>
        <p>資料來源：insurance-calendar.xlsx</p>
      </section>
    )
  }

  if (error || !data) {
    return (
      <section className="work-load-state error-state" role="alert">
        <AlertTriangle size={30} />
        <strong>公司工作月 Excel 載入失敗</strong>
        <p>{error || '找不到可用的 Excel 資料。'}</p>
        <button type="button" className="primary-button" onClick={() => loadData(true)}>
          <RefreshCw size={16} />重新載入
        </button>
      </section>
    )
  }

  const selectedNotes = [
    selectedPeriod?.note,
    ...selectedPaydays.map((payday) => payday.note),
  ].filter((note, index, notes): note is string =>
    Boolean(note) && notes.indexOf(note) === index,
  )

  const unassignedPaydays = paydays.filter(
    (payday) => payday.workMonthOrder === null,
  )

  return (
    <div className="view-stack">
      <section className="work-controls">
        <div className="filter-group">
          <label htmlFor="company">保險公司</label>
          <div className="select-wrap">
            <Building2 size={17} />
            <select
              id="company"
              value={companyCode}
              onChange={(event) => setCompanyCode(event.target.value)}
            >
              {companies.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="filter-group">
          <label htmlFor="year">年度</label>
          <select
            id="year"
            value={year}
            onChange={(event) => {
              const nextYear = Number(event.target.value)
              const nextDate = new Date(nextYear, month.getMonth(), 1)
              setYear(nextYear)
              setMonth(nextDate)
              setSelectedDate(nextDate)
            }}
          >
            {years.map((item) => (
              <option key={item} value={item}>{item} 年</option>
            ))}
          </select>
        </div>
        <div className="view-switch" aria-label="顯示模式">
          <button className={mode === 'calendar' ? 'active' : ''} type="button" onClick={() => setMode('calendar')}>月曆</button>
          <button className={mode === 'overview' ? 'active' : ''} type="button" onClick={() => setMode('overview')}>年度總覽</button>
        </div>
      </section>

      {mode === 'calendar' ? (
        <>
          <section className="calendar-card work-calendar-card">
            <div className="calendar-toolbar">
              <div>
                <span className="eyebrow">WORK MONTH CALENDAR</span>
                <h2>{format(month, 'yyyy 年 M 月', { locale: zhTW })}</h2>
              </div>
              <div className="toolbar-actions">
                <button type="button" className="today-button" onClick={goToday}>今天</button>
                <button type="button" className="icon-button" onClick={() => moveMonth(-1)} aria-label="上一個月"><ChevronLeft /></button>
                <button type="button" className="icon-button" onClick={() => moveMonth(1)} aria-label="下一個月"><ChevronRight /></button>
              </div>
            </div>
            <div className="work-legend">
              <span><i className="work-bg" />工作月區間</span>
              <span><i className="work-boundary" />工作月開始／結束</span>
              <span><i className="settlement" />結績日</span>
              <span><i className="payday" />發薪／獎金</span>
            </div>
            <MonthCalendar
              month={month}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              dayClassName={(date) => {
                const period = periodByDate(date)
                return period
                  ? `in-work-period work-period-${Math.abs(period.workMonthOrder) % 2 === 0 ? 'even' : 'odd'}`
                  : ''
              }}
              renderDay={(date) => {
                const period = periodByDate(date)
                return (
                  <>
                    {period && <span className="work-month-label">{workMonthLabel(period)}</span>}
                    {dayTags(date).map((tag) => (
                      <span className={`work-tag ${tag.type}`} key={tag.id}>
                        {tag.label}
                      </span>
                    ))}
                  </>
                )
              }}
              getDayLabel={(date) => {
                const tags = dayTags(date)
                return `${format(date, 'M 月 d 日 EEEE', { locale: zhTW })}${tags.length ? `，${tags.map((tag) => tag.label).join('，')}` : ''}`
              }}
            />
          </section>

          <section className="work-detail-card">
            <div className="work-detail-title">
              <div className="date-badge"><CalendarCheck2 size={20} /></div>
              <div>
                <span className="eyebrow">DATE INFORMATION</span>
                <h2>{format(selectedDate, 'M 月 d 日 EEEE', { locale: zhTW })}</h2>
              </div>
            </div>
            {selectedPeriod || selectedPaydays.length ? (
              <>
                <div className="work-highlight">
                  <div><span>公司</span><strong>{company?.displayName}</strong></div>
                  <div><span>所屬工作月</span><strong>{selectedPeriod?.workMonth ?? '非工作月里程碑'}</strong></div>
                  <div><span>當日發薪／獎金</span><strong>{selectedPaydays.length ? `${selectedPaydays.length} 筆` : '無'}</strong></div>
                </div>
                <div className="milestone-grid">
                  <div><span className="milestone-icon work-boundary"><CalendarCheck2 size={18} /></span><small>工作月開始日</small><strong>{selectedPeriod ? formatDateLong(selectedPeriod.startDate) : '—'}</strong></div>
                  <div><span className="milestone-icon work-boundary"><Flag size={18} /></span><small>工作月最後一天</small><strong>{selectedPeriod ? formatDateLong(selectedPeriod.endDate) : '—'}</strong></div>
                  <div><span className="milestone-icon settlement"><CalendarCheck2 size={18} /></span><small>結績日</small><strong>{selectedPeriod ? formatDateLong(selectedPeriod.settlementDate) : '—'}</strong></div>
                  <div><span className="milestone-icon payday"><Banknote size={18} /></span><small>發薪或獎金資訊</small><strong>{selectedPaydays.length ? selectedPaydays.map(paydayLabel).join('、') : '當日無發放資料'}</strong></div>
                </div>
                {selectedPaydays.length > 0 && (
                  <div className="payday-detail-list">
                    {selectedPaydays.map((payday) => (
                      <div key={payday.id}>
                        <CircleDollarSign size={17} />
                        <span>
                          <strong>{paydayLabel(payday)}</strong>
                          <small>{formatDateLong(payday.payday)} · {payday.payType}{payday.workMonth ? ` · ${payday.workMonth}` : ''}</small>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="work-notes">
                  <strong>備註</strong>
                  {selectedNotes.length
                    ? selectedNotes.map((note) => <p key={note}>{note}</p>)
                    : <p>無備註</p>}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <CalendarCheck2 size={28} />
                <strong>這一天沒有工作月或發放資料</strong>
                <p>可切換月份、公司或年度查看其他資料。</p>
              </div>
            )}
          </section>
        </>
      ) : (
        <section className="overview-card">
          <div className="section-heading">
            <div><span className="eyebrow">YEAR OVERVIEW</span><h2>{company?.displayName} · {year} 年度總覽</h2></div>
            <span className="record-count">共 {periods.length} 個工作月</span>
          </div>
          <div className="overview-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>工作月</th>
                  <th>工作月區間</th>
                  <th>工作月最後一天</th>
                  <th>結績日</th>
                  <th>發薪日</th>
                </tr>
              </thead>
              <tbody>
                {periods.map((period) => {
                  const relatedPaydays = paydays.filter((payday) =>
                    paydayMatchesPeriod(payday, period),
                  )
                  return (
                    <tr key={`${period.companyCode}-${period.year}-${period.workMonthOrder}`}>
                      <td><span className="month-index">{period.workMonthOrder === 0 ? '前' : period.workMonthOrder}</span><strong>{period.workMonth}</strong></td>
                      <td>{formatDate(period.startDate)} — {formatDate(period.endDate)}</td>
                      <td><span className="table-tag work-boundary">{formatDate(period.endDate)}</span></td>
                      <td><span className="table-tag settlement">{formatDate(period.settlementDate)}</span></td>
                      <td>
                        <div className="overview-paydays">
                          {relatedPaydays.length
                            ? relatedPaydays.map((payday) => (
                              <span className="table-tag payday" key={payday.id}>
                                {formatDate(payday.payday)} · {paydayLabel(payday)}
                              </span>
                            ))
                            : '—'}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {unassignedPaydays.length > 0 && (
            <div className="bonus-overview">
              <strong>年度獎金與其他發放</strong>
              <div>
                {unassignedPaydays.map((payday) => (
                  <span key={payday.id}>
                    <CircleDollarSign size={15} />
                    {formatDateLong(payday.payday)} · {paydayLabel(payday)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

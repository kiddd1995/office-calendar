import { getTaiwanHoliday } from '../data/taiwanHolidays'

interface HolidayNoticeProps {
  date: string
}

export function HolidayNotice({ date }: HolidayNoticeProps) {
  const holiday = getTaiwanHoliday(date)
  if (!holiday) return null

  return (
    <div className="holiday-notice">
      <strong>國定假日：</strong>
      <span>{holiday.name}</span>
    </div>
  )
}

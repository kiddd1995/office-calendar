export type EventCategory =
  | 'daily-training'
  | 'opp'
  | 'panrock'
  | 'course-seminar'
  | 'manager-meeting'
  | 'unit-event'
  | 'other'

export interface CalendarEvent {
  id: string
  title: string
  shortTitle: string
  category: EventCategory
  date: string
  startTime: string
  endTime: string
  instructor: string
  location: string
  description: string
  notes: string
  registrationUrl?: string
  attachmentUrl?: string
  featured?: boolean
  visible: boolean
  showInWeeklyHighlights: boolean
}

export interface Company {
  code: string
  displayName: string
  displayOrder: number
  active: boolean
  note?: string
}

export interface WorkMonthRecord {
  year: number
  companyCode: string
  workMonth: string
  workMonthOrder: number
  startDate: string
  endDate: string
  settlementDate: string
  note?: string
}

export interface PaydayRecord {
  id: string
  year: number
  companyCode: string
  workMonth: string
  workMonthOrder: number | null
  payType: string
  payday: string
  displayText: string
  note?: string
}

export interface InsuranceCalendarData {
  companies: Company[]
  workMonths: WorkMonthRecord[]
  paydays: PaydayRecord[]
  years: number[]
}

export interface CalendarDataRepository {
  getEvents(): Promise<CalendarEvent[]>
}

import type { CalendarDataRepository } from '../types/calendar'
import { calendarEventService } from './calendarEventService'

/**
 * 保留原 repository 介面供既有引用相容；實際資料來源已切換至 Supabase。
 * 公司工作月仍由 excelReader.ts 獨立載入正式 Excel。
 */
export class SupabaseCalendarRepository implements CalendarDataRepository {
  async getEvents() {
    return calendarEventService.getVisibleEvents()
  }
}

export const calendarRepository: CalendarDataRepository =
  new SupabaseCalendarRepository()

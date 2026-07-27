export interface TaiwanHoliday {
  date: string
  name: string
  shortName?: string
  type: 'national-holiday'
}

/**
 * 資料來源：行政院人事行政總處「中華民國 115 年（西元 2026 年）
 * 政府行政機關辦公日曆表」及其紀念日、節日連續假期一覽表。
 * https://www.dgpa.gov.tw/information?pid=12685&uid=30
 *
 * 一般星期六、日由月曆既有週末樣式處理，不重複列入本資料。
 */
export const taiwanHolidays: readonly TaiwanHoliday[] = [
  {
    date: '2026-01-01',
    name: '中華民國開國紀念日（元旦）',
    shortName: '元旦',
    type: 'national-holiday',
  },
  {
    date: '2026-02-15',
    name: '除夕前一日',
    shortName: '春節連假',
    type: 'national-holiday',
  },
  {
    date: '2026-02-16',
    name: '農曆除夕',
    shortName: '除夕',
    type: 'national-holiday',
  },
  {
    date: '2026-02-17',
    name: '農曆春節',
    shortName: '春節',
    type: 'national-holiday',
  },
  {
    date: '2026-02-18',
    name: '農曆春節',
    shortName: '春節',
    type: 'national-holiday',
  },
  {
    date: '2026-02-19',
    name: '農曆春節',
    shortName: '春節',
    type: 'national-holiday',
  },
  {
    date: '2026-02-20',
    name: '除夕前一日補假',
    shortName: '春節補假',
    type: 'national-holiday',
  },
  {
    date: '2026-02-27',
    name: '和平紀念日補假',
    shortName: '和平紀念日補假',
    type: 'national-holiday',
  },
  {
    date: '2026-02-28',
    name: '和平紀念日',
    shortName: '和平紀念日',
    type: 'national-holiday',
  },
  {
    date: '2026-04-03',
    name: '兒童節補假',
    shortName: '兒童節補假',
    type: 'national-holiday',
  },
  {
    date: '2026-04-04',
    name: '兒童節',
    type: 'national-holiday',
  },
  {
    date: '2026-04-05',
    name: '清明節',
    type: 'national-holiday',
  },
  {
    date: '2026-04-06',
    name: '清明節補假',
    type: 'national-holiday',
  },
  {
    date: '2026-05-01',
    name: '勞動節',
    type: 'national-holiday',
  },
  {
    date: '2026-06-19',
    name: '端午節',
    type: 'national-holiday',
  },
  {
    date: '2026-09-25',
    name: '中秋節',
    type: 'national-holiday',
  },
  {
    date: '2026-09-28',
    name: '孔子誕辰紀念日／教師節',
    shortName: '教師節',
    type: 'national-holiday',
  },
  {
    date: '2026-10-09',
    name: '國慶日補假',
    type: 'national-holiday',
  },
  {
    date: '2026-10-10',
    name: '國慶日',
    type: 'national-holiday',
  },
  {
    date: '2026-10-25',
    name: '臺灣光復暨金門古寧頭大捷紀念日',
    shortName: '光復節',
    type: 'national-holiday',
  },
  {
    date: '2026-10-26',
    name: '臺灣光復暨金門古寧頭大捷紀念日補假',
    shortName: '光復節補假',
    type: 'national-holiday',
  },
  {
    date: '2026-12-25',
    name: '行憲紀念日',
    type: 'national-holiday',
  },
]

const holidaysByDate = new Map(
  taiwanHolidays.map((holiday) => [holiday.date, holiday]),
)

export function getTaiwanHoliday(date: string) {
  return holidaysByDate.get(date)
}

import type * as XlsxTypes from 'xlsx'
import type {
  Company,
  InsuranceCalendarData,
  PaydayRecord,
  WorkMonthRecord,
} from '../types/calendar'

const EXCEL_PATH = `${import.meta.env.BASE_URL}data/insurance-calendar.xlsx`
const REQUIRED_SHEETS = ['工作月結績', '發薪日', '公司設定'] as const

type ExcelValue = string | number | boolean | Date | null | undefined
type ExcelRecord = Record<string, ExcelValue>

let calendarPromise: Promise<InsuranceCalendarData> | null = null
type XlsxModule = typeof XlsxTypes

function text(value: ExcelValue) {
  return value == null ? '' : String(value).trim()
}

function number(value: ExcelValue, fieldName: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`${fieldName} 不是有效數字`)
  return parsed
}

/**
 * Excel 日期以序號拆成年、月、日字串，不經 JavaScript Date 時區轉換，
 * 避免部署地區不同造成日期前後偏移一天。
 */
function excelDate(value: ExcelValue, fieldName: string, XLSX: XlsxModule) {
  if (value == null || value === '') return ''

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) throw new Error(`${fieldName} 不是有效 Excel 日期`)
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`
  }

  if (value instanceof Date) {
    return [
      value.getUTCFullYear(),
      String(value.getUTCMonth() + 1).padStart(2, '0'),
      String(value.getUTCDate()).padStart(2, '0'),
    ].join('-')
  }

  const match = text(value).match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!match) throw new Error(`${fieldName} 必須使用真正的 Excel 日期格式`)
  return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
}

function records(
  workbook: XlsxTypes.WorkBook,
  sheetName: string,
  XLSX: XlsxModule,
) {
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) throw new Error(`Excel 缺少必要工作表：${sheetName}`)
  return XLSX.utils.sheet_to_json<ExcelRecord>(worksheet, {
    raw: true,
    defval: '',
  })
}

function validateHeaders(
  workbook: XlsxTypes.WorkBook,
  sheetName: string,
  expected: readonly string[],
  XLSX: XlsxModule,
) {
  const worksheet = workbook.Sheets[sheetName]
  const [headers = []] = XLSX.utils.sheet_to_json<ExcelValue[]>(worksheet, {
    header: 1,
    raw: true,
    defval: '',
  })
  const actual = headers.map(text)
  const missing = expected.filter((header) => !actual.includes(header))
  if (missing.length) {
    throw new Error(`${sheetName} 缺少欄位：${missing.join('、')}`)
  }
}

function parseWorkMonthOrder(value: ExcelValue, year: number) {
  const label = text(value)
  if (!label) return null
  if (label.includes(String(year - 1)) && label.includes('12')) return 0
  const match = label.match(/第(\d+)工作月/) ?? label.match(/(\d+)工作月$/)
  return match ? Number(match[1]) : null
}

async function readInsuranceCalendar(): Promise<InsuranceCalendarData> {
  const XLSX = await import('xlsx')
  let response: Response
  try {
    response = await fetch(EXCEL_PATH, { cache: 'no-store' })
  } catch {
    throw new Error(`無法連線讀取 Excel：${EXCEL_PATH}`)
  }

  if (!response.ok) {
    throw new Error(`Excel 載入失敗（HTTP ${response.status}）：${EXCEL_PATH}`)
  }

  let workbook: XlsxTypes.WorkBook
  try {
    workbook = XLSX.read(await response.arrayBuffer(), {
      type: 'array',
      cellDates: false,
    })
  } catch {
    throw new Error('insurance-calendar.xlsx 無法解析，請確認檔案格式正確')
  }

  for (const sheetName of REQUIRED_SHEETS) {
    if (!workbook.SheetNames.includes(sheetName)) {
      throw new Error(`Excel 缺少必要工作表：${sheetName}`)
    }
  }

  validateHeaders(workbook, '工作月結績', [
    '年度',
    '公司',
    '工作月',
    '工作月排序',
    '工作月開始日',
    '工作月結束日',
    '結績日',
    '備註',
  ], XLSX)
  validateHeaders(workbook, '發薪日', [
    '年度',
    '公司',
    '工作月',
    '發薪類型',
    '發薪日',
    '顯示文字',
    '備註',
  ], XLSX)
  validateHeaders(workbook, '公司設定', [
    '公司代碼',
    '顯示名稱',
    '顯示順序',
    '啟用',
    '備註',
  ], XLSX)

  const workMonths: WorkMonthRecord[] = records(workbook, '工作月結績', XLSX)
    .filter((row) => text(row['年度']) && text(row['公司']))
    .map((row, index) => ({
      year: number(row['年度'], `工作月結績第 ${index + 2} 列年度`),
      companyCode: text(row['公司']),
      workMonth: text(row['工作月']),
      workMonthOrder: number(
        row['工作月排序'],
        `工作月結績第 ${index + 2} 列工作月排序`,
      ),
      startDate: excelDate(
        row['工作月開始日'],
        `工作月結績第 ${index + 2} 列工作月開始日`,
        XLSX,
      ),
      endDate: excelDate(
        row['工作月結束日'],
        `工作月結績第 ${index + 2} 列工作月結束日`,
        XLSX,
      ),
      settlementDate: excelDate(
        row['結績日'],
        `工作月結績第 ${index + 2} 列結績日`,
        XLSX,
      ),
      note: text(row['備註']),
    }))

  const paydays: PaydayRecord[] = records(workbook, '發薪日', XLSX)
    .filter((row) => text(row['年度']) && text(row['發薪日']))
    .map((row, index) => {
      const year = number(row['年度'], `發薪日第 ${index + 2} 列年度`)
      return {
        id: `payday-${index + 1}`,
        year,
        companyCode: text(row['公司']),
        workMonth: text(row['工作月']),
        workMonthOrder: parseWorkMonthOrder(row['工作月'], year),
        payType: text(row['發薪類型']),
        payday: excelDate(
          row['發薪日'],
          `發薪日第 ${index + 2} 列發薪日`,
          XLSX,
        ),
        displayText: text(row['顯示文字']),
        note: text(row['備註']),
      }
    })

  const companies: Company[] = records(workbook, '公司設定', XLSX)
    .filter((row) => {
      const active = text(row['啟用']).toLowerCase()
      return ['是', 'true', '1', '啟用'].includes(active)
    })
    .map((row, index) => ({
      code: text(row['公司代碼']),
      displayName: text(row['顯示名稱']),
      displayOrder: number(
        row['顯示順序'],
        `公司設定第 ${index + 2} 列顯示順序`,
      ),
      active: true,
      note: text(row['備註']),
    }))
    .sort((a, b) => a.displayOrder - b.displayOrder)

  const years = [...new Set([
    ...workMonths.map((record) => record.year),
    ...paydays.map((record) => record.year),
  ])].sort((a, b) => a - b)

  if (!companies.length) throw new Error('公司設定沒有任何啟用中的公司')
  if (!workMonths.length) throw new Error('工作月結績沒有可用資料')

  return { companies, workMonths, paydays, years }
}

export function loadInsuranceCalendar(options?: { reload?: boolean }) {
  if (options?.reload) calendarPromise = null
  if (!calendarPromise) calendarPromise = readInsuranceCalendar()
  return calendarPromise
}

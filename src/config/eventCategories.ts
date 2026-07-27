import type { CSSProperties } from 'react'
import type { EventCategory } from '../types/calendar'

export interface EventCategoryConfig {
  key: EventCategory
  label: string
  colorName: string
  backgroundColor: string
  textColor: string
  borderColor: string
}

export const eventCategories: EventCategoryConfig[] = [
  {
    key: 'daily-training',
    label: '每日訓練',
    colorName: '天空藍',
    backgroundColor: '#e1f4fb',
    textColor: '#14739e',
    borderColor: '#47aad1',
  },
  {
    key: 'opp',
    label: 'OPP',
    colorName: '柔色紫',
    backgroundColor: '#eeeafd',
    textColor: '#6855a8',
    borderColor: '#8170bd',
  },
  {
    key: 'panrock',
    label: '磐石相關',
    colorName: '琥珀橘',
    backgroundColor: '#fff2d7',
    textColor: '#976519',
    borderColor: '#e4a944',
  },
  {
    key: 'course-seminar',
    label: '各類課程／講座',
    colorName: '海洋藍',
    backgroundColor: '#e4effb',
    textColor: '#2669a3',
    borderColor: '#4c8fc6',
  },
  {
    key: 'manager-meeting',
    label: '主管會議',
    colorName: '藍灰色',
    backgroundColor: '#e9eef2',
    textColor: '#526477',
    borderColor: '#76889a',
  },
  {
    key: 'unit-event',
    label: '單位活動',
    colorName: '玫瑰紅',
    backgroundColor: '#fae7ed',
    textColor: '#a04a61',
    borderColor: '#ca6c83',
  },
  {
    key: 'other',
    label: '其他',
    colorName: '青綠色',
    backgroundColor: '#def5f1',
    textColor: '#16796e',
    borderColor: '#39a899',
  },
]

export const eventCategoryByKey = Object.fromEntries(
  eventCategories.map((category) => [category.key, category]),
) as Record<EventCategory, EventCategoryConfig>

export function eventCategoryStyle(category: EventCategory): CSSProperties {
  const config = eventCategoryByKey[category]
  return {
    '--event-category-bg': config.backgroundColor,
    '--event-category-text': config.textColor,
    '--event-category-border': config.borderColor,
  } as CSSProperties
}

const legacyCategoryMap: Record<string, EventCategory> = {
  'morning-training': 'daily-training',
  opp: 'opp',
  marketing: 'panrock',
  product: 'course-seminar',
  investment: 'course-seminar',
  manager: 'manager-meeting',
  special: 'unit-event',
}

const legacyColorMap: Record<string, EventCategory> = {
  sky: 'daily-training',
  violet: 'opp',
  amber: 'panrock',
  blue: 'course-seminar',
  slate: 'manager-meeting',
  rose: 'unit-event',
  teal: 'other',
}

export function normalizeEventCategory(
  category: unknown,
  legacyColor?: unknown,
): EventCategory {
  if (typeof category === 'string') {
    if (category in eventCategoryByKey) return category as EventCategory
    if (category in legacyCategoryMap) return legacyCategoryMap[category]
  }
  if (typeof legacyColor === 'string' && legacyColor in legacyColorMap) {
    return legacyColorMap[legacyColor]
  }
  if (typeof legacyColor === 'string') {
    const normalizedColor = legacyColor.trim().toLowerCase()
    const matchedCategory = eventCategories.find((item) =>
      [item.backgroundColor, item.textColor, item.borderColor].some(
        (color) => color.toLowerCase() === normalizedColor,
      ),
    )
    if (matchedCategory) return matchedCategory.key
  }
  return 'other'
}

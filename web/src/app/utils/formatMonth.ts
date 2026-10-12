import { MONTHS } from '../config/constants'

/** Formats a 'YYYY-MM' month as 'Out/2026' (or 'Out/26' when `shortYear`). */
export function formatMonth(month: string, shortYear = false) {
  const [year, monthNumber] = month.split('-').map(Number)
  const yearLabel = shortYear ? String(year).slice(-2) : year

  return `${MONTHS[monthNumber - 1]}/${yearLabel}`
}

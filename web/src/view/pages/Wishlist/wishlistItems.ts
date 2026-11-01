import { WishlistItem, WishlistItemStatus } from '../../../app/entities/Wishlist'
import { formatDate } from '../../../app/utils/formatDate'
import { formatMonth } from '../../../app/utils/formatMonth'

export const ALL_LISTS = 'all'

/** The planned month, with the day when there is one: 'Nov/2026' or '15/11/2026'. */
export function formatPlanned(item: Pick<WishlistItem, 'plannedMonth' | 'plannedDay'>) {
  if (!item.plannedMonth) return 'sem data'

  if (item.plannedDay === null) return formatMonth(item.plannedMonth)

  const [year, month] = item.plannedMonth.split('-')

  return `${String(item.plannedDay).padStart(2, '0')}/${month}/${year}`
}

// Items with a date come first, the nearest first; inside a month the ones
// with a day come before the ones with only the month (R31).
function comparePlanned(a: WishlistItem, b: WishlistItem) {
  if (a.plannedMonth === null || b.plannedMonth === null) {
    return Number(a.plannedMonth === null) - Number(b.plannedMonth === null)
  }

  if (a.plannedMonth !== b.plannedMonth) return a.plannedMonth.localeCompare(b.plannedMonth)

  return (a.plannedDay ?? 32) - (b.plannedDay ?? 32)
}

const byName = (a: WishlistItem, b: WishlistItem) => a.name.localeCompare(b.name, 'pt-BR')

const compareByStatus: Record<WishlistItemStatus, (a: WishlistItem, b: WishlistItem) => number> = {
  ACTIVE: (a, b) => comparePlanned(a, b) || byName(a, b),
  // Most recent purchase first.
  PURCHASED: (a, b) => (b.paidDate ?? '').localeCompare(a.paidDate ?? '') || byName(a, b),
  GAVE_UP: (a, b) => b.createdAt.localeCompare(a.createdAt) || byName(a, b)
}

export function getVisibleItems(items: WishlistItem[], listId: string, status: WishlistItemStatus) {
  return items
    .filter(item => item.status === status && (listId === ALL_LISTS || item.wishlistId === listId))
    .sort(compareByStatus[status])
}

export function formatDateOf(iso: string) {
  return formatDate(new Date(iso))
}

/**
 * Opens a window from a menu item once the menu is gone. Opening it in the
 * same tick leaves `pointer-events: none` on the page when the window closes.
 */
export function afterMenuClose(action: () => void) {
  setTimeout(action, 0)
}

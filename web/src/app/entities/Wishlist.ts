export type WishlistItemStatus = 'ACTIVE' | 'PURCHASED' | 'GAVE_UP'

/** Key of the Geral list, which cannot be deleted (mirrors the API constant). */
export const GENERAL_WISHLIST_KEY = 'general'

export interface WishlistList {
  id: string
  name: string
  /** `GENERAL_WISHLIST_KEY` marks the Geral list. */
  key: string | null
}

export interface WishlistPrice {
  id: string
  value: number
  recordedOn: string
  createdAt: string
}

export interface WishlistLink {
  id: string
  url: string
  storeName: string
  createdAt: string
  currentPrice: number | null
  currentRecordedOn: string | null
  /** Change of the current price against the first record. */
  variation: number | null
  /** Oldest first. */
  prices: WishlistPrice[]
}

export interface WishlistLowestPrice {
  value: number
  storeName: string
  recordedOn: string
}

export interface WishlistItem {
  id: string
  name: string
  wishlistId: string
  status: WishlistItemStatus
  category: {
    id: string
    name: string
    key: string | null
    parentId: string | null
    icon: string | null
  } | null
  /** 'YYYY-MM'. */
  plannedMonth: string | null
  plannedDay: number | null
  nextReminder: string | null
  paidValue: number | null
  paidDate: string | null
  createdAt: string
  lowestPrice: WishlistLowestPrice | null
  links: WishlistLink[]
}

export interface WishlistReminder extends WishlistItem {
  wishlistName: string
}

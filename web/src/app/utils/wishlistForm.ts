import { z } from 'zod'
import {
  WishlistItemParams,
  WishlistLinkParams,
  WishlistListParams
} from '../services/wishlistService'
import { currencyStringToNumber } from './currencyStringToNumber'
import { MONTH_PATTERN, integerBetween } from './debtForm'
import { positiveCurrency } from './goalForm'
import { getMonthKey, toGoalsCalendarDate } from './goalPlanning'

const DAY_MESSAGE = 'Informe um dia entre 1 e 31'

export const wishlistListFormSchema = z.object({
  name: z.string().trim().nonempty('Informe o nome da lista')
})

export type WishlistListFormData = z.infer<typeof wishlistListFormSchema>

export function toWishlistListParams(data: WishlistListFormData): WishlistListParams {
  return { name: data.name.trim() }
}

export const wishlistItemFormSchema = z.object({
  name: z.string().trim().nonempty('Informe o nome do item'),
  wishlistId: z.string(),
  categoryId: z.string(),
  // The native month input gives 'YYYY-MM', or '' when empty.
  plannedMonth: z.union([z.literal(''), z.string().regex(MONTH_PATTERN, 'Informe um mês válido')]),
  plannedDay: z.union([z.literal(''), integerBetween(1, 31, DAY_MESSAGE)])
}).superRefine((data, ctx) => {
  if (data.plannedDay !== '' && data.plannedMonth === '') {
    ctx.addIssue({
      code: 'custom',
      path: ['plannedDay'],
      message: 'Informe o mês para definir o dia'
    })
  }
})

export type WishlistItemFormData = z.infer<typeof wishlistItemFormSchema>

export function toWishlistItemParams(data: WishlistItemFormData): WishlistItemParams {
  const hasMonth = data.plannedMonth !== ''

  return {
    name: data.name.trim(),
    ...(data.wishlistId && { wishlistId: data.wishlistId }),
    ...(data.categoryId && { categoryId: data.categoryId }),
    ...(hasMonth && { plannedMonth: data.plannedMonth }),
    ...(hasMonth && data.plannedDay !== '' && { plannedDay: data.plannedDay })
  }
}

const isHttpUrl = (value: string) => {
  try {
    const { protocol } = new URL(value)

    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export const wishlistLinkFormSchema = z.object({
  url: z.string().trim()
    .nonempty('Informe o endereço da página')
    .refine(isHttpUrl, 'Informe um endereço http ou https'),
  storeName: z.string().trim().nonempty('Informe o nome da loja')
})

export type WishlistLinkFormData = z.infer<typeof wishlistLinkFormSchema>

export function toWishlistLinkParams(data: WishlistLinkFormData): WishlistLinkParams {
  return {
    url: data.url.trim(),
    storeName: data.storeName.trim()
  }
}

export const wishlistPriceFormSchema = z.object({
  value: positiveCurrency('Informe o preço', 'O preço deve ser maior que zero')
})

export type WishlistPriceFormData = z.infer<typeof wishlistPriceFormSchema>

export function toWishlistPriceParams(data: WishlistPriceFormData) {
  return { value: currencyStringToNumber(data.value) }
}

/** The suggested store name for an address: its domain without a leading `www.`. */
export function getStoreNameFromUrl(url: string) {
  try {
    return new URL(url.trim()).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * The month Adiar suggests, as 'YYYY-MM': the one after the later of the
 * planned month and the current month. `today` is an instant (`new Date()`);
 * the current month is the one in São Paulo.
 */
export function getPostponeSuggestion(plannedMonth: string | null, today: Date) {
  const currentKey = getMonthKey(toGoalsCalendarDate(today))
  let laterKey = currentKey

  if (plannedMonth) {
    const [year, month] = plannedMonth.split('-').map(Number)
    laterKey = Math.max(currentKey, year * 12 + month - 1)
  }

  const nextKey = laterKey + 1

  return `${Math.floor(nextKey / 12)}-${String((nextKey % 12) + 1).padStart(2, '0')}`
}

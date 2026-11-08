import {
  WishlistItem,
  WishlistLink,
  WishlistList,
  WishlistPrice,
  WishlistReminder
} from '../entities/Wishlist'
import { httpClient } from './httpClient'

export interface WishlistListParams {
  name: string
}

export interface UpdateWishlistListParams extends WishlistListParams {
  id: string
}

export interface WishlistItemParams {
  name: string
  wishlistId?: string
  categoryId?: string
  /** 'YYYY-MM'. */
  plannedMonth?: string
  /** Only with a planned month. */
  plannedDay?: number
}

export interface UpdateWishlistItemParams extends WishlistItemParams {
  id: string
}

export interface WishlistLinkParams {
  url: string
  storeName: string
}

export interface CreateWishlistLinkParams extends WishlistLinkParams {
  itemId: string
}

export interface UpdateWishlistLinkParams extends WishlistLinkParams {
  id: string
}

export interface WishlistPriceParams {
  linkId: string
  value: number
}

export interface PurchaseWishlistItemParams {
  itemId: string
  paidValue: number
  /** ISO date, a calendar day at noon UTC. */
  paidDate: string
}

export interface PostponeWishlistItemParams {
  itemId: string
  plannedMonth: string
  plannedDay?: number
}

export async function getLists() {
  const { data } = await httpClient.get<WishlistList[]>('/wishlist/lists')
  return data
}

export async function createList(params: WishlistListParams) {
  const { data } = await httpClient.post<WishlistList>('/wishlist/lists', params)
  return data
}

export async function updateList({ id, ...params }: UpdateWishlistListParams) {
  const { data } = await httpClient.put<WishlistList>(`/wishlist/lists/${id}`, params)
  return data
}

export async function removeList(listId: string) {
  const { data } = await httpClient.delete(`/wishlist/lists/${listId}`)
  return data
}

export async function getItems() {
  const { data } = await httpClient.get<WishlistItem[]>('/wishlist/items')
  return data
}

export async function createItem(params: WishlistItemParams) {
  const { data } = await httpClient.post<WishlistItem>('/wishlist/items', params)
  return data
}

export async function updateItem({ id, ...params }: UpdateWishlistItemParams) {
  const { data } = await httpClient.put<WishlistItem>(`/wishlist/items/${id}`, params)
  return data
}

export async function removeItem(itemId: string) {
  const { data } = await httpClient.delete(`/wishlist/items/${itemId}`)
  return data
}

export async function createLink({ itemId, ...params }: CreateWishlistLinkParams) {
  const { data } = await httpClient.post<WishlistLink>(`/wishlist/items/${itemId}/links`, params)
  return data
}

export async function updateLink({ id, ...params }: UpdateWishlistLinkParams) {
  const { data } = await httpClient.put<WishlistLink>(`/wishlist/links/${id}`, params)
  return data
}

export async function removeLink(linkId: string) {
  const { data } = await httpClient.delete(`/wishlist/links/${linkId}`)
  return data
}

export async function addPrice({ linkId, ...params }: WishlistPriceParams) {
  const { data } = await httpClient.post<WishlistPrice>(`/wishlist/links/${linkId}/prices`, params)
  return data
}

export async function removePrice(priceId: string) {
  const { data } = await httpClient.delete(`/wishlist/prices/${priceId}`)
  return data
}

export async function getReminders() {
  const { data } = await httpClient.get<WishlistReminder[]>('/wishlist/reminders')
  return data
}

export async function purchase({ itemId, ...params }: PurchaseWishlistItemParams) {
  const { data } = await httpClient.post<WishlistItem>(`/wishlist/items/${itemId}/purchase`, params)
  return data
}

export async function giveUp(itemId: string) {
  const { data } = await httpClient.post<WishlistItem>(`/wishlist/items/${itemId}/give-up`)
  return data
}

export async function reactivate(itemId: string) {
  const { data } = await httpClient.post<WishlistItem>(`/wishlist/items/${itemId}/reactivate`)
  return data
}

export async function keep(itemId: string) {
  const { data } = await httpClient.post<WishlistItem>(`/wishlist/items/${itemId}/keep`)
  return data
}

export async function postpone({ itemId, ...params }: PostponeWishlistItemParams) {
  const { data } = await httpClient.post<WishlistItem>(`/wishlist/items/${itemId}/postpone`, params)
  return data
}

export const wishlistService = {
  getLists,
  createList,
  updateList,
  removeList,
  getItems,
  createItem,
  updateItem,
  removeItem,
  createLink,
  updateLink,
  removeLink,
  addPrice,
  removePrice,
  getReminders,
  purchase,
  giveUp,
  reactivate,
  keep,
  postpone
}

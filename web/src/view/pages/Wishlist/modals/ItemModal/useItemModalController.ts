import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { WishlistItem, WishlistList } from '../../../../../app/entities/Wishlist'
import { useCategories } from '../../../../../app/hooks/useCategories'
import { wishlistService } from '../../../../../app/services/wishlistService'
import { getCategoryOptions } from '../../../../../app/utils/categories'
import {
  WishlistItemFormData,
  toWishlistItemParams,
  wishlistItemFormSchema
} from '../../../../../app/utils/wishlistForm'

/** The select cannot hold an empty value, so "no category" has its own. */
export const NO_CATEGORY = 'none'

export function useItemModalController(
  lists: WishlistList[],
  item: WishlistItem | undefined,
  defaultListId: string | undefined,
  onClose: () => void,
  onSaved?: (item: WishlistItem) => void
) {
  const { categories } = useCategories()

  const {
    register,
    setValue,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control
  } = useForm<WishlistItemFormData>({
    resolver: zodResolver(wishlistItemFormSchema),
    defaultValues: {
      name: item?.name ?? '',
      wishlistId: item?.wishlistId ?? defaultListId ?? lists.find(list => list.key === 'general')?.id ?? '',
      categoryId: item?.category?.id ?? '',
      plannedMonth: item?.plannedMonth ?? '',
      plannedDay: item?.plannedDay ?? ''
    }
  })

  const plannedMonth = useWatch({ control, name: 'plannedMonth' })

  // An item without a month has no day either (R6).
  useEffect(() => {
    if (!plannedMonth) setValue('plannedDay', '')
  }, [plannedMonth, setValue])

  const categoryOptions = [
    { value: NO_CATEGORY, label: 'Sem categoria' },
    ...getCategoryOptions(categories, 'EXPENSE', item?.category?.id)
  ]

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(async (data: WishlistItemFormData) => {
    const params = toWishlistItemParams(data)

    return item
      ? wishlistService.updateItem({ id: item.id, ...params })
      : wishlistService.createItem(params)
  })

  const handleSubmit = hookFormSubmit(async data => {
    try {
      const saved = await mutateAsync(data)

      await queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      toast.success(item ? 'Item atualizado!' : 'Item criado com sucesso!')
      onSaved?.(saved)
      onClose()
    } catch {
      toast.error(item ? 'Erro ao atualizar o item!' : 'Erro ao criar o item!')
    }
  })

  return {
    register,
    control,
    errors,
    handleSubmit,
    isLoading,
    hasMonth: plannedMonth !== '',
    categoryOptions,
    listOptions: lists.map(list => ({ value: list.id, label: list.name }))
  }
}

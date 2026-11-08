import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { WishlistList } from '../../../../../app/entities/Wishlist'
import { wishlistService } from '../../../../../app/services/wishlistService'
import {
  WishlistListFormData,
  toWishlistListParams,
  wishlistListFormSchema
} from '../../../../../app/utils/wishlistForm'

export function useListModalController(
  list: WishlistList | undefined,
  onClose: () => void,
  onSaved?: (list: WishlistList) => void
) {
  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit
  } = useForm<WishlistListFormData>({
    resolver: zodResolver(wishlistListFormSchema),
    defaultValues: { name: list?.name ?? '' }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(async (data: WishlistListFormData) => {
    const params = toWishlistListParams(data)

    return list
      ? wishlistService.updateList({ id: list.id, ...params })
      : wishlistService.createList(params)
  })

  const handleSubmit = hookFormSubmit(async data => {
    try {
      const saved = await mutateAsync(data)

      await queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      toast.success(list ? 'Lista renomeada!' : 'Lista criada com sucesso!')
      onSaved?.(saved)
      onClose()
    } catch {
      toast.error(list ? 'Erro ao renomear a lista!' : 'Erro ao criar a lista!')
    }
  })

  return { register, errors, handleSubmit, isLoading }
}

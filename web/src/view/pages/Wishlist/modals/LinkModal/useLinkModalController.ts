import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { WishlistLink } from '../../../../../app/entities/Wishlist'
import { wishlistService } from '../../../../../app/services/wishlistService'
import {
  WishlistLinkFormData,
  getStoreNameFromUrl,
  toWishlistLinkParams,
  wishlistLinkFormSchema
} from '../../../../../app/utils/wishlistForm'

export function useLinkModalController(itemId: string, link: WishlistLink | undefined, onClose: () => void) {
  const {
    register,
    setValue,
    getFieldState,
    formState: { errors },
    handleSubmit: hookFormSubmit
  } = useForm<WishlistLinkFormData>({
    resolver: zodResolver(wishlistLinkFormSchema),
    defaultValues: { url: link?.url ?? '', storeName: link?.storeName ?? '' }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(async (data: WishlistLinkFormData) => {
    const params = toWishlistLinkParams(data)

    return link
      ? wishlistService.updateLink({ id: link.id, ...params })
      : wishlistService.createLink({ itemId, ...params })
  })

  // The store name follows the domain of the address until the user types their own (KTD12).
  const urlField = register('url', {
    onChange: event => {
      if (!link && !getFieldState('storeName').isDirty) {
        setValue('storeName', getStoreNameFromUrl(event.target.value))
      }
    }
  })

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync(data)

      await queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      toast.success(link ? 'Link atualizado!' : 'Link adicionado!')
      onClose()
    } catch {
      toast.error(link ? 'Erro ao atualizar o link!' : 'Erro ao adicionar o link!')
    }
  })

  return { register, urlField, errors, handleSubmit, isLoading }
}

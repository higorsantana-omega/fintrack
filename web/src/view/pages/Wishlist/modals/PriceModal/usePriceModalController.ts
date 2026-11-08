import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { wishlistService } from '../../../../../app/services/wishlistService'
import {
  WishlistPriceFormData,
  toWishlistPriceParams,
  wishlistPriceFormSchema
} from '../../../../../app/utils/wishlistForm'

export function usePriceModalController(linkId: string, onClose: () => void) {
  const {
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control
  } = useForm<WishlistPriceFormData>({
    resolver: zodResolver(wishlistPriceFormSchema),
    defaultValues: { value: '0,00' }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(wishlistService.addPrice)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync({ linkId, ...toWishlistPriceParams(data) })

      await queryClient.invalidateQueries({ queryKey: ['wishlist'] })
      toast.success('Preço registrado!')
      onClose()
    } catch {
      toast.error('Erro ao registrar o preço!')
    }
  })

  return { errors, control, handleSubmit, isLoading }
}

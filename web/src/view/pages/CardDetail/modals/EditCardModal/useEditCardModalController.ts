import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { CreditCard } from '../../../../../app/entities/CreditCard'
import { cardsService } from '../../../../../app/services/cardsService'
import { CardFormData, cardFormSchema, toCardParams } from '../../../../../app/utils/cardForm'

export function useEditCardModalController(card: CreditCard, onClose: () => void) {
  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control
  } = useForm<CardFormData>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: {
      name: card.name,
      color: card.color,
      limit: card.limit.total,
      closingDay: card.closingDay,
      dueDay: card.dueDay
    }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(cardsService.update)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync({ id: card.id, ...toCardParams(data) })

      queryClient.invalidateQueries({ queryKey: ['cards'] })
      toast.success('Cartão atualizado!')
      onClose()
    } catch {
      toast.error('Erro ao salvar o cartão!')
    }
  })

  return { register, errors, control, handleSubmit, isLoading }
}

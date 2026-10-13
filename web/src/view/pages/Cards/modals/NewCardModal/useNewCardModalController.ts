import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { cardsService } from '../../../../../app/services/cardsService'
import { CardFormData, cardFormSchema, toCardParams } from '../../../../../app/utils/cardForm'

export function useNewCardModalController(onClose: () => void) {
  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control
  } = useForm<CardFormData>({
    resolver: zodResolver(cardFormSchema),
    defaultValues: { name: '', color: '', limit: '0,00' }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(cardsService.create)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync(toCardParams(data))

      queryClient.invalidateQueries({ queryKey: ['cards'] })
      toast.success('Cartão cadastrado com sucesso!')
      onClose()
    } catch {
      toast.error('Erro ao cadastrar o cartão!')
    }
  })

  return { register, errors, control, handleSubmit, isLoading }
}

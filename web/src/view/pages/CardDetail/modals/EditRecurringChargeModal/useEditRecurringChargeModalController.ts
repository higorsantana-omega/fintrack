import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { RecurringCharge } from '../../../../../app/entities/CreditCard'
import { useCategories } from '../../../../../app/hooks/useCategories'
import { cardsService } from '../../../../../app/services/cardsService'
import { getCategoryOptions } from '../../../../../app/utils/categories'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import { positiveCurrency } from '../../../../../app/utils/goalForm'

const schema = z.object({
  description: z.string().nonempty('Informe a descrição'),
  value: positiveCurrency('Informe o valor', 'Informe um valor maior que zero'),
  categoryId: z.string().nonempty('Informe a categoria')
})

type FormData = z.infer<typeof schema>

export function useEditRecurringChargeModalController(
  cardId: string,
  recurringCharge: RecurringCharge,
  onClose: () => void
) {
  const { categories } = useCategories()

  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: recurringCharge.description,
      value: recurringCharge.value,
      categoryId: recurringCharge.category?.id ?? ''
    }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(cardsService.updateRecurringCharge)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync({
        cardId,
        recurringChargeId: recurringCharge.id,
        description: data.description,
        value: currencyStringToNumber(data.value),
        categoryId: data.categoryId
      })

      queryClient.invalidateQueries({ queryKey: ['cards'] })
      toast.success('Recorrente atualizada!')
      onClose()
    } catch {
      toast.error('Erro ao salvar a recorrente!')
    }
  })

  return {
    register,
    errors,
    control,
    handleSubmit,
    isLoading,
    categories: getCategoryOptions(categories, 'EXPENSE', recurringCharge.category?.id)
  }
}

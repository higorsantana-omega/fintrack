import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BorrowerDetail } from '../../../../../app/entities/Borrower'
import { borrowersService } from '../../../../../app/services/borrowersService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import { BorrowerFormData, borrowerFormSchema, toBorrowerParams } from '../../../../../app/utils/debtForm'

export function useEditBorrowerModalController(borrower: BorrowerDetail, onClose: () => void) {
  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control,
    setError
  } = useForm<BorrowerFormData>({
    resolver: zodResolver(borrowerFormSchema),
    defaultValues: {
      name: borrower.name,
      openingBalance: borrower.openingBalance
    }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(borrowersService.update)

  const handleSubmit = hookFormSubmit(async data => {
    if (currencyStringToNumber(data.openingBalance) < 0) {
      setError('openingBalance', { message: 'O saldo anterior não pode ser negativo' })
      return
    }

    try {
      await mutateAsync({ id: borrower.id, ...toBorrowerParams(data) })

      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Pessoa atualizada!')
      onClose()
    } catch {
      toast.error('Erro ao salvar a pessoa!')
    }
  })

  return { register, errors, control, handleSubmit, isLoading }
}

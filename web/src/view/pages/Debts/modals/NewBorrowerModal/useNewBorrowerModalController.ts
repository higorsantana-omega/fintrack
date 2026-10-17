import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { borrowersService } from '../../../../../app/services/borrowersService'
import { BorrowerFormData, borrowerFormSchema, toBorrowerParams } from '../../../../../app/utils/debtForm'

export function useNewBorrowerModalController(onClose: () => void) {
  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control
  } = useForm<BorrowerFormData>({
    resolver: zodResolver(borrowerFormSchema),
    defaultValues: { name: '', openingBalance: '0,00' }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(borrowersService.create)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync(toBorrowerParams(data))

      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Pessoa cadastrada com sucesso!')
      onClose()
    } catch {
      toast.error('Erro ao cadastrar a pessoa!')
    }
  })

  return { register, errors, control, handleSubmit, isLoading }
}

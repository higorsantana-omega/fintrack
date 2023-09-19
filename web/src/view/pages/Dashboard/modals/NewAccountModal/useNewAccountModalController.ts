import { z } from 'zod'
import { useDashboard } from '../../components/DashboardContext/useDashboard'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bankAccountsService } from '../../../../../app/services/bankAccountsService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import toast from 'react-hot-toast'

const schema = z.object({
  initialBalance: z.string().nonempty('Saldo inicial eh obrigatorio'),
  name: z.string().nonempty('Nome da conta eh obrigatorio'),
  type: z.enum(['INVESTMENT', 'CASH', 'CHECKING']),
  color: z.string().nonempty('cor eh obrigatorio')
})

type FormData = z.infer<typeof schema>

export function useNewAccountModalController() {
  const {
    toggleCloseNewAccountModal,
    isNewAccountModalOpen
  } = useDashboard()

  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control,
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(bankAccountsService.create)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync({
        ...data,
        initialBalance: currencyStringToNumber(data.initialBalance)
      })

      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      toast.success('Conta cadastrada com sucesso.')
      toggleCloseNewAccountModal()
      reset()
    } catch {
      toast.error('Erro ao cadastrar a conta')
    }
  })

  return { toggleCloseNewAccountModal, isNewAccountModalOpen, register, errors, handleSubmit, control, isLoading }
}
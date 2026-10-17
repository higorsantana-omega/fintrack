import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BorrowerMovementKind } from '../../../../../app/entities/Borrower'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts'
import { borrowersService } from '../../../../../app/services/borrowersService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import { formatCurrency } from '../../../../../app/utils/formatCurrency'
import { getApiErrorPayload } from '../../../../../app/utils/getApiErrorPayload'
import { positiveCurrency, toCalendarNoonIso } from '../../../../../app/utils/goalForm'
import { invalidateMoneyQueries } from '../../../../../app/utils/invalidateMoneyQueries'

const schema = z.object({
  bankAccountId: z.string().nonempty('Informe a conta'),
  value: positiveCurrency('Informe o valor', 'Informe um valor maior que zero'),
  date: z.date()
})

type FormData = z.infer<typeof schema>

export function useBorrowerMovementModalController(
  borrowerId: string,
  kind: BorrowerMovementKind,
  onClose: () => void
) {
  const {
    handleSubmit: hookFormSubmit,
    formState: { errors },
    control,
    setError
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bankAccountId: '',
      value: '0,00',
      date: new Date()
    }
  })

  const { accounts } = useBankAccounts()
  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(borrowersService.createMovement)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync({
        borrowerId,
        kind,
        bankAccountId: data.bankAccountId,
        value: currencyStringToNumber(data.value),
        date: toCalendarNoonIso(data.date)
      })

      invalidateMoneyQueries(queryClient)
      toast.success(kind === 'LEND' ? 'Empréstimo registrado!' : 'Devolução registrada!')
      onClose()
    } catch (error) {
      const { status, maxReturn } = getApiErrorPayload(error)

      if (kind === 'RETURN' && status === 409 && maxReturn !== undefined) {
        setError('value', { message: `O máximo é ${formatCurrency(maxReturn)}` })
        return
      }

      toast.error(kind === 'LEND' ? 'Erro ao registrar o empréstimo!' : 'Erro ao registrar a devolução!')
    }
  })

  return { accounts, control, errors, handleSubmit, isLoading }
}

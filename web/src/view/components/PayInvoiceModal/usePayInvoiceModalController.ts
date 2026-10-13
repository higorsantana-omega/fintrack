import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useBankAccounts } from '../../../app/hooks/useBankAccounts'
import { cardsService } from '../../../app/services/cardsService'
import { currencyStringToNumber } from '../../../app/utils/currencyStringToNumber'
import { positiveCurrency, toCalendarNoonIso } from '../../../app/utils/goalForm'
import { invalidateMoneyQueries } from '../../../app/utils/invalidateMoneyQueries'
import { PayInvoiceTarget } from './PayInvoiceContext'

const schema = z.object({
  bankAccountId: z.string().nonempty('Informe a conta'),
  value: positiveCurrency('Informe o valor', 'Informe um valor maior que zero'),
  date: z.date()
})

type FormData = z.infer<typeof schema>

export function usePayInvoiceModalController(target: PayInvoiceTarget, onPaid: () => void) {
  const { accounts } = useBankAccounts()

  const {
    handleSubmit: hookFormSubmit,
    formState: { errors },
    control
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bankAccountId: target.lastPaymentBankAccountId ?? '',
      value: target.balance,
      date: new Date()
    }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(cardsService.payInvoice)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync({
        cardId: target.cardId,
        month: target.month,
        bankAccountId: data.bankAccountId,
        value: currencyStringToNumber(data.value),
        date: toCalendarNoonIso(data.date)
      })

      invalidateMoneyQueries(queryClient)
      toast.success('Pagamento registrado!')
      onPaid()
    } catch {
      toast.error('Erro ao registrar o pagamento!')
    }
  })

  return { accounts, control, errors, handleSubmit, isLoading }
}

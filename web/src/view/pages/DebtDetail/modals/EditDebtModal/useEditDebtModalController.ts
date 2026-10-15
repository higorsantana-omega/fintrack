import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { DebtDetail } from '../../../../../app/entities/Debt'
import { debtsService } from '../../../../../app/services/debtsService'
import { MAX_DEBT_INSTALLMENTS, MONTH_PATTERN, integerBetween } from '../../../../../app/utils/debtForm'
import { getApiErrorPayload } from '../../../../../app/utils/getApiErrorPayload'

const editDebtSchema = z.object({
  name: z.string().nonempty('Informe o nome da dívida'),
  dueDay: integerBetween(1, 31, 'Informe um dia entre 1 e 31'),
  installmentsCount: integerBetween(1, MAX_DEBT_INSTALLMENTS, `Informe de 1 a ${MAX_DEBT_INSTALLMENTS} parcelas`),
  nextInstallment: z.coerce.number()
    .int('Informe a próxima parcela')
    .min(1, 'Informe a próxima parcela'),
  nextInstallmentMonth: z.string().regex(MONTH_PATTERN, 'Informe o mês da próxima parcela')
}).superRefine((data, ctx) => {
  if (data.nextInstallment > data.installmentsCount) {
    ctx.addIssue({
      code: 'custom',
      path: ['nextInstallment'],
      message: 'A próxima parcela não pode passar do total de parcelas'
    })
  }
})

type EditDebtFormData = z.infer<typeof editDebtSchema>

export function useEditDebtModalController(debt: DebtDetail, onClose: () => void) {
  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit
  } = useForm<EditDebtFormData>({
    resolver: zodResolver(editDebtSchema),
    defaultValues: {
      name: debt.name,
      dueDay: debt.dueDay,
      installmentsCount: debt.registration.installmentsCount,
      nextInstallment: debt.registration.nextInstallment,
      nextInstallmentMonth: debt.registration.nextInstallmentMonth
    }
  })

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(debtsService.update)

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync({
        id: debt.id,
        name: data.name,
        dueDay: data.dueDay,
        ...(!debt.hasPayment && {
          installmentsCount: data.installmentsCount,
          nextInstallment: data.nextInstallment,
          nextInstallmentMonth: data.nextInstallmentMonth
        })
      })

      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Dívida atualizada!')
      onClose()
    } catch (error) {
      if (getApiErrorPayload(error).status !== 409) {
        toast.error('Erro ao salvar a dívida!')
        return
      }

      // A payment registered elsewhere locks the plan fields (R12); reload the debt.
      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.error('Esta dívida já tem pagamento registrado. A página foi atualizada.')
    }
  })

  return { register, errors, handleSubmit, isLoading }
}

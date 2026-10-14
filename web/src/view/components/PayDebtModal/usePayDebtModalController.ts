import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DebtDetail, DebtInstallment } from '../../../app/entities/Debt'
import { useBankAccounts } from '../../../app/hooks/useBankAccounts'
import { debtsService } from '../../../app/services/debtsService'
import { currencyStringToNumber } from '../../../app/utils/currencyStringToNumber'
import { getApiErrorPayload } from '../../../app/utils/getApiErrorPayload'
import { positiveCurrency, toCalendarNoonIso } from '../../../app/utils/goalForm'
import { invalidateMoneyQueries } from '../../../app/utils/invalidateMoneyQueries'

const schema = z.object({
  bankAccountId: z.string().nonempty('Informe a conta'),
  value: positiveCurrency('Informe o valor', 'Informe um valor maior que zero'),
  date: z.date()
})

type FormData = z.infer<typeof schema>

const CONFLICT_MESSAGE = 'Alguma parcela marcada já foi paga. A lista foi atualizada: confira a seleção.'

// The expected sum is added in integer cents and converted back once, so
// floats like 2550.9900000000002 never reach the API.
function sumExpectedValues(installments: DebtInstallment[]) {
  const cents = installments.reduce((sum, { expectedValue }) => sum + Math.round(expectedValue * 100), 0)

  return cents / 100
}

function isOpen(installment: DebtInstallment) {
  return installment.state === 'OPEN' || installment.state === 'OVERDUE'
}

function getYear(installment: DebtInstallment) {
  return installment.month.slice(0, 4)
}

export function usePayDebtModalController(debt: DebtDetail, initialNumbers: number[], onPaid: () => void) {
  const { accounts } = useBankAccounts()
  const queryClient = useQueryClient()
  const [selectedNumbers, setSelectedNumbers] = useState(initialNumbers)
  const [lastCount, setLastCount] = useState('1')
  const [isValueEdited, setIsValueEdited] = useState(false)
  const [toggledYears, setToggledYears] = useState<Record<string, boolean>>({})
  const [hasConflict, setHasConflict] = useState(false)

  const openInstallments = debt.installments.filter(isOpen)
  // After a refetch, a number paid elsewhere drops out of the selection.
  const selected = openInstallments.filter(({ number }) => selectedNumbers.includes(number))
  const expectedSum = sumExpectedValues(selected)

  const {
    handleSubmit: hookFormSubmit,
    formState: { errors },
    control,
    setValue
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bankAccountId: debt.lastPaymentBankAccountId ?? '',
      value: expectedSum,
      date: new Date()
    }
  })

  const { isLoading, mutateAsync } = useMutation(debtsService.pay)

  // The value follows the marked installments until the user edits it.
  useEffect(() => {
    if (!isValueEdited) setValue('value', expectedSum)
  }, [expectedSum, isValueEdited, setValue])

  const currentYear = String(new Date().getFullYear())
  const years = [...new Set(openInstallments.map(getYear))].map(year => {
    const installments = openInstallments.filter(installment => getYear(installment) === year)

    return {
      year,
      installments,
      selectedCount: installments.filter(({ number }) => selectedNumbers.includes(number)).length,
      isExpanded: toggledYears[year] ?? (
        year === currentYear ||
        installments.some(({ number, state }) => state === 'OVERDUE' || initialNumbers.includes(number))
      )
    }
  })

  function changeSelection(numbers: number[]) {
    setSelectedNumbers(numbers)
    setHasConflict(false)
  }

  function selectShortcut(numbers: number[]) {
    const marked = openInstallments.filter(({ number }) => numbers.includes(number))

    // The marked installments must be in view.
    setToggledYears(previous => ({
      ...previous,
      ...Object.fromEntries(marked.map(installment => [getYear(installment), true]))
    }))
    changeSelection(marked.map(({ number }) => number))
  }

  function toggleInstallment(number: number) {
    changeSelection(
      selected.some(installment => installment.number === number)
        ? selected.filter(installment => installment.number !== number).map(installment => installment.number)
        : [...selected.map(installment => installment.number), number]
    )
  }

  function toggleYear(year: string, isExpanded: boolean) {
    setToggledYears(previous => ({ ...previous, [year]: !isExpanded }))
  }

  const lastCountNumber = Number(lastCount)
  const isLastCountValid = Number.isInteger(lastCountNumber) &&
    lastCountNumber >= 1 &&
    lastCountNumber <= openInstallments.length

  const shortcuts = [
    { id: 'month', label: 'Só a do mês', numbers: debt.shortcuts.currentMonth },
    { id: 'overdue', label: 'Atrasadas + a do mês', numbers: debt.shortcuts.overdueAndCurrentMonth },
    { id: 'all', label: 'Todas', numbers: openInstallments.map(({ number }) => number) }
  ].map(({ id, label, numbers }) => ({
    id,
    label,
    disabled: numbers.length === 0,
    onSelect: () => selectShortcut(numbers)
  }))

  const lastShortcut = {
    count: lastCount,
    isDisabled: !isLastCountValid,
    onCountChange: setLastCount,
    onSelect: () => selectShortcut(
      openInstallments.map(({ number }) => number).sort((a, b) => b - a).slice(0, lastCountNumber)
    )
  }

  function handleValueChange(onChange: (value: string) => void) {
    return (value: string) => {
      setIsValueEdited(true)
      onChange(value)
    }
  }

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync({
        debtId: debt.id,
        installmentNumbers: selected.map(({ number }) => number),
        bankAccountId: data.bankAccountId,
        value: currencyStringToNumber(data.value),
        date: toCalendarNoonIso(data.date)
      })

      invalidateMoneyQueries(queryClient)
      toast.success('Pagamento registrado!')
      onPaid()
    } catch (error) {
      if (getApiErrorPayload(error).status === 409) {
        setHasConflict(true)
        queryClient.invalidateQueries({ queryKey: ['debts'] })
        return
      }

      toast.error('Erro ao registrar o pagamento!')
    }
  })

  return {
    accounts,
    control,
    errors,
    handleSubmit,
    isLoading,
    openInstallments,
    selected,
    expectedSum,
    years,
    shortcuts,
    lastShortcut,
    conflictMessage: hasConflict ? CONFLICT_MESSAGE : null,
    toggleInstallment,
    toggleYear,
    handleValueChange
  }
}

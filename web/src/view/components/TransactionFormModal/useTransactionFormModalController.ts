import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useBankAccounts } from '../../../app/hooks/useBankAccounts'
import { useCategories } from '../../../app/hooks/useCategories'
import { transactionsService } from '../../../app/services/transactionsService'
import { currencyStringToNumber } from '../../../app/utils/currencyStringToNumber'
import { getCategoryOptions } from '../../../app/utils/categories'

const schema = z.object({
  value: z.union([z.string().nonempty('Informe o valor'), z.number()]),
  name: z.string().nonempty('Informe o nome'),
  categoryId: z.string().nonempty('Informe a categoria'),
  bankAccountId: z.string().nonempty('Informe a conta'),
  date: z.date()
})

type FormData = z.infer<typeof schema>

export type TransactionType = 'INCOME' | 'EXPENSE'

/**
 * Starting values of the form. `Select` and `DatePickerInput` copy their
 * value once when they mount, so these only count on the first render.
 */
export interface TransactionInitialValues {
  name?: string
  /** A number, or the currency text the field shows; empty leaves it blank. */
  value?: string | number
  categoryId?: string
  date?: Date
}

/** What was saved: the value and the day picked in the form. */
export interface SavedTransaction {
  value: number
  date: Date
}

interface TransactionFormOptions {
  type: TransactionType
  initialValues?: TransactionInitialValues
  onSaved?(transaction: SavedTransaction): void
  onClose(): void
}

export function useTransactionFormModalController({ type, initialValues, onSaved, onClose }: TransactionFormOptions) {
  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      value: initialValues?.value ?? '0,00',
      name: initialValues?.name ?? '',
      categoryId: initialValues?.categoryId ?? '',
      bankAccountId: '',
      date: initialValues?.date ?? new Date()
    }
  })

  const queryClient = useQueryClient()
  const { accounts } = useBankAccounts()
  const { categories: categoriesList } = useCategories()
  const {
    isLoading,
    mutateAsync
  } = useMutation(transactionsService.create)

  const handleSubmit = hookFormSubmit(async data => {
    const value = currencyStringToNumber(data.value)

    try {
      await mutateAsync({
        ...data,
        value,
        type,
        date: data.date.toISOString()
      })
    } catch {
      toast.error(
        type === 'EXPENSE'
          ? 'Erro ao cadastrar despesa!'
          : 'Erro ao cadastrar receita!'
      )
      return
    }

    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })

    toast.success(
      type === 'EXPENSE'
        ? 'Despesa cadastrada com sucesso!'
        : 'Receita cadastrada com sucesso!'
    )
    onSaved?.({ value, date: data.date })
    onClose()
  })

  // System categories (card invoice, debts, goals) are not offered here.
  const categories = useMemo(
    () => getCategoryOptions(categoriesList, type),
    [categoriesList, type]
  )

  return { isLoading, accounts, categories, handleSubmit, register, errors, control }
}

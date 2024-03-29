import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useBankAccounts } from '../../../../../app/hooks/useBankAccounts'
import { useCategories } from '../../../../../app/hooks/useCategories'
import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsService } from '../../../../../app/services/transactionsService'
import toast from 'react-hot-toast'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import { Transaction } from '../../../../../app/entities/Transaction'

const schema = z.object({
  value: z.union([
    z.number(),
    z.string().nonempty('Informe o valor')
  ]),
  name: z.string().nonempty('Informe o nome'),
  categoryId: z.string().nonempty('Informe a categoria'),
  bankAccountId: z.string().nonempty('Informe a conta'),
  date: z.date()
})

type FormData = z.infer<typeof schema>

export function useEditTransactionModalController(
  transaction: Transaction | null,
  onClose: () => void
) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control,
    reset
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      bankAccountId: transaction?.bankAccountId,
      categoryId: transaction?.categoryId,
      name: transaction?.name,
      value: transaction?.value,
      date: transaction ? new Date(transaction.date) : new Date()
    }
  })

  const queryClient = useQueryClient()
  const { accounts } = useBankAccounts()
  const { categories: categoriesList } = useCategories()
  const {
    isLoading,
    mutateAsync
  } = useMutation(transactionsService.update)
  const {
    isLoading: isLoadingDelete,
    mutateAsync: removeTransaction
  } = useMutation(transactionsService.remove)
  
  
  const handleSubmit = hookFormSubmit(async data => {
    try {
      await mutateAsync({
        ...data,
        id: transaction!.id,
        value: currencyStringToNumber(data.value),
        type: transaction!.type,
        date: data.date.toISOString()
      })

      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })

      toast.success(
        transaction!.type === 'EXPENSE'
          ? 'Despesa editada com sucesso!'
          : 'Receita editada com sucesso!'
      )
      reset()
      onClose()
    } catch {
      toast.error(
        transaction!.type === 'EXPENSE'
          ? 'Erro ao editar despesa!'
          : 'Erro ao editar receita!'
      )
    }
  })

  const categories = useMemo(() => {
    return categoriesList.filter(category => category.type === transaction?.type)
  }, [categoriesList, transaction])

  async function handleDeleteTransaction () {
    try {
      await removeTransaction(transaction!.id)

      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
  
      toast.success(transaction!.type === 'EXPENSE'
      ? 'A despesa foi deletada com sucesso!'
      : 'A receita foi deletada com sucesso!')
      onClose()
    } catch {
      transaction!.type === 'EXPENSE'
          ? 'Erro ao deletar despesa!'
          : 'Erro ao deletar receita!'
    }
  }

  function handleCloseDeleteModal () {
    setIsDeleteModalOpen(false)
  }

  function handleOpenDeleteModal () {
    setIsDeleteModalOpen(true)
  }

  return { isDeleteModalOpen, isLoadingDelete, handleDeleteTransaction, handleCloseDeleteModal, handleOpenDeleteModal, isLoading, mutateAsync, accounts, categories, handleSubmit, register, errors, control, reset }
}
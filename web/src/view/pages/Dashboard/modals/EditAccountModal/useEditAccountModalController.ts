import { z } from 'zod'
import { useDashboard } from '../../components/DashboardContext/useDashboard'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bankAccountsService } from '../../../../../app/services/bankAccountsService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import toast from 'react-hot-toast'
import { useState } from 'react'
import { invalidateMoneyQueries } from '../../../../../app/utils/invalidateMoneyQueries'
import { ChangedBorrower, ReopenedDebt, ReopenedInvoice, getApiErrorPayload } from '../../../../../app/utils/getApiErrorPayload'

const schema = z.object({
  initialBalance: z.union([
    z.string().nonempty('Saldo inicial eh obrigatorio'),
    z.number()
  ]),
  name: z.string().nonempty('Nome da conta eh obrigatorio'),
  type: z.enum(['INVESTMENT', 'CASH', 'CHECKING']),
  color: z.string().nonempty('cor eh obrigatorio')
})

type FormData = z.infer<typeof schema>

export interface AccountDeletionImpact {
  invoices: ReopenedInvoice[]
  debts: ReopenedDebt[]
  borrowers: ChangedBorrower[]
}

export function useEditAccountModalController() {
  const {
    isEditAccountModalOpen,
    toggleOpenEditAccountModal,
    accountBeingEdited
  } = useDashboard()

  const {
    register,
    formState: { errors },
    handleSubmit: hookFormSubmit,
    control
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      color: accountBeingEdited?.color,
      name: accountBeingEdited?.name,
      type: accountBeingEdited?.type,
      initialBalance: accountBeingEdited?.initialBalance
    }
  })

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletionImpact, setDeletionImpact] = useState<AccountDeletionImpact | null>(null)

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync: updateAccount } = useMutation(bankAccountsService.update)
  const { isLoading: isLoadingDelete, mutateAsync: removeAccount } = useMutation(
    ({ id, confirm }: { id: string, confirm: boolean }) => bankAccountsService.remove(id, confirm)
  )

  const handleSubmit = hookFormSubmit(async data => {
    try {
      await updateAccount({
        ...data,
        initialBalance: currencyStringToNumber(data.initialBalance),
        id: accountBeingEdited!.id
      })

      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      toast.success('Conta editada com sucesso.')
      toggleOpenEditAccountModal()
    } catch {
      toast.error('Erro ao salvar a conta')
    }
  })

  function handleOpenDeleteModal() {
    setIsDeleteModalOpen(true)
  }

  function handleCloseDeleteModal() {
    setIsDeleteModalOpen(false)
  }

  function handleCloseDeletionImpactModal() {
    setDeletionImpact(null)
  }

  // Without `confirm` the API answers 409 with the card invoices and debt
  // installments that would reopen and the people balances that would change
  // without this account's entries; the user confirms them in a second step.
  async function deleteAccount(confirm: boolean) {
    try {
      await removeAccount({ id: accountBeingEdited!.id, confirm })

      invalidateMoneyQueries(queryClient)
      toast.success('Conta deletada com sucesso.')
      toggleOpenEditAccountModal()
    } catch (error) {
      const { status, goals, invoices = [], debts = [], borrowers = [] } = getApiErrorPayload(error)

      if (status === 409 && goals?.length) {
        toast.error(`Esta conta está ligada às metas: ${goals.join(', ')}.`)
        setIsDeleteModalOpen(false)
        setDeletionImpact(null)
        return
      }

      if (status === 409 && invoices.length + debts.length + borrowers.length > 0) {
        setIsDeleteModalOpen(false)
        setDeletionImpact({ invoices, debts, borrowers })
        return
      }

      toast.error('Erro ao deletar a conta')
    }
  }

  function handleDeleteAccount() {
    return deleteAccount(false)
  }

  function handleConfirmDeleteAccount() {
    return deleteAccount(true)
  }

  return { isLoadingDelete, handleDeleteAccount, handleConfirmDeleteAccount, deletionImpact, handleCloseDeletionImpactModal, isDeleteModalOpen, handleOpenDeleteModal, handleCloseDeleteModal, accountBeingEdited, isEditAccountModalOpen, toggleOpenEditAccountModal, register, errors, handleSubmit, control, isLoading }
}
import { z } from 'zod'
import { useDashboard } from '../../components/DashboardContext/useDashboard'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bankAccountsService } from '../../../../../app/services/bankAccountsService'
import { currencyStringToNumber } from '../../../../../app/utils/currencyStringToNumber'
import toast from 'react-hot-toast'
import { useState } from 'react'

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

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync: updateAccount } = useMutation(bankAccountsService.update)
  const { isLoading: isLoadingDelete, mutateAsync: removeAccount } = useMutation(bankAccountsService.remove)

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

  async function handleDeleteAccount() {
    try {
      await removeAccount(accountBeingEdited!.id)

      queryClient.invalidateQueries({ queryKey: ['bankAccounts'] })
      toast.success('Conta deletada com sucesso.')
      toggleOpenEditAccountModal()
    } catch {
      toast.error('Erro ao deletar a conta')
    }
  }

  return { isLoadingDelete, handleDeleteAccount, isDeleteModalOpen, handleOpenDeleteModal, handleCloseDeleteModal, accountBeingEdited, isEditAccountModalOpen, toggleOpenEditAccountModal, register, errors, handleSubmit, control, isLoading }
}
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { BorrowerMovementKind } from '../../../app/entities/Borrower'
import { useBorrower } from '../../../app/hooks/useBorrower'
import { borrowersService } from '../../../app/services/borrowersService'
import { getApiErrorPayload } from '../../../app/utils/getApiErrorPayload'

type BorrowerDetailModal =
  | { name: 'movement', kind: BorrowerMovementKind }
  | { name: 'edit' }
  | { name: 'delete' }

export function useBorrowerDetailController() {
  const { borrowerId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { borrower, isInitialLoading, isError, error } = useBorrower(borrowerId)
  const [openModal, setOpenModal] = useState<BorrowerDetailModal | null>(null)

  const { isLoading: isLoadingDelete, mutateAsync: removeBorrower } = useMutation(borrowersService.remove)

  useEffect(() => {
    if (!isError) return

    const { status } = getApiErrorPayload(error)
    toast.error(status === 404 || status === 400 ? 'Pessoa não encontrada.' : 'Erro ao carregar a pessoa.')
    navigate('/dividas', { replace: true })
  }, [isError, error, navigate])

  const closeModal = () => setOpenModal(null)

  async function handleDelete() {
    try {
      await removeBorrower(borrowerId)

      queryClient.invalidateQueries({ queryKey: ['debts'] })
      toast.success('Pessoa excluída!')
      navigate('/dividas', { replace: true })
    } catch (error) {
      toast.error(getApiErrorPayload(error).status === 409
        ? 'Uma pessoa com movimentações não pode ser excluída.'
        : 'Erro ao excluir a pessoa!')
      closeModal()
    }
  }

  return {
    borrower,
    isLoading: isInitialLoading,
    openModal,
    openMovementModal: (kind: BorrowerMovementKind) => setOpenModal({ name: 'movement', kind }),
    openEditModal: () => setOpenModal({ name: 'edit' }),
    openDeleteModal: () => setOpenModal({ name: 'delete' }),
    closeModal,
    handleDelete,
    isLoadingDelete
  }
}

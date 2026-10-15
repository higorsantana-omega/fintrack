import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { DebtInstallment } from '../../../app/entities/Debt'
import { useDebt } from '../../../app/hooks/useDebt'
import { debtsService } from '../../../app/services/debtsService'
import { getApiErrorPayload } from '../../../app/utils/getApiErrorPayload'
import { invalidateMoneyQueries } from '../../../app/utils/invalidateMoneyQueries'
import { getInstallmentYear, isOpenInstallment } from '../../../app/utils/debtInstallments'
import { usePayDebt } from '../../components/PayDebtModal/usePayDebt'

type DebtDetailModal =
  | { name: 'edit' }
  | { name: 'delete' }
  | { name: 'adjust', installment: DebtInstallment }

export function useDebtDetailController() {
  const { debtId = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { openPayDebt } = usePayDebt()
  const { debt, isInitialLoading, isError, error } = useDebt(debtId)
  const [toggledYears, setToggledYears] = useState<Record<string, boolean>>({})
  const [openModal, setOpenModal] = useState<DebtDetailModal | null>(null)

  const { isLoading: isLoadingDelete, mutateAsync: removeDebt } = useMutation(debtsService.remove)

  useEffect(() => {
    if (!isError) return

    const { status } = getApiErrorPayload(error)
    toast.error(status === 404 || status === 400 ? 'Dívida não encontrada.' : 'Erro ao carregar a dívida.')
    navigate('/dividas', { replace: true })
  }, [isError, error, navigate])

  // Years without an open installment start collapsed (R16).
  const years = useMemo(() => {
    const byYear = new Map<string, DebtInstallment[]>()

    for (const installment of debt?.installments ?? []) {
      const year = getInstallmentYear(installment)
      const list = byYear.get(year) ?? []
      list.push(installment)
      byYear.set(year, list)
    }

    return [...byYear].map(([year, installments]) => {
      const openCount = installments.filter(isOpenInstallment).length

      return {
        year,
        installments,
        openCount,
        isExpanded: toggledYears[year] ?? openCount > 0
      }
    })
  }, [debt, toggledYears])

  const closeModal = () => setOpenModal(null)

  function toggleYear(year: string, isExpanded: boolean) {
    setToggledYears(previous => ({ ...previous, [year]: !isExpanded }))
  }

  function handlePay() {
    if (!debt) return

    openPayDebt({ debtId: debt.id, debtName: debt.name })
  }

  async function handleDelete() {
    try {
      await removeDebt(debtId)

      invalidateMoneyQueries(queryClient)
      toast.success('Dívida excluída!')
      navigate('/dividas', { replace: true })
    } catch (error) {
      toast.error(getApiErrorPayload(error).status === 409
        ? 'Uma dívida com transações ligadas, como pagamentos, não pode ser excluída.'
        : 'Erro ao excluir a dívida!')
      closeModal()
    }
  }

  return {
    debt,
    isLoading: isInitialLoading,
    years,
    toggleYear,
    openModal,
    openEditModal: () => setOpenModal({ name: 'edit' }),
    openDeleteModal: () => setOpenModal({ name: 'delete' }),
    openAdjustModal: (installment: DebtInstallment) => setOpenModal({ name: 'adjust', installment }),
    closeModal,
    handlePay,
    handleDelete,
    isLoadingDelete
  }
}

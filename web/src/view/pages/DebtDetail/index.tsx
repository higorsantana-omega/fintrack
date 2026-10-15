import { Link } from 'react-router-dom'
import { ArrowLeftIcon, CheckIcon, Pencil1Icon, TrashIcon } from '@radix-ui/react-icons'
import { cn } from '../../../app/utils/cn'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { formatMonth } from '../../../app/utils/formatMonth'
import { Spinner } from '../../components/Spinner'
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal'
import { DEBT_STATUS_LABELS } from '../../constants/DebtConstants'
import { GoalActionButton } from '../GoalDetail/components/GoalActionButton'
import { InstallmentsList } from './components/InstallmentsList'
import { EditDebtModal } from './modals/EditDebtModal'
import { AdjustExpectedValueModal } from './modals/AdjustExpectedValueModal'
import { useDebtDetailController } from './useDebtDetailController'

export function DebtDetail() {
  const {
    debt,
    isLoading,
    years,
    toggleYear,
    openModal,
    openEditModal,
    openDeleteModal,
    openAdjustModal,
    closeModal,
    handlePay,
    handleDelete,
    isLoadingDelete
  } = useDebtDetailController()

  if (isLoading || !debt) {
    return (
      <main className='flex-1 flex items-center justify-center'>
        <Spinner className='w-10 h-10' />
      </main>
    )
  }

  return (
    <main className='flex-1 flex flex-col gap-4'>
      <Link to='/dividas' className='flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 w-fit'>
        <ArrowLeftIcon /> Dívidas
      </Link>

      <section className='bg-teal-900 rounded-2xl p-6 md:p-8 text-white flex flex-col gap-6'>
        <header className='flex flex-col md:flex-row md:items-start justify-between gap-4'>
          <div className='flex items-center gap-2 flex-wrap'>
            <h1 id='debt-name' className='text-2xl tracking-[-1px] font-bold'>{debt.name}</h1>
            <span
              id='debt-status'
              className={cn(
                'text-xs font-medium rounded-full px-2 py-1 bg-white/[0.15]',
                debt.status === 'OVERDUE' && 'bg-red-50 text-red-900'
              )}
            >
              {DEBT_STATUS_LABELS[debt.status]}
            </span>
            <span className='text-sm text-teal-50 basis-full'>Vence todo dia {debt.dueDay}</span>
          </div>

          <div className='flex flex-wrap gap-2 md:justify-end md:shrink-0'>
            {debt.status !== 'PAID' && (
              <GoalActionButton id='debt-action-pay' label='Pagar' icon={CheckIcon} primary onClick={handlePay} />
            )}
            <GoalActionButton id='debt-action-edit' label='Editar' icon={Pencil1Icon} onClick={openEditModal} />
            <GoalActionButton id='debt-action-delete' label='Excluir' icon={TrashIcon} onClick={openDeleteModal} />
          </div>
        </header>

        <div className='flex flex-wrap gap-x-10 gap-y-3 text-sm'>
          <div>
            <span className='text-teal-50 block'>Quanto falta</span>
            <strong id='debt-remaining' className='text-lg'>{formatCurrency(debt.remaining)}</strong>
          </div>
          <div>
            <span className='text-teal-50 block'>Termina em</span>
            <strong id='debt-ends-in' className='text-lg'>{debt.endsIn ? formatMonth(debt.endsIn) : '-'}</strong>
          </div>
          <div>
            <span className='text-teal-50 block'>Parcelas pagas</span>
            <strong id='debt-paid' className='text-lg'>{debt.paidCount}/{debt.installmentsCount}</strong>
          </div>
        </div>
      </section>

      <section className='bg-gray-100 rounded-2xl p-4 md:p-8 flex flex-col gap-4 min-w-0'>
        <InstallmentsList
          installmentsCount={debt.installmentsCount}
          years={years}
          onToggleYear={toggleYear}
          onAdjust={openAdjustModal}
        />
      </section>

      {openModal?.name === 'edit' && <EditDebtModal debt={debt} onClose={closeModal} />}
      {openModal?.name === 'adjust' && (
        <AdjustExpectedValueModal
          debtId={debt.id}
          installmentsCount={debt.installmentsCount}
          installment={openModal.installment}
          onClose={closeModal}
        />
      )}
      {openModal?.name === 'delete' && (
        <ConfirmDeleteModal
          isLoading={isLoadingDelete}
          onConfirm={handleDelete}
          onClose={closeModal}
          title='Tem certeza que deseja excluir esta dívida?'
          description='Só é possível excluir uma dívida sem transações ligadas, como pagamentos.'
        />
      )}
    </main>
  )
}

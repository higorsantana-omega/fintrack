import { Link } from 'react-router-dom'
import { ArrowLeftIcon, MinusIcon, Pencil1Icon, PlusIcon, TrashIcon } from '@radix-ui/react-icons'
import { cn } from '../../../app/utils/cn'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { formatDate } from '../../../app/utils/formatDate'
import { Spinner } from '../../components/Spinner'
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal'
import { GoalActionButton } from '../GoalDetail/components/GoalActionButton'
import { BorrowerMovementModal } from './modals/BorrowerMovementModal'
import { EditBorrowerModal } from './modals/EditBorrowerModal'
import { useBorrowerDetailController } from './useBorrowerDetailController'

export function BorrowerDetail() {
  const {
    borrower,
    isLoading,
    openModal,
    openMovementModal,
    openEditModal,
    openDeleteModal,
    closeModal,
    handleDelete,
    isLoadingDelete
  } = useBorrowerDetailController()

  if (isLoading || !borrower) {
    return (
      <main className='flex-1 flex items-center justify-center'>
        <Spinner className='w-10 h-10' />
      </main>
    )
  }

  const isSettled = borrower.balance <= 0

  return (
    <main className='flex-1 flex flex-col gap-4'>
      <Link to='/dividas' className='flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 w-fit'>
        <ArrowLeftIcon /> Dívidas
      </Link>

      <section className='bg-teal-900 rounded-2xl p-6 md:p-8 text-white flex flex-col gap-6'>
        <header className='flex flex-col md:flex-row md:items-start justify-between gap-4'>
          <h1 id='borrower-name' className='text-2xl tracking-[-1px] font-bold'>{borrower.name}</h1>

          <div className='flex flex-wrap gap-2 md:justify-end md:shrink-0'>
            <GoalActionButton
              id='borrower-action-lend'
              label='Emprestei'
              icon={PlusIcon}
              primary
              onClick={() => openMovementModal('LEND')}
            />
            <GoalActionButton
              id='borrower-action-return'
              label='Devolveu'
              icon={MinusIcon}
              onClick={() => openMovementModal('RETURN')}
            />
            <GoalActionButton id='borrower-action-edit' label='Editar' icon={Pencil1Icon} onClick={openEditModal} />
            <GoalActionButton id='borrower-action-delete' label='Excluir' icon={TrashIcon} onClick={openDeleteModal} />
          </div>
        </header>

        <div className='text-sm'>
          <span className='text-teal-50 block'>{isSettled ? 'Saldo' : 'Deve'}</span>
          {isSettled ? (
            <>
              <strong id='borrower-balance' className='text-lg'>Em dia</strong>
              {borrower.overpaid > 0 && (
                <span id='borrower-overpaid' className='block text-teal-50'>
                  Devolveu {formatCurrency(borrower.overpaid)} a mais
                </span>
              )}
            </>
          ) : (
            <strong id='borrower-balance' className='text-lg'>{formatCurrency(borrower.balance)}</strong>
          )}
        </div>
      </section>

      <section className='bg-gray-100 rounded-2xl p-4 md:p-8 flex flex-col gap-4 min-w-0'>
        <strong className='text-gray-800 tracking-[-1px] text-lg'>Extrato</strong>

        <div className='bg-white p-4 rounded-2xl flex items-center justify-between gap-4'>
          <strong className='font-bold tracking-[-0.5px] text-gray-800'>Saldo anterior</strong>
          <span id='borrower-opening-balance' className='tracking-[-0.5px] font-medium whitespace-nowrap text-gray-700'>
            {formatCurrency(borrower.openingBalance)}
          </span>
        </div>

        {borrower.movements.length === 0 && (
          <p className='text-gray-600 text-sm py-6 text-center'>Nenhuma movimentação registrada ainda.</p>
        )}

        {borrower.movements.length > 0 && (
          <ul id='borrower-movements' className='space-y-2'>
            {borrower.movements.map(movement => {
              const isLend = movement.type === 'EXPENSE'

              return (
                <li
                  key={movement.id}
                  className='borrower-movement bg-white p-4 rounded-2xl flex items-center justify-between gap-4'
                >
                  <div>
                    <strong className='borrower-movement-name font-bold tracking-[-0.5px] block text-gray-800'>
                      {movement.name}
                    </strong>
                    <span className='text-sm text-gray-600'>
                      {isLend ? 'Emprestei' : 'Devolveu'} · {formatDate(new Date(movement.date))} · {movement.bankAccount.name}
                    </span>
                  </div>

                  <span
                    className={cn(
                      'borrower-movement-value tracking-[-0.5px] font-medium whitespace-nowrap',
                      isLend ? 'text-gray-700' : 'text-teal-900'
                    )}
                  >
                    {isLend ? '+' : '-'} {formatCurrency(movement.value)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {openModal?.name === 'movement' && (
        <BorrowerMovementModal
          borrowerId={borrower.id}
          borrowerName={borrower.name}
          kind={openModal.kind}
          onClose={closeModal}
        />
      )}
      {openModal?.name === 'edit' && <EditBorrowerModal borrower={borrower} onClose={closeModal} />}
      {openModal?.name === 'delete' && (
        <ConfirmDeleteModal
          isLoading={isLoadingDelete}
          onConfirm={handleDelete}
          onClose={closeModal}
          title='Tem certeza que deseja excluir esta pessoa?'
          description='Só é possível excluir uma pessoa sem movimentações.'
        />
      )}
    </main>
  )
}

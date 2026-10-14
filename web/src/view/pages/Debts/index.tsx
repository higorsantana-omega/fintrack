import { PlusIcon } from '@radix-ui/react-icons'
import { cn } from '../../../app/utils/cn'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { DebtsSummary } from './components/DebtsSummary'
import { DebtTile } from './components/DebtTile'
import { BorrowerTile } from './components/BorrowerTile'
import { NewDebtModal } from './modals/NewDebtModal'
import { NewBorrowerModal } from './modals/NewBorrowerModal'
import { DebtsTab, useDebtsController } from './useDebtsController'

const TABS: { tab: DebtsTab, id: string, label: string }[] = [
  { tab: 'owe', id: 'debts-tab-owe', label: 'Eu devo' },
  { tab: 'owed', id: 'debts-tab-owed', label: 'Me devem' }
]

export function Debts() {
  const {
    summary,
    isLoadingSummary,
    isLoadingDebts,
    isLoadingBorrowers,
    tab,
    selectTab,
    openDebts,
    paidDebts,
    openBorrowers,
    settledBorrowers,
    openModal,
    openNewDebtModal,
    openNewBorrowerModal,
    closeModal
  } = useDebtsController()

  const hasNoDebts = openDebts.length === 0 && paidDebts.length === 0
  const hasNoBorrowers = openBorrowers.length === 0 && settledBorrowers.length === 0

  return (
    <main className='flex-1 flex flex-col gap-4'>
      <section>
        {isLoadingSummary && (
          <div className='h-40 flex items-center justify-center'>
            <Spinner className='w-10 h-10' />
          </div>
        )}

        {!isLoadingSummary && summary && <DebtsSummary summary={summary} />}
      </section>

      <section className='flex-1 bg-gray-100 rounded-2xl p-4 md:p-8 flex flex-col gap-6'>
        <header className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div role='tablist' className='flex gap-1'>
            {TABS.map(item => (
              <button
                key={item.tab}
                id={item.id}
                type='button'
                role='tab'
                aria-selected={item.tab === tab}
                onClick={() => selectTab(item.tab)}
                className={cn(
                  'h-9 px-3 rounded-full text-sm font-medium tracking-[-0.5px] whitespace-nowrap transition-colors text-gray-700 hover:bg-gray-200',
                  item.tab === tab && 'bg-teal-900 text-white hover:bg-teal-900'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className='grid grid-cols-2 sm:flex gap-2'>
            <Button id='debts-new-borrower' className='h-10 gap-2 px-4 whitespace-nowrap' ghost onClick={openNewBorrowerModal}>
              <PlusIcon className='w-4 h-4' />
              Nova pessoa
            </Button>
            <Button id='debts-new-debt' className='h-10 gap-2 px-4 whitespace-nowrap' onClick={openNewDebtModal}>
              <PlusIcon className='w-4 h-4' />
              Nova dívida
            </Button>
          </div>
        </header>

        {tab === 'owe' && (
          <>
            {isLoadingDebts && (
              <div className='flex-1 flex items-center justify-center'>
                <Spinner className='w-10 h-10' />
              </div>
            )}

            {!isLoadingDebts && hasNoDebts && (
              <div id='debts-empty' className='flex-1 flex items-center justify-center text-gray-600 py-10'>
                Cadastre uma dívida para acompanhar as parcelas.
              </div>
            )}

            {!isLoadingDebts && openDebts.length > 0 && (
              <div id='debts-open' className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
                {openDebts.map(debt => (
                  <DebtTile key={debt.id} debt={debt} />
                ))}
              </div>
            )}

            {!isLoadingDebts && paidDebts.length > 0 && (
              <div className='space-y-3'>
                <strong className='text-gray-700 tracking-[-0.5px] text-sm block'>Quitadas</strong>
                <div id='debts-paid' className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
                  {paidDebts.map(debt => (
                    <DebtTile key={debt.id} debt={debt} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {tab === 'owed' && (
          <>
            {isLoadingBorrowers && (
              <div className='flex-1 flex items-center justify-center'>
                <Spinner className='w-10 h-10' />
              </div>
            )}

            {!isLoadingBorrowers && hasNoBorrowers && (
              <div id='borrowers-empty' className='flex-1 flex items-center justify-center text-gray-600 py-10'>
                Cadastre uma pessoa para acompanhar o que ela te deve.
              </div>
            )}

            {!isLoadingBorrowers && openBorrowers.length > 0 && (
              <div id='borrowers-open' className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
                {openBorrowers.map(borrower => (
                  <BorrowerTile key={borrower.id} borrower={borrower} />
                ))}
              </div>
            )}

            {!isLoadingBorrowers && settledBorrowers.length > 0 && (
              <div className='space-y-3'>
                <strong className='text-gray-700 tracking-[-0.5px] text-sm block'>Em dia</strong>
                <div id='borrowers-settled' className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
                  {settledBorrowers.map(borrower => (
                    <BorrowerTile key={borrower.id} borrower={borrower} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {openModal === 'newDebt' && <NewDebtModal open onClose={closeModal} />}
      {openModal === 'newBorrower' && <NewBorrowerModal open onClose={closeModal} />}
    </main>
  )
}

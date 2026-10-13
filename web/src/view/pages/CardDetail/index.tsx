import { Link } from 'react-router-dom'
import { ArchiveIcon, ArrowLeftIcon, Pencil1Icon, PlusIcon, TrashIcon } from '@radix-ui/react-icons'
import { cn } from '../../../app/utils/cn'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { Spinner } from '../../components/Spinner'
import { CardEntryModal } from '../../components/CardEntryModal'
import { ConfirmDeleteModal } from '../../components/ConfirmDeleteModal'
import { GoalActionButton } from '../GoalDetail/components/GoalActionButton'
import { InvoiceStrip } from './components/InvoiceStrip'
import { InvoiceDetail } from './components/InvoiceDetail'
import { InvoiceEntriesList } from './components/InvoiceEntriesList'
import { InvoiceCategories } from './components/InvoiceCategories'
import { RecurringChargesList } from './components/RecurringChargesList'
import { EditCardModal } from './modals/EditCardModal'
import { EditRecurringChargeModal } from './modals/EditRecurringChargeModal'
import { EntriesTab, useCardDetailController } from './useCardDetailController'

const ENTRIES_TABS: { tab: EntriesTab, label: string }[] = [
  { tab: 'list', label: 'Lista' },
  { tab: 'categories', label: 'Categorias' }
]

export function CardDetail() {
  const {
    card,
    isLoading,
    isArchived,
    selectedInvoice,
    selectMonth,
    entriesTab,
    setEntriesTab,
    openModal,
    openEditModal,
    openDeleteModal,
    openNewEntryModal,
    openEditRecurringModal,
    openCancelRecurringModal,
    closeModal,
    handlePay,
    handleSelectEntry,
    handleArchive,
    isArchiving,
    handleDelete,
    isLoadingDelete,
    handleCancelRecurring,
    isCancelling
  } = useCardDetailController()

  if (isLoading || !card || !selectedInvoice) {
    return (
      <main className='flex-1 flex items-center justify-center'>
        <Spinner className='w-10 h-10' />
      </main>
    )
  }

  return (
    <main className='flex-1 flex flex-col gap-4'>
      <Link to='/cartoes' className='flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 w-fit'>
        <ArrowLeftIcon /> Cartões
      </Link>

      <section className='bg-teal-900 rounded-2xl p-6 md:p-8 text-white flex flex-col gap-6'>
        <header className='flex flex-col md:flex-row md:items-start justify-between gap-4'>
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='w-3 h-3 rounded-full' style={{ background: card.color }} />
            <h1 id='card-name' className='text-2xl tracking-[-1px] font-bold'>{card.name}</h1>
            {isArchived && (
              <span id='card-archived' className='text-xs font-medium rounded-full px-2 py-1 bg-white/[0.15]'>
                Arquivado
              </span>
            )}
            <span className='text-sm text-teal-50 basis-full'>
              Fecha no dia {card.closingDay} e vence no dia {card.dueDay}
            </span>
          </div>

          {!isArchived && (
            <div className='flex flex-wrap gap-2 md:justify-end md:shrink-0'>
              <GoalActionButton id='card-action-entry' label='Novo lançamento' icon={PlusIcon} primary onClick={openNewEntryModal} />
              <GoalActionButton id='card-action-edit' label='Editar' icon={Pencil1Icon} onClick={openEditModal} />
              <GoalActionButton
                id='card-action-archive'
                label='Arquivar'
                icon={ArchiveIcon}
                disabled={isArchiving}
                onClick={handleArchive}
              />
              <GoalActionButton id='card-action-delete' label='Excluir' icon={TrashIcon} onClick={openDeleteModal} />
            </div>
          )}
        </header>

        <div className='flex flex-wrap gap-x-10 gap-y-3 text-sm'>
          <div>
            <span className='text-teal-50 block'>Limite</span>
            <strong id='card-limit-total' className='text-lg'>{formatCurrency(card.limit.total)}</strong>
          </div>
          <div>
            <span className='text-teal-50 block'>Usado</span>
            <strong id='card-limit-used' className='text-lg'>{formatCurrency(card.limit.used)}</strong>
          </div>
          <div>
            <span className='text-teal-50 block'>Disponível</span>
            <strong id='card-limit-available' className={cn('text-lg', card.limit.available < 0 && 'text-red-50')}>
              {formatCurrency(card.limit.available)}
            </strong>
          </div>
        </div>
      </section>

      <section className='bg-gray-100 rounded-2xl p-4 md:p-8 flex flex-col gap-4 min-w-0'>
        <InvoiceStrip invoices={card.invoices} selectedMonth={selectedInvoice.month} onSelect={selectMonth} />

        <InvoiceDetail invoice={selectedInvoice} onPay={handlePay} />

        <div role='tablist' className='flex gap-2'>
          {ENTRIES_TABS.map(item => (
            <button
              key={item.tab}
              type='button'
              role='tab'
              aria-selected={item.tab === entriesTab}
              onClick={() => setEntriesTab(item.tab)}
              className={cn(
                'h-10 px-4 rounded-full text-sm font-medium tracking-[-0.5px] transition-colors text-gray-700 hover:bg-gray-200',
                item.tab === entriesTab && 'bg-teal-900 text-white hover:bg-teal-900'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {entriesTab === 'list' && (
          <InvoiceEntriesList entries={selectedInvoice.entries} onSelect={handleSelectEntry} />
        )}
        {entriesTab === 'categories' && (
          <InvoiceCategories categories={selectedInvoice.categories} />
        )}
      </section>

      <RecurringChargesList
        recurringCharges={card.recurringCharges}
        canEdit={!isArchived}
        onEdit={openEditRecurringModal}
        onCancel={openCancelRecurringModal}
      />

      {openModal?.name === 'edit' && <EditCardModal card={card} onClose={closeModal} />}
      {openModal?.name === 'newEntry' && (
        <CardEntryModal cards={[card]} cardId={card.id} onClose={closeModal} />
      )}
      {openModal?.name === 'editEntry' && (
        <CardEntryModal cards={[card]} cardId={card.id} entry={openModal.entry} onClose={closeModal} />
      )}
      {openModal?.name === 'editRecurring' && (
        <EditRecurringChargeModal cardId={card.id} recurringCharge={openModal.recurringCharge} onClose={closeModal} />
      )}
      {openModal?.name === 'cancelRecurring' && (
        <Modal title='Cancelar recorrente' open onClose={closeModal}>
          <p className='text-gray-800 tracking-[-0.5px]'>
            Cancelar <strong>{openModal.recurringCharge.description}</strong>? As próximas cobranças deixam de ser lançadas; as já lançadas continuam.
          </p>
          <div className='space-y-4'>
            <Button
              id='cancel-recurring-confirm'
              className='w-full'
              danger
              isLoading={isCancelling}
              onClick={() => handleCancelRecurring(openModal.recurringCharge)}
            >
              Sim, cancelar
            </Button>
            <Button className='w-full' ghost disabled={isCancelling} onClick={closeModal}>Voltar</Button>
          </div>
        </Modal>
      )}
      {openModal?.name === 'delete' && (
        <ConfirmDeleteModal
          isLoading={isLoadingDelete}
          onConfirm={handleDelete}
          onClose={closeModal}
          title='Tem certeza que deseja excluir este cartão?'
          description='Só é possível excluir um cartão sem lançamentos e sem pagamentos.'
        />
      )}
    </main>
  )
}

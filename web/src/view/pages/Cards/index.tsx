import { PlusIcon } from '@radix-ui/react-icons'
import { Button } from '../../components/Button'
import { Spinner } from '../../components/Spinner'
import { CardEntryModal } from '../../components/CardEntryModal'
import { CardsSummary } from './components/CardsSummary'
import { InvoicesByMonthChart } from './components/InvoicesByMonthChart'
import { CardTile } from './components/CardTile'
import { NewCardModal } from './modals/NewCardModal'
import { useCardsController } from './useCardsController'

export function Cards() {
  const {
    summary,
    isLoadingSummary,
    isLoadingCards,
    activeCards,
    archivedCards,
    openModal,
    openNewCardModal,
    openNewEntryModal,
    closeModal
  } = useCardsController()

  return (
    <main className='flex-1 flex flex-col gap-4'>
      <section className='grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4'>
        {isLoadingSummary && (
          <div className='lg:col-span-2 h-72 flex items-center justify-center'>
            <Spinner className='w-10 h-10' />
          </div>
        )}

        {!isLoadingSummary && summary && (
          <>
            <CardsSummary invoicesTotal={summary.invoicesTotal} limit={summary.limit} />
            <InvoicesByMonthChart data={summary.invoicesByMonth} />
          </>
        )}
      </section>

      <section className='flex-1 bg-gray-100 rounded-2xl p-4 md:p-8 flex flex-col gap-6'>
        <header className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <strong className='text-gray-800 tracking-[-1px] text-lg'>Cartões</strong>

          <div className='grid grid-cols-2 sm:flex gap-2'>
            {activeCards.length > 0 && (
              <Button id='cards-new-entry' className='h-10 gap-2 px-4 whitespace-nowrap' ghost onClick={openNewEntryModal}>
                <PlusIcon className='w-4 h-4' />
                Novo lançamento
              </Button>
            )}
            <Button id='cards-new-card' className='h-10 gap-2 px-4 whitespace-nowrap' onClick={openNewCardModal}>
              <PlusIcon className='w-4 h-4' />
              Novo cartão
            </Button>
          </div>
        </header>

        {isLoadingCards && (
          <div className='flex-1 flex items-center justify-center'>
            <Spinner className='w-10 h-10' />
          </div>
        )}

        {!isLoadingCards && activeCards.length === 0 && (
          <div className='flex-1 flex items-center justify-center text-gray-600 py-10'>
            Cadastre um cartão para acompanhar as faturas.
          </div>
        )}

        {!isLoadingCards && activeCards.length > 0 && (
          <div id='cards-active' className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
            {activeCards.map(card => (
              <CardTile key={card.id} card={card} />
            ))}
          </div>
        )}

        {!isLoadingCards && archivedCards.length > 0 && (
          <div className='space-y-3'>
            <strong className='text-gray-700 tracking-[-0.5px] text-sm block'>Arquivados</strong>
            <div id='cards-archived' className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'>
              {archivedCards.map(card => (
                <CardTile key={card.id} card={card} />
              ))}
            </div>
          </div>
        )}
      </section>

      {openModal === 'newCard' && <NewCardModal open onClose={closeModal} />}
      {openModal === 'newEntry' && <CardEntryModal cards={activeCards} onClose={closeModal} />}
    </main>
  )
}

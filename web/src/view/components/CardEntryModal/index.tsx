import { Controller } from 'react-hook-form'
import { TrashIcon } from '@radix-ui/react-icons'
import { CardEntry, CreditCard } from '../../../app/entities/CreditCard'
import { cn } from '../../../app/utils/cn'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { formatMonth } from '../../../app/utils/formatMonth'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { Input } from '../Input'
import { InputCurrency } from '../InputCurrency'
import { Select } from '../Select'
import { DatePickerInput } from '../DatePickerInput'
import { ConfirmDeleteModal } from '../ConfirmDeleteModal'
import { EntryTab, useCardEntryModalController } from './useCardEntryModalController'

const TABS: { tab: EntryTab, label: string }[] = [
  { tab: 'PURCHASE', label: 'Compra' },
  { tab: 'INSTALLMENTS', label: 'Parcelada' },
  { tab: 'RECURRING', label: 'Recorrente' },
  { tab: 'REFUND', label: 'Estorno' }
]

interface CardEntryModalProps {
  /** The cards a new entry may go to; editing passes the entry's card. */
  cards: CreditCard[]
  /** Pre-selects and locks the card, as on the card page. */
  cardId?: string
  /** Edits this entry; its kind and card stay as they are. */
  entry?: CardEntry
  onClose(): void
}

function getValueLabel(tab: EntryTab, inProgress: boolean) {
  if (tab === 'INSTALLMENTS') return inProgress ? 'Valor da parcela' : 'Valor total'
  if (tab === 'REFUND') return 'Valor do estorno'

  return 'Valor'
}

function getDateLabel(tab: EntryTab, inProgress: boolean) {
  if (tab === 'RECURRING') return 'Primeira cobrança'
  if (tab === 'INSTALLMENTS' && inProgress) return 'Data original da compra'

  return 'Data'
}

function getDeleteDescription(entry: CardEntry) {
  if (entry.recurringChargeId) {
    return 'Só esta cobrança será excluída. A recorrente continua ativa.'
  }
  if (entry.installmentsCount > 1) {
    return 'Todas as parcelas desta compra serão excluídas, inclusive as de faturas pagas.'
  }

  return undefined
}

export function CardEntryModal({ cards, cardId, entry, onClose }: CardEntryModalProps) {
  const {
    register,
    control,
    errors,
    handleSubmit,
    isLoading,
    tab,
    selectTab,
    inProgress,
    anchorInvoiceMonth,
    selectAnchor,
    selectedCard,
    categories,
    limitWarning,
    isDeleteModalOpen,
    openDeleteModal,
    closeDeleteModal,
    handleDelete,
    isLoadingDelete
  } = useCardEntryModalController({ cards, cardId, entry, onClose })

  if (limitWarning !== null) {
    return (
      <Modal title='Limite excedido' open onClose={onClose}>
        <p id='limit-warning' className='text-gray-800 tracking-[-0.5px]'>
          O lançamento foi registrado, mas o limite disponível do cartão ficou em{' '}
          <strong className='text-red-900'>{formatCurrency(limitWarning)}</strong>.
        </p>
        <Button className='w-full' onClick={onClose}>Entendi</Button>
      </Modal>
    )
  }

  if (entry && isDeleteModalOpen) {
    return (
      <ConfirmDeleteModal
        isLoading={isLoadingDelete}
        onConfirm={handleDelete}
        onClose={closeDeleteModal}
        title='Tem certeza que deseja excluir este lançamento?'
        description={getDeleteDescription(entry)}
      />
    )
  }

  const isCardLocked = !!cardId || !!entry
  const anchorOptions = selectedCard
    ? [
      { month: selectedCard.lastClosedInvoiceMonth, label: 'fechada' },
      { month: selectedCard.openInvoiceMonth, label: 'aberta' }
    ]
    : []

  return (
    <Modal
      title={entry ? 'Editar lançamento' : 'Novo lançamento'}
      open
      onClose={onClose}
      rightAction={entry && (
        <button aria-label='Excluir lançamento' onClick={openDeleteModal}>
          <TrashIcon className='w-6 h-6 text-red-900' />
        </button>
      )}
    >
      {!entry && (
        <div role='tablist' className='flex gap-1 overflow-x-auto'>
          {TABS.map(item => (
            <button
              key={item.tab}
              type='button'
              role='tab'
              aria-selected={item.tab === tab}
              onClick={() => selectTab(item.tab)}
              className={cn(
                'h-9 px-3 rounded-full text-sm font-medium tracking-[-0.5px] whitespace-nowrap transition-colors text-gray-700 hover:bg-gray-100',
                item.tab === tab && 'bg-teal-900 text-white hover:bg-teal-900'
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className='flex justify-center flex-col items-start'>
          <div className='flex items-center gap-2'>
            <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
            <Controller
              name='value'
              control={control}
              render={({ field: { onChange, value } }) => (
                <InputCurrency id='entryValue' error={errors.value?.message} onChange={onChange} value={value} />
              )}
            />
          </div>

          <span className='text-gray-600 tracking-[-0.5px] text-xs'>{getValueLabel(tab, inProgress)}</span>
        </div>

        <div className='mt-10 flex flex-col gap-4'>
          {isCardLocked && selectedCard && (
            <p className='text-sm text-gray-700 tracking-[-0.5px]'>
              Cartão <strong>{selectedCard.name}</strong>
            </p>
          )}

          {!isCardLocked && (
            <Controller
              control={control}
              name='cardId'
              render={({ field: { onChange, value } }) => (
                <Select
                  id='entryCardId'
                  placeholder='Cartão'
                  onChange={onChange}
                  value={value}
                  error={errors.cardId?.message}
                  options={cards.map(card => ({ value: card.id, label: card.name }))}
                />
              )}
            />
          )}

          <Input
            id='entryDescription'
            type='text'
            placeholder='Descrição'
            error={errors.description?.message}
            {...register('description')}
          />

          {tab === 'INSTALLMENTS' && (
            <>
              <label className={cn('flex items-center gap-2 text-sm text-gray-800 tracking-[-0.5px]', entry && 'opacity-60')}>
                <input
                  id='entryInProgress'
                  type='checkbox'
                  className='w-4 h-4 accent-teal-900'
                  disabled={!!entry}
                  {...register('inProgress')}
                />
                Compra já em andamento
              </label>

              <div className='grid grid-cols-2 gap-4'>
                <Input
                  id='entryInstallmentsCount'
                  type='number'
                  min={2}
                  max={48}
                  placeholder='Parcelas'
                  error={errors.installmentsCount?.message}
                  {...register('installmentsCount')}
                />

                {inProgress && (
                  <Input
                    id='entryCurrentInstallment'
                    type='number'
                    min={1}
                    placeholder='Parcela atual'
                    error={errors.currentInstallment?.message}
                    {...register('currentInstallment')}
                  />
                )}
              </div>

              {inProgress && (
                <div>
                  <span className='text-gray-600 tracking-[-0.5px] text-xs block mb-2'>
                    Fatura em que está a parcela atual
                  </span>
                  <div role='radiogroup' className='grid grid-cols-2 gap-2'>
                    {anchorOptions.map(option => (
                      <button
                        key={option.month}
                        type='button'
                        role='radio'
                        aria-checked={option.month === anchorInvoiceMonth}
                        disabled={!!entry}
                        onClick={() => selectAnchor(option.month)}
                        className={cn(
                          'h-11 rounded-lg border border-gray-500 text-sm text-gray-700 disabled:opacity-60',
                          option.month === anchorInvoiceMonth && 'border-teal-900 bg-teal-50 text-teal-900 font-medium'
                        )}
                      >
                        {formatMonth(option.month)} ({option.label})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <Controller
            control={control}
            name='date'
            render={({ field: { value, onChange } }) => (
              <DatePickerInput
                id='entryDate'
                label={getDateLabel(tab, inProgress)}
                error={errors.date?.message}
                value={value}
                onChange={onChange}
              />
            )}
          />

          <Controller
            control={control}
            name='categoryId'
            render={({ field: { onChange, value } }) => (
              <Select
                id='entryCategoryId'
                placeholder={tab === 'REFUND' ? 'Categoria (opcional)' : 'Categoria'}
                onChange={onChange}
                value={value}
                error={errors.categoryId?.message}
                options={categories}
              />
            )}
          />
        </div>

        <Button id='entrySubmit' type='submit' className='w-full mt-6' isLoading={isLoading}>
          {entry ? 'Salvar' : 'Registrar'}
        </Button>
      </form>
    </Modal>
  )
}

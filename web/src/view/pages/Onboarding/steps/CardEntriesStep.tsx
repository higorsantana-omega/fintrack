import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { CardEntry, CardInvoice, CreditCardDetail, RecurringCharge } from '../../../../app/entities/CreditCard'
import { useCardDetails } from '../../../../app/hooks/useCardDetails'
import { useCards } from '../../../../app/hooks/useCards'
import { cardsService } from '../../../../app/services/cardsService'
import { currencyStringToNumber } from '../../../../app/utils/currencyStringToNumber'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { Button } from '../../../components/Button'
import { CardEntryModal } from '../../../components/CardEntryModal'
import { InputCurrency } from '../../../components/InputCurrency'
import { Spinner } from '../../../components/Spinner'
import { PRE_FINTRACK_CATEGORY_KEY } from '../../../constants/CategoryConstants'
import { EditRecurringChargeModal } from '../../CardDetail/modals/EditRecurringChargeModal'
import { useOnboarding } from '../components/OnboardingContext/useOnboarding'
import { StepItem, StepItems } from '../components/StepItems'
import { getUnpaidInvoices } from '../unpaidInvoices'

type EntryModal =
  | { name: 'new', card: CreditCardDetail }
  | { name: 'editEntry', card: CreditCardDetail, entry: CardEntry }
  | { name: 'editRecurring', card: CreditCardDetail, recurringCharge: RecurringCharge }

/** One entry per installment purchase, from the invoices its installments fall on. */
function getInstallmentPurchases(card: CreditCardDetail) {
  const entries = card.invoices.flatMap(invoice => invoice.entries).filter(entry => entry.installmentsCount > 1)

  return entries.filter((entry, index) => entries.findIndex(other => other.purchaseId === entry.purchaseId) === index)
}

function hasCardItems(card: CreditCardDetail) {
  return card.recurringCharges.length > 0 || card.invoices.some(invoice => invoice.entries.some(entry => (
    entry.installmentsCount > 1 || entry.category?.key === PRE_FINTRACK_CATEGORY_KEY
  )))
}

// The field shows cents as the API's numbers do not: 1240 becomes "1.240,00".
const toFieldValue = (balance: number) => balance.toFixed(2).replace('.', ',')

interface InvoiceFieldProps {
  cardId: string
  invoice: CardInvoice
  label: string
  help: string
  correctionId: string
}

function InvoiceField({ cardId, invoice, label, help, correctionId }: InvoiceFieldProps) {
  const queryClient = useQueryClient()
  const onboarding = useOnboarding()
  const [value, setValue] = useState(toFieldValue(invoice.balance))
  const { mutateAsync, reset, isLoading, isSuccess, isError } = useMutation(cardsService.setOpeningAdjustment)
  const id = `invoice-${invoice.month}-${cardId}`
  const isCorrection = onboarding.correctionId === correctionId

  // A save or a new entry on the invoice changes its balance (no forecast, KTD11).
  useEffect(() => {
    setValue(toFieldValue(invoice.balance))
  }, [invoice.balance])

  useEffect(() => {
    if (isCorrection) document.getElementById(id)?.focus()
  }, [isCorrection, id])

  async function save() {
    const remaining = currencyStringToNumber(value)

    if (value === '' || remaining === invoice.balance) {
      setValue(toFieldValue(invoice.balance))
      return
    }

    try {
      await mutateAsync({ cardId, month: invoice.month, remaining })
    } catch {
      setValue(toFieldValue(invoice.balance))
      return
    }

    await queryClient.invalidateQueries({ queryKey: ['cards'] })
    if (isCorrection) onboarding.goTo('REVIEW')
  }

  return (
    <div className='p-4 rounded-2xl border border-gray-200 flex flex-col gap-2'>
      <div>
        <label htmlFor={id} className='block font-medium text-gray-800 tracking-[-0.5px]'>{label}</label>
        <span className='block text-sm text-gray-600 tracking-[-0.5px]'>{help}</span>
      </div>

      <div
        className='flex items-center gap-2'
        onBlur={save}
        onKeyDown={event => event.key === 'Enter' && (event.target as HTMLElement).blur()}
      >
        <span className='text-gray-600 tracking-[-0.5px] text-lg'>R$</span>
        <div className='flex-1 min-w-0'>
          <InputCurrency id={id} value={value} onChange={newValue => { setValue(newValue); reset() }} />
        </div>

        <span aria-live='polite' className='shrink-0 text-sm tracking-[-0.5px]'>
          {isLoading && <span className='text-gray-600'>Salvando</span>}
          {isSuccess && (
            <span className='flex items-center gap-1 text-teal-900'>
              <Check className='w-4 h-4' />
              Salvo
            </span>
          )}
          {isError && <span className='text-red-800'>Erro ao salvar</span>}
        </span>
      </div>
    </div>
  )
}

export function CardEntriesStep() {
  const { setHasItems, goTo, goNext, isMoving } = useOnboarding()
  const { cards: cardList, isInitialLoading } = useCards()
  const { cards, isInitialLoading: isLoadingDetails } = useCardDetails(cardList.map(({ id }) => id))
  const [modal, setModal] = useState<EntryModal | null>(null)

  const hasItems = cards.some(hasCardItems)

  useEffect(() => {
    setHasItems(hasItems)
  }, [hasItems, setHasItems])

  if (isInitialLoading || isLoadingDetails) {
    return (
      <div className='py-8 flex justify-center'>
        <Spinner className='w-8 h-8' />
      </div>
    )
  }

  // Installments, subscriptions and invoices all belong to a card (R13).
  if (cardList.length === 0) {
    return (
      <div className='p-6 rounded-2xl border border-gray-200 flex flex-col gap-4'>
        <p className='text-gray-800 tracking-[-0.5px]'>
          Nenhum cartão cadastrado. Parcelas, assinaturas e faturas ficam num cartão: cadastre um antes.
        </p>
        <div className='flex flex-wrap gap-2'>
          <Button className='h-10 px-4' onClick={() => goTo('CARDS')} disabled={isMoving}>Voltar a Cartões</Button>
          <Button className='h-10 px-4' ghost onClick={goNext} disabled={isMoving}>Pular</Button>
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-10'>
      {cards.map(card => (
        <section key={card.id} aria-label={card.name} className='flex flex-col gap-4'>
          <StepItems
            title={card.name}
            addLabel='Adicionar'
            emptyMessage='Nenhuma parcela ou assinatura neste cartão.'
            onAdd={() => setModal({ name: 'new', card })}
          >
            {getInstallmentPurchases(card).map(entry => (
              <StepItem
                key={entry.purchaseId}
                name={entry.description}
                detail={`Parcelada em ${entry.installmentsCount}x`}
                value={formatCurrency(entry.value)}
                onClick={() => setModal({ name: 'editEntry', card, entry })}
              />
            ))}
            {card.recurringCharges.map(recurringCharge => (
              <StepItem
                key={recurringCharge.id}
                name={recurringCharge.description}
                detail={`Assinatura · todo dia ${new Date(recurringCharge.firstChargeDate).getUTCDate()}`}
                value={formatCurrency(recurringCharge.value)}
                onClick={() => setModal({ name: 'editRecurring', card, recurringCharge })}
              />
            ))}
          </StepItems>

          {getUnpaidInvoices(card).map(({ invoice, isClosed, label, correctionId }) => (
            <InvoiceField
              key={invoice.month}
              cardId={card.id}
              invoice={invoice}
              label={label}
              help={isClosed
                ? 'Quanto o app do banco diz que falta pagar. Digite 0 se já pagou.'
                : 'Quanto o app do banco diz que falta pagar.'}
              correctionId={correctionId}
            />
          ))}
        </section>
      ))}

      {modal?.name === 'new' && (
        <CardEntryModal
          cards={[modal.card]}
          cardId={modal.card.id}
          allowedTabs={['INSTALLMENTS', 'RECURRING']}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.name === 'editEntry' && (
        <CardEntryModal
          cards={[modal.card]}
          cardId={modal.card.id}
          entry={modal.entry}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.name === 'editRecurring' && (
        <EditRecurringChargeModal
          cardId={modal.card.id}
          recurringCharge={modal.recurringCharge}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

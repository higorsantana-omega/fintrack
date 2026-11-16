import { useEffect, useState } from 'react'
import { CardEntry, CreditCardDetail, RecurringCharge } from '../../../../app/entities/CreditCard'
import { useCardDetails } from '../../../../app/hooks/useCardDetails'
import { useCards } from '../../../../app/hooks/useCards'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { CardEntryModal } from '../../../components/CardEntryModal'
import { PRE_FINTRACK_CATEGORY_KEY } from '../../../constants/CategoryConstants'
import { EditRecurringChargeModal } from '../../CardDetail/modals/EditRecurringChargeModal'
import { InvoiceField } from '../components/InvoiceField'
import { MissingPrerequisite } from '../components/MissingPrerequisite'
import { useOnboarding } from '../components/OnboardingContext/useOnboarding'
import { StepItem, StepItems, StepLoader } from '../components/StepItems'
import { getUnpaidInvoices } from '../unpaidInvoices'

type EntryModal =
  | { name: 'new', card: CreditCardDetail }
  | { name: 'editEntry', card: CreditCardDetail, entry: CardEntry }
  | { name: 'editRecurring', card: CreditCardDetail, recurringCharge: RecurringCharge }

function getInstallmentPurchases(card: CreditCardDetail) {
  const entries = card.invoices.flatMap(invoice => invoice.entries).filter(entry => entry.installmentsCount > 1)
  const seen = new Set<string | null>()

  return entries.filter(entry => {
    if (seen.has(entry.purchaseId)) return false
    seen.add(entry.purchaseId)
    return true
  })
}

function hasCardItems(card: CreditCardDetail) {
  return card.recurringCharges.length > 0 || card.invoices.some(invoice => invoice.entries.some(entry => (
    entry.installmentsCount > 1 || entry.category?.key === PRE_FINTRACK_CATEGORY_KEY
  )))
}

export function CardEntriesStep() {
  const { setHasItems } = useOnboarding()
  const { cards: cardList, isInitialLoading } = useCards()
  const { cards, isInitialLoading: isLoadingDetails } = useCardDetails(cardList.map(({ id }) => id))
  const [modal, setModal] = useState<EntryModal | null>(null)

  const hasItems = cards.some(hasCardItems)

  useEffect(() => {
    setHasItems(hasItems)
  }, [hasItems, setHasItems])

  if (isInitialLoading || isLoadingDetails) return <StepLoader />

  if (cardList.length === 0) {
    return (
      <MissingPrerequisite
        message='Nenhum cartão cadastrado. Parcelas, assinaturas e faturas ficam num cartão: cadastre um antes.'
        backLabel='Voltar a Cartões'
        backStep='CARDS'
      />
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

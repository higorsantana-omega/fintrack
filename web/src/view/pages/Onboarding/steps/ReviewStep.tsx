import { ReactNode } from 'react'
import { useBankAccounts } from '../../../../app/hooks/useBankAccounts'
import { useCardDetails } from '../../../../app/hooks/useCardDetails'
import { useCards } from '../../../../app/hooks/useCards'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { useOnboarding } from '../components/OnboardingContext/useOnboarding'
import { StepEmpty, StepItemList, StepLoader } from '../components/StepItems'
import { getUnpaidInvoices } from '../unpaidInvoices'

interface ReviewRowProps {
  name: string
  detail: string
  value: number
  color: string
  disabled: boolean
  onCorrect(): void
}

function ReviewRow({ name, detail, value, color, disabled, onCorrect }: ReviewRowProps) {
  return (
    <li className='min-h-[56px] px-4 py-2 flex items-center gap-3'>
      <span className='w-2.5 h-2.5 shrink-0 rounded-full' style={{ backgroundColor: color }} />

      <span className='flex-1 min-w-0'>
        <span className='block truncate font-medium text-gray-800 tracking-[-0.5px]'>{name}</span>
        <span className='block truncate text-sm text-gray-600 tracking-[-0.5px]'>{detail}</span>
      </span>

      <span className='whitespace-nowrap font-medium text-gray-800 tabular-nums'>{formatCurrency(value)}</span>
      <button
        type='button'
        disabled={disabled}
        onClick={onCorrect}
        className='h-8 px-3 rounded-lg text-sm font-medium tracking-[-0.5px] text-teal-900 hover:bg-teal-50 disabled:text-gray-400 transition-colors'
      >
        Corrigir
      </button>
    </li>
  )
}

function ReviewSection({ title, emptyMessage, children }: { title: string, emptyMessage: string, children: ReactNode[] }) {
  return (
    <section className='flex flex-col gap-3'>
      <h2 className='font-medium text-gray-800 tracking-[-0.5px]'>{title}</h2>

      {children.length === 0 ? <StepEmpty>{emptyMessage}</StepEmpty> : <StepItemList>{children}</StepItemList>}
    </section>
  )
}

export function ReviewStep() {
  const { correct, isMoving } = useOnboarding()
  const { accounts, isFetching } = useBankAccounts()
  const { cards: cardList, isInitialLoading } = useCards()
  const { cards, isInitialLoading: isLoadingDetails } = useCardDetails(cardList.map(({ id }) => id))

  if ((accounts.length === 0 && isFetching) || isInitialLoading || isLoadingDetails) return <StepLoader />

  const total = accounts.reduce((sum, account) => sum + account.currentBalance, 0)

  return (
    <div className='flex flex-col gap-8'>
      <ReviewSection title='Contas' emptyMessage='Nenhuma conta cadastrada.'>
        {accounts.map(account => (
          <ReviewRow
            key={account.id}
            name={account.name}
            detail='Saldo atual'
            value={account.currentBalance}
            color={account.color}
            disabled={isMoving}
            onCorrect={() => correct('ACCOUNTS', account.id)}
          />
        ))}
      </ReviewSection>

      {accounts.length > 0 && (
        <div className='px-4 flex items-center justify-between gap-4'>
          <span className='font-medium text-gray-800 tracking-[-0.5px]'>Saldo total</span>
          <strong id='review-total' className='text-2xl tracking-[-1px] text-gray-900 tabular-nums'>
            {formatCurrency(total)}
          </strong>
        </div>
      )}

      <ReviewSection title='Faturas não pagas' emptyMessage='Nenhum cartão cadastrado.'>
        {cards.flatMap(card => getUnpaidInvoices(card).map(({ invoice, label, correctionId }) => (
          <ReviewRow
            key={correctionId}
            name={card.name}
            detail={label}
            value={invoice.balance}
            color={card.color}
            disabled={isMoving}
            onCorrect={() => correct('CARD_ENTRIES', correctionId)}
          />
        )))}
      </ReviewSection>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { CreditCard } from '../../../../app/entities/CreditCard'
import { useCards } from '../../../../app/hooks/useCards'
import { formatCurrency } from '../../../../app/utils/formatCurrency'
import { EditCardModal } from '../../CardDetail/modals/EditCardModal'
import { NewCardModal } from '../../Cards/modals/NewCardModal'
import { useOnboarding } from '../components/OnboardingContext/useOnboarding'
import { StepItem, StepItems } from '../components/StepItems'

export function CardsStep() {
  const { setHasItems } = useOnboarding()
  const { cards, isInitialLoading } = useCards()
  const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false)
  const [cardBeingEdited, setCardBeingEdited] = useState<CreditCard | null>(null)

  useEffect(() => {
    setHasItems(cards.length > 0)
  }, [cards.length, setHasItems])

  return (
    <>
      <StepItems
        addLabel='Adicionar cartão'
        emptyMessage='Nenhum cartão cadastrado.'
        isLoading={isInitialLoading}
        onAdd={() => setIsNewCardModalOpen(true)}
      >
        {cards.map(card => (
          <StepItem
            key={card.id}
            name={card.name}
            detail={`Limite · fecha dia ${card.closingDay} e vence dia ${card.dueDay}`}
            value={formatCurrency(card.limit.total)}
            color={card.color}
            onClick={() => setCardBeingEdited(card)}
          />
        ))}
      </StepItems>

      {isNewCardModalOpen && <NewCardModal open onClose={() => setIsNewCardModalOpen(false)} />}
      {cardBeingEdited && <EditCardModal card={cardBeingEdited} onClose={() => setCardBeingEdited(null)} />}
    </>
  )
}

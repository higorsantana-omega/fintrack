import { useState } from 'react'
import { useCards } from '../../../app/hooks/useCards'
import { useCardsSummary } from '../../../app/hooks/useCardsSummary'

type CardsModal = 'newCard' | 'newEntry'

export function useCardsController() {
  const { cards, isInitialLoading: isLoadingCards } = useCards()
  const { summary, isInitialLoading: isLoadingSummary } = useCardsSummary()
  const [openModal, setOpenModal] = useState<CardsModal | null>(null)

  return {
    summary,
    isLoadingSummary,
    isLoadingCards,
    activeCards: cards.filter(card => !card.archivedAt),
    archivedCards: cards.filter(card => card.archivedAt),
    openModal,
    openNewCardModal: () => setOpenModal('newCard'),
    openNewEntryModal: () => setOpenModal('newEntry'),
    closeModal: () => setOpenModal(null)
  }
}

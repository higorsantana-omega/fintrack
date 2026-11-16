import { useEffect, useState } from 'react'
import { WishlistItem } from '../../../../app/entities/Wishlist'
import { useWishlistItems } from '../../../../app/hooks/useWishlistItems'
import { useWishlistLists } from '../../../../app/hooks/useWishlistLists'
import { ItemModal } from '../../Wishlist/modals/ItemModal'
import { formatPlanned } from '../../Wishlist/wishlistItems'
import { useOnboarding } from '../components/OnboardingContext/useOnboarding'
import { StepItem, StepItems } from '../components/StepItems'

export function WishlistStep() {
  const { setHasItems } = useOnboarding()
  const { items, isInitialLoading } = useWishlistItems()
  const { lists } = useWishlistLists()
  const [modal, setModal] = useState<{ item?: WishlistItem } | null>(null)

  useEffect(() => {
    setHasItems(items.length > 0)
  }, [items.length, setHasItems])

  return (
    <>
      <StepItems
        addLabel='Adicionar item'
        emptyMessage='Nenhum item na wishlist.'
        isLoading={isInitialLoading}
        onAdd={() => setModal({})}
      >
        {items.map(item => (
          <StepItem
            key={item.id}
            name={item.name}
            detail={`Planejado: ${formatPlanned(item)}`}
            onClick={() => setModal({ item })}
          />
        ))}
      </StepItems>

      {/* The form picks its default list when it mounts, so it waits for the lists. */}
      {modal && lists.length > 0 && (
        <ItemModal
          open
          lists={lists}
          item={modal.item}
          onClose={() => setModal(null)}
        />
      )}
    </>
  )
}

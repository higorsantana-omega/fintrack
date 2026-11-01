import { ExternalLinkIcon } from '@radix-ui/react-icons'
import { getCategoryName } from '../../../app/utils/categories'
import { formatCurrency } from '../../../app/utils/formatCurrency'
import { getPostponeSuggestion } from '../../../app/utils/wishlistForm'
import { formatDateOf, formatPlanned } from '../../pages/Wishlist/wishlistItems'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { PostponeForm } from './PostponeForm'
import { useWishlistRemindersController } from './useWishlistRemindersController'

interface WishlistRemindersProps {
  /** Holds the purchase reminders while the invoice, debt and goal reminders run (KTD7). */
  isHeld?: boolean
}

export function WishlistReminders({ isHeld = false }: WishlistRemindersProps) {
  const {
    currentReminder,
    isPostponing,
    pendingAnswer,
    handleBuy,
    handleGiveUp,
    handleKeep,
    handlePostpone,
    handleOpenPostpone,
    handleBack,
    handleLater
  } = useWishlistRemindersController()

  if (isHeld || !currentReminder) return null

  const isAnswering = pendingAnswer !== null

  return (
    <Modal
      key={currentReminder.id}
      title='Lembrete de compra'
      open
      onClose={handleLater}
    >
      <div className='space-y-1'>
        <span className='text-gray-600 tracking-[-0.5px] text-sm block'>Item</span>
        <strong id='wishlist-reminder-name' className='text-gray-800 tracking-[-0.5px] text-lg block break-words'>
          {currentReminder.name}
        </strong>
        <div className='flex flex-wrap gap-x-4 text-sm text-gray-700 tracking-[-0.5px]'>
          <span>
            Lista: <strong id='wishlist-reminder-list'>{currentReminder.wishlistName}</strong>
          </span>
          {currentReminder.category && (
            <span>
              Categoria: <strong id='wishlist-reminder-category'>{getCategoryName(currentReminder.category)}</strong>
            </span>
          )}
          <span>
            Data planejada: <strong id='wishlist-reminder-planned'>{formatPlanned(currentReminder)}</strong>
          </span>
        </div>
      </div>

      {currentReminder.lowestPrice && (
        <div>
          <span className='text-gray-600 tracking-[-0.5px] text-xs block'>Menor preço</span>
          <strong id='wishlist-reminder-price' className='text-gray-800 text-[32px] tracking-[-1px]'>
            {formatCurrency(currentReminder.lowestPrice.value)}
          </strong>
          <span id='wishlist-reminder-price-store' className='text-sm text-gray-600 block'>
            {currentReminder.lowestPrice.storeName} · {formatDateOf(currentReminder.lowestPrice.recordedOn)}
          </span>
        </div>
      )}

      {currentReminder.links.length > 0 && (
        <div className='flex flex-col gap-1'>
          {currentReminder.links.map(link => (
            <a
              key={link.id}
              href={link.url}
              target='_blank'
              rel='noopener noreferrer'
              className='wishlist-reminder-link inline-flex items-center gap-1 font-medium tracking-[-0.5px] text-teal-900 hover:underline'
            >
              {link.storeName}
              <ExternalLinkIcon className='w-4 h-4' />
            </a>
          ))}
        </div>
      )}

      {isPostponing ? (
        <PostponeForm
          suggestion={getPostponeSuggestion(currentReminder.plannedMonth, new Date())}
          isLoading={pendingAnswer === 'POSTPONE'}
          onSubmit={handlePostpone}
          onBack={handleBack}
        />
      ) : (
        <div className='space-y-4'>
          <Button id='wishlist-reminder-bought' className='w-full' disabled={isAnswering} onClick={handleBuy}>
            Comprei
          </Button>
          <Button
            id='wishlist-reminder-postpone'
            className='w-full'
            ghost
            disabled={isAnswering}
            onClick={handleOpenPostpone}
          >
            Adiar
          </Button>
          {currentReminder.plannedMonth === null && (
            <Button
              id='wishlist-reminder-keep'
              className='w-full'
              ghost
              isLoading={pendingAnswer === 'KEEP'}
              disabled={isAnswering}
              onClick={handleKeep}
            >
              Ainda quero
            </Button>
          )}
          <Button
            id='wishlist-reminder-give-up'
            className='w-full'
            ghost
            isLoading={pendingAnswer === 'GIVE_UP'}
            disabled={isAnswering}
            onClick={handleGiveUp}
          >
            Desisti
          </Button>
          <Button
            id='wishlist-reminder-later'
            className='w-full'
            ghost
            disabled={isAnswering}
            onClick={handleLater}
          >
            Depois
          </Button>
        </div>
      )}
    </Modal>
  )
}

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { WishlistReminder } from '../../../app/entities/Wishlist'
import { useWishlistReminders } from '../../../app/hooks/useWishlistReminders'
import { wishlistService } from '../../../app/services/wishlistService'
import { getApiErrorPayload } from '../../../app/utils/getApiErrorPayload'
import { usePurchaseLaunch } from '../PurchaseLaunch/usePurchaseLaunch'
import { PostponeFormData } from './PostponeForm'

type Answer = 'GIVE_UP' | 'KEEP' | 'POSTPONE'

const SUCCESS_MESSAGES: Record<Answer, string> = {
  GIVE_UP: 'Item movido para Desistidos.',
  KEEP: 'Combinado! Pergunto de novo em 30 dias.',
  POSTPONE: 'Item adiado!'
}

export function useWishlistRemindersController() {
  const queryClient = useQueryClient()
  const { reminders, isFetched } = useWishlistReminders()
  const { openPurchaseLaunch } = usePurchaseLaunch()
  const [queue, setQueue] = useState<WishlistReminder[] | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isBuying, setIsBuying] = useState(false)
  const [isPostponing, setIsPostponing] = useState(false)
  const [pendingAnswer, setPendingAnswer] = useState<Answer | null>(null)

  // The queue is a snapshot of the first answer, taken when the private
  // layout mounts. A failed fetch gives an empty snapshot, ending the queue.
  if (queue === null && isFetched) setQueue(reminders)

  const currentReminder = isDismissed ? undefined : queue?.[0]

  function moveToNext() {
    setQueue(previous => previous?.slice(1) ?? [])
    setIsPostponing(false)
  }

  async function answer(answerKind: Answer, request: (reminder: WishlistReminder) => Promise<unknown>) {
    if (!currentReminder) return

    setPendingAnswer(answerKind)

    try {
      await request(currentReminder)
      toast.success(SUCCESS_MESSAGES[answerKind])
    } catch (error) {
      // 409: the item was already resolved elsewhere, so move on silently.
      if (getApiErrorPayload(error).status !== 409) {
        toast.error('Não foi possível registrar a resposta. Tente novamente.')
        setPendingAnswer(null)
        return
      }
    }

    queryClient.invalidateQueries({ queryKey: ['wishlist'] })
    moveToNext()
    setPendingAnswer(null)
  }

  function handleBuy() {
    if (!currentReminder) return

    // The window is hidden while the launch is open (KTD7): saving moves to
    // the next item, cancelling brings the same one back.
    setIsBuying(true)
    openPurchaseLaunch(currentReminder, {
      onSaved: () => {
        moveToNext()
        setIsBuying(false)
      },
      onCancel: () => setIsBuying(false)
    })
  }

  const handleGiveUp = () => answer('GIVE_UP', ({ id }) => wishlistService.giveUp(id))

  const handleKeep = () => answer('KEEP', ({ id }) => wishlistService.keep(id))

  const handlePostpone = (data: PostponeFormData) => answer('POSTPONE', ({ id }) => wishlistService.postpone({
    itemId: id,
    ...data
  }))

  return {
    currentReminder: isBuying ? undefined : currentReminder,
    isPostponing,
    pendingAnswer,
    handleBuy,
    handleGiveUp,
    handleKeep,
    handlePostpone,
    handleOpenPostpone: () => setIsPostponing(true),
    handleBack: () => setIsPostponing(false),
    handleLater: () => setIsDismissed(true)
  }
}

import { Button } from '../Button'
import { Modal } from '../Modal'
import { Spinner } from '../Spinner'

export type PurchaseKind = 'ACCOUNT' | 'CARD'

interface PurchaseKindModalProps {
  itemName: string
  isLoading: boolean
  hasAccount: boolean
  hasCard: boolean
  onSelect(kind: PurchaseKind): void
  onClose(): void
}

export function PurchaseKindModal({ itemName, isLoading, hasAccount, hasCard, onSelect, onClose }: PurchaseKindModalProps) {
  return (
    <Modal title='Comprei' open onClose={onClose}>
      <strong id='purchase-kind-item' className='text-gray-800 tracking-[-0.5px] text-lg block'>
        {itemName}
      </strong>

      {isLoading && (
        <div className='flex justify-center'>
          <Spinner className='w-8 h-8' />
        </div>
      )}

      {!isLoading && !hasAccount && !hasCard && (
        <>
          <p id='purchase-kind-empty' className='text-gray-800 tracking-[-0.5px]'>
            Para lançar o gasto, cadastre uma conta ou um cartão antes.
          </p>
          <Button id='purchase-kind-close' className='w-full' onClick={onClose}>Fechar</Button>
        </>
      )}

      {!isLoading && (hasAccount || hasCard) && (
        <div className='space-y-4'>
          <p className='text-gray-800 tracking-[-0.5px]'>Onde você pagou?</p>

          <div className='flex flex-col gap-2'>
            {hasAccount && (
              <Button id='purchase-kind-account' onClick={() => onSelect('ACCOUNT')}>Conta</Button>
            )}
            {hasCard && (
              <Button id='purchase-kind-card' onClick={() => onSelect('CARD')}>Cartão</Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

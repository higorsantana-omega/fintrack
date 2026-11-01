import { Controller } from 'react-hook-form'
import { WishlistLink } from '../../../../../app/entities/Wishlist'
import { Button } from '../../../../components/Button'
import { InputCurrency } from '../../../../components/InputCurrency'
import { Modal } from '../../../../components/Modal'
import { usePriceModalController } from './usePriceModalController'

interface PriceModalProps {
  open: boolean
  link: WishlistLink
  onClose(): void
}

export function PriceModal({ open, link, onClose }: PriceModalProps) {
  const { errors, control, handleSubmit, isLoading } = usePriceModalController(link.id, onClose)

  return (
    <Modal title='Registrar preço' open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div>
          <span className='text-gray-600 tracking-[-0.5px] text-xs'>Preço em {link.storeName}</span>
          <div className='flex items-center gap-1'>
            <span className='text-gray-600 tracking-[-0.5px]'>R$</span>
            <Controller
              name='value'
              control={control}
              render={({ field: { onChange, value } }) => (
                <InputCurrency id='wishlistPriceValue' error={errors.value?.message} onChange={onChange} value={value} />
              )}
            />
          </div>
        </div>

        <Button id='wishlistPriceSubmit' type='submit' className='w-full mt-6' isLoading={isLoading}>
          Registrar
        </Button>
      </form>
    </Modal>
  )
}

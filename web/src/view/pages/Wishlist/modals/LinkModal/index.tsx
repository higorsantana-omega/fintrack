import { WishlistLink } from '../../../../../app/entities/Wishlist'
import { Button } from '../../../../components/Button'
import { Input } from '../../../../components/Input'
import { Modal } from '../../../../components/Modal'
import { useLinkModalController } from './useLinkModalController'

interface LinkModalProps {
  open: boolean
  itemId: string
  /** Edits this link; without it, a new one is added. */
  link?: WishlistLink
  onClose(): void
}

export function LinkModal({ open, itemId, link, onClose }: LinkModalProps) {
  const { register, urlField, errors, handleSubmit, isLoading } = useLinkModalController(itemId, link, onClose)

  return (
    <Modal title={link ? 'Editar link' : 'Novo link'} open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className='flex flex-col gap-4'>
          <Input
            id='wishlistLinkUrl'
            type='text'
            placeholder='Endereço da página do produto'
            error={errors.url?.message}
            {...urlField}
          />

          <Input
            id='wishlistLinkStoreName'
            type='text'
            placeholder='Loja'
            error={errors.storeName?.message}
            {...register('storeName')}
          />
        </div>

        <Button id='wishlistLinkSubmit' type='submit' className='w-full mt-6' isLoading={isLoading}>
          Salvar
        </Button>
      </form>
    </Modal>
  )
}

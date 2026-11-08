import { WishlistList } from '../../../../../app/entities/Wishlist'
import { Button } from '../../../../components/Button'
import { Input } from '../../../../components/Input'
import { Modal } from '../../../../components/Modal'
import { useListModalController } from './useListModalController'

interface ListModalProps {
  open: boolean
  /** Renames this list; without it, a new one is created. */
  list?: WishlistList
  onClose(): void
  onSaved?(list: WishlistList): void
}

export function ListModal({ open, list, onClose, onSaved }: ListModalProps) {
  const { register, errors, handleSubmit, isLoading } = useListModalController(list, onClose, onSaved)

  return (
    <Modal title={list ? 'Renomear lista' : 'Nova lista'} open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <Input
          id='wishlistListName'
          type='text'
          placeholder='Nome da lista'
          error={errors.name?.message}
          {...register('name')}
        />

        <Button id='wishlistListSubmit' type='submit' className='w-full mt-6' isLoading={isLoading}>
          {list ? 'Salvar' : 'Criar lista'}
        </Button>
      </form>
    </Modal>
  )
}

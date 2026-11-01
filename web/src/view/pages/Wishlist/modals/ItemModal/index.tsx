import { Controller } from 'react-hook-form'
import { WishlistItem, WishlistList } from '../../../../../app/entities/Wishlist'
import { Button } from '../../../../components/Button'
import { Input } from '../../../../components/Input'
import { Modal } from '../../../../components/Modal'
import { Select } from '../../../../components/Select'
import { NO_CATEGORY, useItemModalController } from './useItemModalController'

interface ItemModalProps {
  open: boolean
  lists: WishlistList[]
  /** Edits this item; without it, a new one is created. */
  item?: WishlistItem
  /** The list a new item starts in. */
  defaultListId?: string
  onClose(): void
  onSaved?(item: WishlistItem): void
}

export function ItemModal({ open, lists, item, defaultListId, onClose, onSaved }: ItemModalProps) {
  const {
    register,
    control,
    errors,
    handleSubmit,
    isLoading,
    hasMonth,
    categoryOptions,
    listOptions
  } = useItemModalController(lists, item, defaultListId, onClose, onSaved)

  return (
    <Modal title={item ? 'Editar item' : 'Novo item'} open={open} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className='flex flex-col gap-4'>
          <Input
            id='wishlistItemName'
            type='text'
            placeholder='Nome do item'
            error={errors.name?.message}
            {...register('name')}
          />

          <Controller
            control={control}
            name='wishlistId'
            render={({ field: { onChange, value } }) => (
              <Select
                id='wishlistItemListId'
                placeholder='Lista'
                onChange={onChange}
                value={value}
                error={errors.wishlistId?.message}
                options={listOptions}
              />
            )}
          />

          <Controller
            control={control}
            name='categoryId'
            render={({ field: { onChange, value } }) => (
              <Select
                id='wishlistItemCategoryId'
                placeholder='Categoria (opcional)'
                onChange={categoryId => onChange(categoryId === NO_CATEGORY ? '' : categoryId)}
                value={value || NO_CATEGORY}
                error={errors.categoryId?.message}
                options={categoryOptions}
              />
            )}
          />

          <div className='grid grid-cols-[minmax(0,1fr)_7rem] gap-4'>
            <Input
              id='wishlistItemPlannedMonth'
              type='month'
              placeholder='Mês planejado (opcional)'
              error={errors.plannedMonth?.message}
              {...register('plannedMonth')}
            />

            <Controller
              control={control}
              name='plannedDay'
              render={({ field: { onChange, value } }) => (
                <Input
                  id='wishlistItemPlannedDay'
                  name='plannedDay'
                  type='number'
                  min={1}
                  max={31}
                  placeholder='Dia'
                  disabled={!hasMonth}
                  error={errors.plannedDay?.message}
                  value={value}
                  onChange={onChange}
                />
              )}
            />
          </div>
        </div>

        <Button id='wishlistItemSubmit' type='submit' className='w-full mt-6' isLoading={isLoading}>
          {item ? 'Salvar' : 'Criar item'}
        </Button>
      </form>
    </Modal>
  )
}

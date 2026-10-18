import { Controller } from 'react-hook-form'
import { Category } from '../../../../../app/services/categoriesService'
import { Button } from '../../../../components/Button'
import { ColorsDropdownInput } from '../../../../components/ColorsDropdownInput'
import { IconsDropdownInput } from '../../../../components/IconsDropdownInput'
import { Input } from '../../../../components/Input'
import { Modal } from '../../../../components/Modal'
import { CategoryFormTarget, useCategoryFormModalController } from './useCategoryFormModalController'

interface CategoryFormModalProps {
  target: CategoryFormTarget
  categories: Category[]
  onClose(): void
}

export function CategoryFormModal({ target, categories, onClose }: CategoryFormModalProps) {
  const { title, isGroup, color, register, control, errors, handleSubmit, isLoading } =
    useCategoryFormModalController(target, categories, onClose)

  return (
    <Modal title={title} open onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className='flex flex-col gap-4'>
          <Input
            id='categoryName'
            type='text'
            placeholder='Nome'
            error={errors.name?.message}
            {...register('name')}
          />

          {isGroup && (
            <>
              <Controller
                control={control}
                name='color'
                render={({ field: { onChange, value } }) => (
                  <ColorsDropdownInput error={errors.color?.message} onChange={onChange} value={value} />
                )}
              />

              <Controller
                control={control}
                name='icon'
                render={({ field: { onChange, value } }) => (
                  <IconsDropdownInput error={errors.icon?.message} onChange={onChange} value={value} color={color} />
                )}
              />
            </>
          )}

          {target.kind === 'createSubcategory' && (
            <p className='text-sm text-gray-700 tracking-[-0.5px]'>
              A subcategoria usa o ícone e a cor do grupo.
            </p>
          )}
        </div>

        <Button id='categorySubmit' type='submit' className='w-full mt-6' isLoading={isLoading}>
          Salvar
        </Button>
      </form>
    </Modal>
  )
}

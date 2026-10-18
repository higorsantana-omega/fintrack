import { Category } from '../../../../../app/services/categoriesService'
import { getCategoryName } from '../../../../../app/utils/categories'
import { ConfirmDeleteModal } from '../../../../components/ConfirmDeleteModal'
import { Select } from '../../../../components/Select'
import { useDeleteCategoryModalController } from './useDeleteCategoryModalController'

interface DeleteCategoryModalProps {
  category: Category
  categories: Category[]
  onClose(): void
}

export function DeleteCategoryModal({ category, categories, onClose }: DeleteCategoryModalProps) {
  const {
    isGroup,
    parent,
    destinationOptions,
    destinationId,
    selectDestination,
    hasMissingDestination,
    isLoading,
    handleConfirm
  } = useDeleteCategoryModalController(category, categories, onClose)

  return (
    <ConfirmDeleteModal
      title={`Tem certeza que deseja excluir "${getCategoryName(category)}"?`}
      onClose={onClose}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      description={isGroup
        ? (
          <div className='text-left space-y-3'>
            <p className='text-sm text-center'>
              Os itens do grupo e de suas subcategorias vão para a categoria que você escolher. As subcategorias serão excluídas.
            </p>
            <Select
              id='categoryDestination'
              placeholder='Mover os itens para'
              options={destinationOptions}
              value={destinationId}
              onChange={selectDestination}
              error={hasMissingDestination ? 'Escolha o destino dos itens' : undefined}
            />
          </div>
          )
        : (
          <p className='text-sm'>
            Os itens desta subcategoria vão para {parent ? `"${getCategoryName(parent)}"` : 'o grupo dela'}.
          </p>
          )}
    />
  )
}

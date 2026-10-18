import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Category, categoriesService } from '../../../../../app/services/categoriesService'
import { getCategoryOptions } from '../../../../../app/utils/categories'
import { getApiErrorPayload } from '../../../../../app/utils/getApiErrorPayload'
import { invalidateMoneyQueries } from '../../../../../app/utils/invalidateMoneyQueries'

export function useDeleteCategoryModalController(category: Category, categories: Category[], onClose: () => void) {
  const isGroup = category.parentId === null
  const [destinationId, setDestinationId] = useState('')
  const [hasMissingDestination, setHasMissingDestination] = useState(false)

  // Same type, never the deleted group or its subcategories, never a system category (R15).
  const destinationOptions = useMemo(() => {
    const doomed = [category.id, ...categories.filter(({ parentId }) => parentId === category.id).map(({ id }) => id)]

    return getCategoryOptions(categories, category.type).filter(option => !doomed.includes(option.value))
  }, [category, categories])

  const parent = categories.find(({ id }) => id === category.parentId)

  const queryClient = useQueryClient()
  const { isLoading, mutateAsync } = useMutation(categoriesService.remove)

  async function handleConfirm() {
    if (isGroup && !destinationId) {
      setHasMissingDestination(true)
      return
    }

    try {
      await mutateAsync({ id: category.id, destinationCategoryId: isGroup ? destinationId : undefined })

      // The items moved, so the lists and totals that show them change too.
      await invalidateMoneyQueries(queryClient)
      toast.success('Categoria excluída!')
      onClose()
    } catch (error) {
      toast.error(getApiErrorPayload(error).status === 409
        ? 'Esta categoria não pode ser excluída.'
        : 'Erro ao excluir a categoria!')
    }
  }

  return {
    isGroup,
    parent,
    destinationOptions,
    destinationId,
    selectDestination: (value: string) => {
      setDestinationId(value)
      setHasMissingDestination(false)
    },
    hasMissingDestination,
    isLoading,
    handleConfirm
  }
}
